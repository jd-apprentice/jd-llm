#!/usr/bin/env bash
set -euo pipefail

# Automated llama.cpp benchmark runner using `llama bench -hf`
# Outputs markdown tables matching BENCHMARKS.md format exactly

# Configuration
LLAMA_BIN="${LLAMA_BIN:-llama}"
RUNS="${RUNS:-1}"
BATCH="${BATCH:-1}"
THREADS="${THREADS:-$(nproc)}"
PROGRESS="${PROGRESS:-1}"  # 1 = show progress, 0 = silent

# Model configurations: "hf_model_id|label|ngl|quant|params|size_gb"
MODELS=(
    "fableforge-ai/FableForge-1.5B:Q4_K_M|FableForge-1.5B|-1|Q4_K_M|1.5B|0.9"
    "jica98/qwen3.5-4B-super-coder:Q4_0|Qwen3.5-4B-Coder|-1|Q4_0|4.3B|2.4"
    "jica98/qwen3.5-4B-super-coder:Q4_K_M|Qwen3.5-4B-Coder-Q4KM|-1|Q4_K_M|4.3B|2.5"
    "jica98/qwen3.5-4B-super-coder:Q5_K_M|Qwen3.5-4B-Coder-Q5KM|-1|Q5_K_M|4.3B|3.0"
    "jica98/qwen3.5-4B-super-coder:Q6_K|Qwen3.5-4B-Coder-Q6K|-1|Q6_K|4.3B|3.5"
    "jica98/qwen3.5-4B-super-coder:IQ4_XS|Qwen3.5-4B-Coder-IQ4XS|-1|IQ4_XS|4.3B|2.2"
    #"Jackrong/Qwen3.5-9B-GLM5.1-Distill-v1:Q4_K_M|Qwen3.5-9B-GLM-Distill|-1|Q4_K_M|9.0B|5.2"
    #"Jackrong/Qwen3.5-9B-GLM5.1-Distill-v1:Q5_K_M|Qwen3.5-9B-GLM-Distill-Q5KM|-1|Q5_K_M|9.0B|6.0"
)

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
Usage: $0 [options] [model_index...]

Options:
  -b, --bin BIN        llama binary (default: llama, must be in PATH on target)
  -r, --runs N         Number of runs per benchmark (default: 1)
  -t, --threads N      CPU threads (default: nproc)
  -B, --batch N        Batch size (default: 1)
  -p, --progress 0|1   Show progress indicators (default: 1)
  -l, --list           List available models
  -h, --help           Show this help

Models (configure in MODELS array):
EOF
    for i in "${!MODELS[@]}"; do
        IFS='|' read -r _ label _ quant params _ <<< "${MODELS[i]}"
        printf "  %d) %s [%s] (%s params)\n" "$i" "$label" "$quant" "$params"
    done
    exit 0
}

list_models() {
    for i in "${!MODELS[@]}"; do
        IFS='|' read -r hf_id label ngl quant params size_gb <<< "${MODELS[i]}"
        printf "%d) %s [%s] (%s GB, %s params) — HF: %s\n" "$i" "$label" "$quant" "$size_gb" "$params" "$hf_id"
    done
    exit 0
}

# Run a single benchmark test and return JSON output
run_benchmark_json() {
    local hf_model="$1"
    local pp="$2"
    local tg="$3"
    local ngl="$4"
    local run_num="$5"

    local cmd=("$LLAMA_BIN" bench -hf "$hf_model" -p "$pp" -n "$tg" -ngl "$ngl" -r 1 -b "$BATCH" -t "$THREADS" -o json --no-warmup)
    [[ "$PROGRESS" -eq 1 ]] && cmd+=(--progress)

    # Run and capture JSON output
    local output
    output=$("${cmd[@]}" 2>&1) || {
        echo "ERROR: benchmark failed for $hf_model (pp=$pp, tg=$tg, run=$run_num)" >&2
        echo "$output" >&2
        return 1
    }

    echo "$output"
}

