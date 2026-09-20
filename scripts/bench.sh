#!/usr/bin/env bash
set -euo pipefail

# Fixed locale: timings math and markdown output require '.' decimals
# regardless of the machine the script runs from.
export LC_ALL=C

# Server-only llama.cpp benchmark runner.
# Benchmarks whatever model is currently loaded on a remote llama-server
# via POST /completion timings. Outputs markdown tables matching
# BENCHMARKS.md format (H3 title, table columns, test order).

# Configuration
SERVER="${LLAMA_SERVER_URL:-http://192.168.88.33:8080}"
RUNS="${RUNS:-1}"
PROGRESS="${PROGRESS:-1}"  # 1 = show progress, 0 = silent

# Labels for the results header (resolved in main if empty)
MODEL_LABEL=""
GPU_LABEL="remote"

# Benchmark test configurations matching BENCHMARKS.md exactly
# Format: "test_name|pp|tg"
BENCHMARKS=(
    "pp1024+tg16|1024|16"
    "pp4096+tg256|4096|256"
    "pp2048+tg256|2048|256"
    "pp2048+tg768|2048|768"
    "pp1024+tg1024|1024|1024"
    "pp1280+tg3072|1280|3072"
    "pp384+tg1152|384|1152"
    "pp64+tg1024|64|1024"
    "pp16+tg1536|16|1536"
)