# Parse JSON output from llama-bench and extract metrics
# Expected JSON structure from llama-bench --output json:
# [{"model": "...", "size": "...", "params": "...", "backend": "...", "ngl": -1, "test": "pp512", "tps": 123.45, "tokens_processed": 1040, "avg_time": 1.57, "ttft": 1.21, ...}]
parse_benchmark_json() {
    local json_output="$1"

    # Use jq if available, otherwise fallback to grep/sed
    if command -v jq >/dev/null 2>&1; then
        echo "$json_output" | jq -r '.[0] | "\(.avg_time // .time // 0)|\(.tokens_processed // .tokens // 0)|\(.tps // .pp_tps // 0)|\(.tg_tps // .tg // 0)|\(.ttft // .ttft_ms // 0)"'
    else
        # Fallback parsing with grep/sed (less robust)
        local avg_time tokens_processed pp_tps tg_tps ttft

        avg_time=$(echo "$json_output" | grep -o '"avg_time"[[:space:]]*:[[:space:]]*[0-9.]*' | head -1 | sed 's/.*:[[:space:]]*//')
        tokens_processed=$(echo "$json_output" | grep -o '"tokens_processed"[[:space:]]*:[[:space:]]*[0-9]*' | head -1 | sed 's/.*:[[:space:]]*//')
        pp_tps=$(echo "$json_output" | grep -o '"tps"[[:space:]]*:[[:space:]]*[0-9.]*' | head -1 | sed 's/.*:[[:space:]]*//')
        tg_tps=$(echo "$json_output" | grep -o '"tg_tps"[[:space:]]*:[[:space:]]*[0-9.]*' | head -1 | sed 's/.*:[[:space:]]*//')
        ttft=$(echo "$json_output" | grep -o '"ttft"[[:space:]]*:[[:space:]]*[0-9.]*' | head -1 | sed 's/.*:[[:space:]]*//')

        # Fallbacks
        [[ -z "$avg_time" ]] && avg_time=$(echo "$json_output" | grep -o '"time"[[:space:]]*:[[:space:]]*[0-9.]*' | head -1 | sed 's/.*:[[:space:]]*//')
        [[ -z "$tokens_processed" ]] && tokens_processed=$(echo "$json_output" | grep -o '"tokens"[[:space:]]*:[[:space:]]*[0-9]*' | head -1 | sed 's/.*:[[:space:]]*//')
        [[ -z "$ttft" ]] && ttft=$(echo "$json_output" | grep -o '"ttft_ms"[[:space:]]*:[[:space:]]*[0-9.]*' | head -1 | sed 's/.*:[[:space:]]*//')

        echo "${avg_time:-0}|${tokens_processed:-0}|${pp_tps:-0}|${tg_tps:-0}|${ttft:-0}"
    fi
}

# Format time: seconds with 2 decimals, or ms if < 1s
format_time() {
    local sec="$1"
    if (( $(echo "$sec < 1" | bc -l 2>/dev/null || echo 0) )); then
        printf "%.2f ms" "$(echo "$sec * 1000" | bc -l 2>/dev/null || echo "$sec")"
    else
        printf "%.2f s" "$sec"
    fi
}

# Format tokens per second
format_tps() {
    local tps="$1"
    printf "%.2f" "$tps"
}

run_model_benchmarks() {
    local model_idx="$1"
    local model_config="${MODELS[model_idx]}"

    IFS='|' read -r hf_id label ngl quant params size_gb <<< "$model_config"

    local gpu_name
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "Unknown GPU")
    local vram
    vram=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1 || echo "Unknown VRAM")

    echo "### $label - $quant - $gpu_name ($vram)"
    echo ""
    echo "| Test | Run | Avg Time | Tokens Processed | PP T/s | TG T/s | TTFT |"
    echo "|------|-----|----------|------------------|--------|--------|------|"

    local total_tests=${#BENCHMARKS[@]}
    local test_num=0

    for bench in "${BENCHMARKS[@]}"; do
        IFS='|' read -r test_name pp tg <<< "$bench"
        test_num=$((test_num + 1))

        # Progress indicator
        if [[ "$PROGRESS" -eq 1 ]]; then
            echo "  [$test_num/$total_tests] Running $test_name (pp=$pp, tg=$tg) on $label..." >&2
        fi

        # Accumulate results across runs
        local sum_avg_time=0 sum_tokens=0 sum_pp_tps=0 sum_tg_tps=0 sum_ttft=0
        local valid_runs=0

        for run in $(seq 1 "$RUNS"); do
            if [[ "$PROGRESS" -eq 1 && "$RUNS" -gt 1 ]]; then
                echo "    Run $run/$RUNS..." >&2
            fi

            local json_output
            json_output=$(run_benchmark_json "$hf_id" "$pp" "$tg" "$ngl" "$run") || continue

            local parsed
            parsed=$(parse_benchmark_json "$json_output") || continue

            IFS='|' read -r avg_time tokens_processed pp_tps tg_tps ttft <<< "$parsed"

            # Validate we got real numbers
            if [[ -n "$avg_time" && "$avg_time" != "0" && -n "$tokens_processed" && "$tokens_processed" != "0" ]]; then
                sum_avg_time=$(echo "$sum_avg_time + $avg_time" | bc -l 2>/dev/null || awk "BEGIN {print $sum_avg_time + $avg_time}")
                sum_tokens=$(echo "$sum_tokens + $tokens_processed" | bc -l 2>/dev/null || awk "BEGIN {print $sum_tokens + $tokens_processed}")
                sum_pp_tps=$(echo "$sum_pp_tps + $pp_tps" | bc -l 2>/dev/null || awk "BEGIN {print $sum_pp_tps + $pp_tps}")
                sum_tg_tps=$(echo "$sum_tg_tps + $tg_tps" | bc -l 2>/dev/null || awk "BEGIN {print $sum_tg_tps + $tg_tps}")
                sum_ttft=$(echo "$sum_ttft + $ttft" | bc -l 2>/dev/null || awk "BEGIN {print $sum_ttft + $ttft}")
                valid_runs=$((valid_runs + 1))
            fi
        done

        if [[ $valid_runs -eq 0 ]]; then
            printf "| %s | %d/%d | — | — | — | — | — |\n" "$test_name" "$RUNS" "$RUNS"
            continue
        fi

        # Calculate averages
        local avg_avg_time avg_tokens avg_pp_tps avg_tg_tps avg_ttft
        avg_avg_time=$(echo "scale=2; $sum_avg_time / $valid_runs" | bc -l 2>/dev/null || awk "BEGIN {printf \"%.2f\", $sum_avg_time / $valid_runs}")
        avg_tokens=$(echo "$sum_tokens / $valid_runs" | bc -l 2>/dev/null || awk "BEGIN {printf \"%.0f\", $sum_tokens / $valid_runs}")
        avg_pp_tps=$(echo "scale=2; $sum_pp_tps / $valid_runs" | bc -l 2>/dev/null || awk "BEGIN {printf \"%.2f\", $sum_pp_tps / $valid_runs}")
        avg_tg_tps=$(echo "scale=2; $sum_tg_tps / $valid_runs" | bc -l 2>/dev/null || awk "BEGIN {printf \"%.2f\", $sum_tg_tps / $valid_runs}")
        avg_ttft=$(echo "scale=2; $sum_ttft / $valid_runs" | bc -l 2>/dev/null || awk "BEGIN {printf \"%.2f\", $sum_ttft / $valid_runs}")

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
            "$(format_tps \"$avg_pp_tps\")" \
            "$(format_tps \"$avg_tg_tps\")" \
            "$formatted_ttft"
    done

    echo ""
}

main() {
    local model_indices=()

    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--bin) LLAMA_BIN="$2"; shift 2 ;;
            -r|--runs) RUNS="$2"; shift 2 ;;
            -t|--threads) THREADS="$2"; shift 2 ;;
            -B|--batch) BATCH="$2"; shift 2 ;;
            -p|--progress) PROGRESS="$2"; shift 2 ;;
            -l|--list) list_models ;;
            -h|--help) usage ;;
            *) model_indices+=("$1"); shift ;;
        esac
    done

    # Check llama binary exists
    if ! command -v "$LLAMA_BIN" >/dev/null 2>&1; then
        echo "ERROR: $LLAMA_BIN not found in PATH" >&2
        exit 1
    fi

    # Check for jq (recommended for JSON parsing)
    if ! command -v jq >/dev/null 2>&1; then
        echo "WARNING: jq not found, using fallback JSON parsing (less reliable)" >&2
    fi

    # Check for bc (for float math)
    if ! command -v bc >/dev/null 2>&1; then
        echo "WARNING: bc not found, using awk for float math" >&2
    fi

    # Default: run all models if none specified
    if [[ ${#model_indices[@]} -eq 0 ]]; then
        model_indices=("${!MODELS[@]}")
    fi

    echo "# Benchmarks"
    echo ""
    echo "Testing with [localscore.ai](https://localscore.ai)"
    echo ""
    echo "## Results"
    echo ""

    for idx in "${model_indices[@]}"; do
        run_model_benchmarks "$idx"
    done
}

main "$@"