usage() {
    cat <<EOF
Usage: $0 [options]

Benchmarks the model currently loaded on a remote llama-server.
The server must already be running with the desired model, e.g.:

  llama-server -m /path/to/model.gguf -c 8192 --port 8080

Options:
  -s, --server URL     llama-server base URL (default: \$LLAMA_SERVER_URL or http://192.168.88.33:8080)
      --model-label L  Model label for the results header (default: basename of /props model_path)
      --gpu-label L    GPU label for the results header (default: remote)
  -r, --runs N         Number of runs per benchmark (default: 1)
  -p, --progress 0|1   Show progress indicators (default: 1)
      --test NAME      Run only the given test (repeatable, e.g. --test pp16+tg16).
                       Useful for smoke tests; default is all 9 tests in BENCHMARKS.md order.
  -o, --output FILE    Save output to FILE and print to stdout (appends)
  -h, --help           Show this help

Examples:
  $0 --server http://192.168.88.33:8080 -o BENCHMARKS.md
  $0 --server http://192.168.88.33:8080 --gpu-label "Tesla P40" --model-label "Bonsai 8B"
  $0 --test pp16+tg16 -o /tmp/smoke.md
EOF
    exit 0
}

# Base server URL without trailing slash
server_url() {
    echo "${SERVER%/}"
}

# host:port portion of the server URL, used in headers
hostport() {
    local s
    s=$(server_url)
    s=${s#http://}
    s=${s#https://}
    echo "$s"
}

api_get() {
    curl -sS --fail --connect-timeout 10 --max-time 60 "$(server_url)$1"
}

# Abort if the server is not reachable
preflight() {
    api_get "/health" >/dev/null || {
        echo "ERROR: llama-server not reachable at $(server_url)/health" >&2
        exit 1
    }
}

# Model path reported by the server (e.g. /models/Bonsai-8B-Q1_0.gguf)
server_model_path() {
    api_get "/props" | jq -r '.model_path // empty'
}

default_model_label() {
    local path label
    path=$(server_model_path || true)
    label=$(basename "${path:-unknown}")
    label=${label%.gguf}
    [[ -z "$label" ]] && label="unknown"
    echo "$label"
}

# POST /completion with an exact pp-token prompt and n_predict=tg.
# The prompt is a token-id array so prompt length is exact regardless
# of the model's tokenizer. ignore_eos forces full-length generation
# even if the model would stop early on the synthetic prompt.
# Raw control bytes occasionally emitted in generated content are
# stripped so the response always parses as JSON.
# Returns the sanitized JSON response.
run_completion() {
    local pp="$1"
    local tg="$2"
    local body
    body=$(jq -n --argjson pp "$pp" --argjson tg "$tg" \
        '{prompt: ([range($pp) | 1]), n_predict: $tg, temperature: 0, cache_prompt: false, stream: false, ignore_eos: true}')
    curl -sS --fail --connect-timeout 10 --max-time 3600 \
        -H 'Content-Type: application/json' \
        -d "$body" "$(server_url)/completion" \
        | tr -d '\000-\010\013\014\016-\037'
}

# Parse /completion response timings into:
#   avg_time_seconds|total_tokens|pp_tps|tg_tps|ttft_seconds
parse_timings() {
    local json_output="$1"

    local prompt_ms predicted_ms prompt_n predicted_n pp_tps tg_tps
    prompt_ms=$(echo "$json_output" | jq -r '.timings.prompt_ms')
    predicted_ms=$(echo "$json_output" | jq -r '.timings.predicted_ms')
    prompt_n=$(echo "$json_output" | jq -r '.timings.prompt_n')
    predicted_n=$(echo "$json_output" | jq -r '.timings.predicted_n')
    pp_tps=$(echo "$json_output" | jq -r '.timings.prompt_per_second')
    tg_tps=$(echo "$json_output" | jq -r '.timings.predicted_per_second')

    # Validate we got real numbers
    if [[ -z "$prompt_ms" || "$prompt_ms" == "null" || "$prompt_ms" == "0" ]]; then
        return 1
    fi
    if [[ -z "$predicted_ms" || "$predicted_ms" == "null" ]]; then
        return 1
    fi
    if [[ -z "$prompt_n" || "$prompt_n" == "null" || "$prompt_n" == "0" ]]; then
        return 1
    fi
    if [[ -z "$predicted_n" || "$predicted_n" == "null" || "$predicted_n" == "0" ]]; then
        return 1
    fi

    local avg_time total_tokens ttft
    avg_time=$(awk -v a="$prompt_ms" -v b="$predicted_ms" 'BEGIN { printf "%.6f", (a + b) / 1000 }')
    total_tokens=$((prompt_n + predicted_n))
    ttft=$(awk -v a="$prompt_ms" 'BEGIN { printf "%.6f", a / 1000 }')

    echo "${avg_time}|${total_tokens}|${pp_tps}|${tg_tps}|${ttft}"
}

# Format time: seconds with 2 decimals, or ms if < 1s
format_time() {
    local sec="$1"
    if [[ $(awk -v s="$sec" 'BEGIN { print (s < 1) }') -eq 1 ]]; then
        printf "%.2f ms" "$(awk -v s="$sec" 'BEGIN { printf "%.6f", s * 1000 }')"
    else
        printf "%.2f s" "$sec"
    fi
}

# Format tokens per second
format_tps() {
    local tps="$1"
    printf "%.2f" "$tps"
}

ensure_output_file_header() {
    local output_file="$1"

    if [[ ! -f "$output_file" ]]; then
        {
            echo "# Benchmarks"
            echo ""
            echo "## Results"
            echo ""
        } > "$output_file"
    fi
}

append_run_block_to_output() {
    local content_file="$1"
    local output_file="$2"

    if grep -Eq '^## [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} - ' "$output_file"; then
        printf '\n---\n\n' >> "$output_file"
    fi

    cat "$content_file" >> "$output_file"
}

write_run_block() {
    local content_file="$1"
    local output_file="$2"

    if [[ -n "$output_file" ]]; then
        ensure_output_file_header "$output_file"
        append_run_block_to_output "$content_file" "$output_file"
    fi

    echo "---"
    echo ""
    cat "$content_file"
}

# Run the selected benchmark tests against the server and print the table
run_server_benchmarks() {
    local label="$1"
    local gpu="$2"
    shift 2
    local selected=("$@")

    echo "### $label - server - $gpu ($(hostport))"
    echo ""
    echo "| Test | Run | Avg Time | Tokens Processed | PP T/s | TG T/s | TTFT |"
    echo "|------|-----|----------|------------------|--------|--------|------|"

    local total_tests=${#selected[@]}
    local test_num=0

    for bench in "${selected[@]}"; do
        IFS='|' read -r test_name pp tg <<< "$bench"
        test_num=$((test_num + 1))

        # Progress indicator
        if [[ "$PROGRESS" -eq 1 ]]; then
            echo "  [$test_num/$total_tests] Running $test_name (pp=$pp, tg=$tg) on $label @ $(hostport)..." >&2
        fi

        # Accumulate results across runs
        local sum_avg_time=0 sum_tokens=0 sum_pp_tps=0 sum_tg_tps=0 sum_ttft=0
        local valid_runs=0

        for run in $(seq 1 "$RUNS"); do
            if [[ "$PROGRESS" -eq 1 && "$RUNS" -gt 1 ]]; then
                echo "    Run $run/$RUNS..." >&2
            fi

            local response
            if ! response=$(run_completion "$pp" "$tg"); then
                echo "ERROR: benchmark failed for $test_name (pp=$pp, tg=$tg, run=$run)" >&2
                continue
            fi

            local parsed
            if ! parsed=$(parse_timings "$response"); then
                echo "ERROR: invalid timings for $test_name (pp=$pp, tg=$tg, run=$run)" >&2
                continue
            fi

            IFS='|' read -r avg_time tokens_processed pp_tps tg_tps ttft <<< "$parsed"

            # Validate we got real numbers
            if [[ -n "$avg_time" && "$avg_time" != "0" && -n "$tokens_processed" && "$tokens_processed" != "0" ]]; then
                sum_avg_time=$(awk -v a="$sum_avg_time" -v b="$avg_time" 'BEGIN { printf "%.6f", a + b }')
                sum_tokens=$(awk -v a="$sum_tokens" -v b="$tokens_processed" 'BEGIN { printf "%.6f", a + b }')
                sum_pp_tps=$(awk -v a="$sum_pp_tps" -v b="$pp_tps" 'BEGIN { printf "%.6f", a + b }')
                sum_tg_tps=$(awk -v a="$sum_tg_tps" -v b="$tg_tps" 'BEGIN { printf "%.6f", a + b }')
                sum_ttft=$(awk -v a="$sum_ttft" -v b="$ttft" 'BEGIN { printf "%.6f", a + b }')
                valid_runs=$((valid_runs + 1))
            fi
        done

        if [[ $valid_runs -eq 0 ]]; then
            printf "| %s | %d/%d | — | — | — | — | — |\n" "$test_name" "$RUNS" "$RUNS"
            continue
        fi

        # Calculate averages
        local avg_avg_time avg_tokens avg_pp_tps avg_tg_tps avg_ttft
        avg_avg_time=$(awk -v s="$sum_avg_time" -v n="$valid_runs" 'BEGIN { printf "%.2f", s / n }')
        avg_tokens=$(awk -v s="$sum_tokens" -v n="$valid_runs" 'BEGIN { printf "%.0f", s / n }')
        avg_pp_tps=$(awk -v s="$sum_pp_tps" -v n="$valid_runs" 'BEGIN { printf "%.2f", s / n }')
        avg_tg_tps=$(awk -v s="$sum_tg_tps" -v n="$valid_runs" 'BEGIN { printf "%.2f", s / n }')
        avg_ttft=$(awk -v s="$sum_ttft" -v n="$valid_runs" 'BEGIN { printf "%.2f", s / n }')

        # Tokens processed: show as "actual / expected" (expected = pp + tg)
        local expected_tokens=$((pp + tg))
        local tokens_display="${avg_tokens} / ${expected_tokens}"

        # Format output matching BENCHMARKS.md exactly
        local formatted_time formatted_ttft
        formatted_time=$(format_time "$avg_avg_time")
        formatted_ttft=$(format_time "$avg_ttft")

        printf "| %s | %d/%d | %s | %s | %s | %s | %s |\n" \
            "$test_name" \
            "$valid_runs" "$RUNS" \
            "$formatted_time" \
            "$tokens_display" \
            "$(format_tps "$avg_pp_tps")" \
            "$(format_tps "$avg_tg_tps")" \
            "$formatted_ttft"
    done

    echo ""
}

main() {
    local output_file=""
    local -a test_filter=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            -s|--server) SERVER="$2"; shift 2 ;;
            --model-label) MODEL_LABEL="$2"; shift 2 ;;
            --gpu-label) GPU_LABEL="$2"; shift 2 ;;
            -r|--runs) RUNS="$2"; shift 2 ;;
            -p|--progress) PROGRESS="$2"; shift 2 ;;
            --test)
                if [[ $# -ge 2 && -n "$2" && "${2#-}" = "$2" ]]; then
                    test_filter+=("$2"); shift 2
                else
                    echo "ERROR: --test requires a test name argument" >&2; exit 1
                fi ;;
            -o|--output)
                if [[ $# -ge 2 && -n "$2" && "${2#-}" = "$2" ]]; then
                    output_file="$2"; shift 2
                else
                    echo "ERROR: --output requires a filename argument" >&2; exit 1
                fi ;;
            -h|--help) usage ;;
            *)
                echo "ERROR: Unknown argument: $1" >&2
                echo "Run '$0 --help' for usage." >&2
                exit 1
                ;;
        esac
    done

    # Check for required dependencies
    if ! command -v curl >/dev/null 2>&1; then
        echo "ERROR: curl not found" >&2
        exit 1
    fi
    if ! command -v jq >/dev/null 2>&1; then
        echo "ERROR: jq not found" >&2
        exit 1
    fi
    if ! command -v awk >/dev/null 2>&1; then
        echo "ERROR: awk not found" >&2
        exit 1
    fi

    # Resolve selected tests (default: all 9 in BENCHMARKS.md order)
    local -a selected=()
    if [[ ${#test_filter[@]} -eq 0 ]]; then
        selected=("${BENCHMARKS[@]}")
    else
        for wanted in "${test_filter[@]}"; do
            local found=0
            for bench in "${BENCHMARKS[@]}"; do
                IFS='|' read -r test_name _ _ <<< "$bench"
                if [[ "$test_name" == "$wanted" ]]; then
                    selected+=("$bench")
                    found=1
                    break
                fi
            done
            if [[ "$found" -eq 0 ]]; then
                echo "ERROR: Unknown test: $wanted" >&2
                exit 1
            fi
        done
    fi

    # Server must be up before doing anything else
    preflight

    # Resolve labels
    local label="$MODEL_LABEL"
    if [[ -z "$label" ]]; then
        label=$(default_model_label)
    fi
    local gpu="$GPU_LABEL"

    local content_file
    content_file=$(mktemp)

    {
        echo "## $(date '+%Y-%m-%d %H:%M') - server ($(hostport))"
        echo ""
        run_server_benchmarks "$label" "$gpu" "${selected[@]}"
    } > "$content_file"

    write_run_block "$content_file" "$output_file"
    rm -f "$content_file"
}

main "$@"
