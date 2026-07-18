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

# Model path (folder or .gguf file) - set via -m/--model
MODEL_PATH=""

# Group definitions: name|section_header|start_idx|end_idx
MODEL_GROUPS=(
    "tiny|1B Models|0|3"
    "small|2-3B Models|4|6"
    "medium|4B Models|7|10"
    "large|7-8B Models|11|13"
    "offload|9B Models|14|18"
)

# NGL values to sweep for the offload group
OFFLOAD_NGL_VALUES=(0 10 20 32 -1)

# Model configurations: "hf_model_id|label|ngl|quant|params|size_gb"
MODELS=(
    # tiny - 1B models (indices 0-3)
    "bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M|Llama 3.2 1B Instruct|-1|Q4_K_M|1B|0.8"
    "fableforge-ai/FableForge-1.5B:Q4_K_M|FableForge 1.5B|-1|Q4_K_M|1.5B|0.9"
    "unsloth/Qwen3.5-0.8B-GGUF:Q4_K_M|Qwen3.5 0.8B|-1|Q4_K_M|0.8B|0.5"
    "unsloth/gemma-3-1b-it-GGUF:Q4_K_M|Gemma 3 1B|-1|Q4_K_M|1B|0.7"

    # small - 2-3B models (indices 4-6)
    "google/gemma-2-2b-it-GGUF:Q4_K_M|Gemma 2 2B Instruct|-1|Q4_K_M|2B|1.6"
    "Qwen/Qwen2.5-3B-Instruct-GGUF:Q4_K_M|Qwen2.5 3B Instruct|-1|Q4_K_M|3B|1.9"
    "bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M|Llama 3.2 3B Instruct|-1|Q4_K_M|3B|2.0"

    # medium - 4B models (indices 7-10)
    "unsloth/Phi-4-mini-instruct-GGUF:Q4_K_M|Phi-4-mini-instruct|-1|Q4_K_M|4B|2.5"
    "microsoft/Phi-3-mini-4k-instruct-gguf:Q4_K_M|Phi-3-mini-4k-instruct|-1|Q4_K_M|4B|2.2"
    "bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF:Q4_K_M|Qwen3 4B Instruct|-1|Q4_K_M|4B|2.6"
    "unsloth/Nemotron-3-Nano-4B-Instruct-GGUF:Q4_K_M|Nemotron 3 Nano 4B|-1|Q4_K_M|4B|2.5"

    # large - 7-8B models (indices 11-13)
    "unsloth/Meta-Llama-3.1-8B-Instruct-GGUF:Q4_K_M|Llama 3.1 8B Instruct|-1|Q4_K_M|8B|4.7"
    "Qwen/Qwen2.5-7B-Instruct-GGUF:Q4_K_M|Qwen2.5 7B Instruct|-1|Q4_K_M|7B|4.4"
    "MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF:Q4_K_M|Mistral 7B Instruct v0.3|-1|Q4_K_M|7B|4.4"

    # offload - 9B models (indices 14-18)
    "Qwen/Qwen3-8B-GGUF:Q4_K_M|Qwen3 8B|-1|Q4_K_M|8B|5.0"
    "bartowski/gemma-2-9b-it-GGUF:Q4_K_M|Gemma 2 9B Instruct|-1|Q4_K_M|9B|5.8"
    "unsloth/Qwen3.5-9B-GGUF:Q4_K_M|Qwen3.5 9B|-1|Q4_K_M|9B|5.6"
    "tensorblock/glm-4-9b-hf-GGUF:Q4_K_M|GLM-4 9B|-1|Q4_K_M|9B|6.2"
    "LiquidAI/LFM2.5-8B-A1B-GGUF:Q4_K_M|LFM2.5 8B A1B|-1|Q4_K_M|8.3B|5.3"
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
Usage: $0 [options] [model_index|group_name...]

Groups (defined in MODEL_GROUPS array):
  tiny     1B models (indices 0-3)
  small    2-3B models (indices 4-6)
  medium   4B models (indices 7-10)
  large    7-8B models (indices 11-13)
  offload  9B models with NGL sweep: 0,10,20,32,-1 (indices 14-17)

Options:
  -b, --bin BIN        llama binary (default: llama, must be in PATH on target)
  -r, --runs N         Number of runs per benchmark (default: 1)
  -t, --threads N      CPU threads (default: nproc)
  -B, --batch N        Batch size (default: 1)
  -p, --progress 0|1   Show progress indicators (default: 1)
  -m, --model PATH     Path to local model folder or .gguf file
      --model-label L  Custom label for local model (default: folder/file name)
      --model-ngl N    GPU layers to offload for local model (default: -1 = all)
  -o, --output FILE    Save output to FILE and print to stdout (default: stdout only)
  -l, --list           List available models
  -h, --help           Show this help

Models (configure in MODELS array):
EOF
    for i in "${!MODELS[@]}"; do
        IFS='|' read -r _ label _ quant params _ <<< "${MODELS[i]}"
        printf "  %d) %s [%s] (%s params)\n" "$i" "$label" "$quant" "$params"
    done
    echo
    echo "Examples:"
    echo "  $0 -m /path/to/model.gguf                    # Benchmark a single .gguf file"
    echo "  $0 -m /path/to/model/folder --model-label MyModel  # Benchmark model folder with custom label"
    echo "  $0 -m /path/to/model --model-ngl 32                  # Benchmark with 32 GPU layers offloaded"
    echo "  $0 0 1 2                                        # Benchmark models 0, 1, 2 from MODELS array"
    echo "  $0 -r 3 -t 8                                    # Run 3 times with 8 threads on all models"
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
    output=$("${cmd[@]}") || {
        echo "ERROR: benchmark failed for $hf_model (pp=$pp, tg=$tg, run=$run_num)" >&2
        return 1
    }

    echo "$output"
}

# Parse JSON output from llama-bench and extract metrics
# llama-bench -o json outputs an array of 2 objects:
#   [0] = prompt processing: {avg_ns, avg_ts, n_prompt, n_gen, ...}
#   [1] = text generation:   {avg_ns, avg_ts, n_prompt, n_gen, ...}
parse_benchmark_json() {
    local json_output="$1"

    local pp_avg_ns pp_avg_ts pp_tokens tg_avg_ns tg_avg_ts tg_tokens
    pp_avg_ns=$(echo "$json_output" | jq '.[0].avg_ns')
    pp_avg_ts=$(echo "$json_output" | jq '.[0].avg_ts')
    pp_tokens=$(echo "$json_output" | jq '.[0].n_prompt')
    tg_avg_ns=$(echo "$json_output" | jq '.[1].avg_ns')
    tg_avg_ts=$(echo "$json_output" | jq '.[1].avg_ts')
    tg_tokens=$(echo "$json_output" | jq '.[1].n_gen')

    # Convert avg_ns to seconds
    local pp_time tg_time
    pp_time=$(echo "scale=6; $pp_avg_ns / 1000000000" | bc -l)
    tg_time=$(echo "scale=6; $tg_avg_ns / 1000000000" | bc -l)

    # Total time = pp_time + tg_time
    local total_time
    total_time=$(echo "scale=6; $pp_time + $tg_time" | bc -l)

    # Total tokens processed
    local total_tokens
    total_tokens=$((pp_tokens + tg_tokens))

    # TTFT ≈ prompt processing time (time to first generated token)
    echo "${total_time}|${total_tokens}|${pp_avg_ts}|${tg_avg_ts}|${pp_time}"
}

# Format time: seconds with 2 decimals, or ms if < 1s
format_time() {
    local sec="$1"
    if (( $(echo "$sec < 1" | bc -l) )); then
        printf "%.2f ms" "$(echo "$sec * 1000" | bc -l)"
    else
        printf "%.2f s" "$sec"
    fi
}

# Format tokens per second
format_tps() {
    local tps="$1"
    printf "%.2f" "$tps"
}

# Run benchmarks on a local model path (folder or .gguf file)
run_local_model_benchmarks() {
    local model_path="$1"
    local label="$2"
    local ngl="${3:--1}"

    # Determine model label from path if not provided
    if [[ -z "$label" ]]; then
        label=$(basename "$model_path")
        # Remove .gguf extension if present
        label=${label%.gguf}
    fi

    local gpu_name
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "Unknown GPU")
    local vram
    vram=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1 || echo "Unknown VRAM")

    echo "### $label - $gpu_name ($vram)"
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
            json_output=$(run_benchmark_json_local "$model_path" "$pp" "$tg" "$ngl" "$run") || continue

            local parsed
            parsed=$(parse_benchmark_json "$json_output") || continue

            IFS='|' read -r avg_time tokens_processed pp_tps tg_tps ttft <<< "$parsed"

            # Validate we got real numbers
            if [[ -n "$avg_time" && "$avg_time" != "0" && -n "$tokens_processed" && "$tokens_processed" != "0" ]]; then
                sum_avg_time=$(echo "$sum_avg_time + $avg_time" | bc -l)
                sum_tokens=$(echo "$sum_tokens + $tokens_processed" | bc -l)
                sum_pp_tps=$(echo "$sum_pp_tps + $pp_tps" | bc -l)
                sum_tg_tps=$(echo "$sum_tg_tps + $tg_tps" | bc -l)
                sum_ttft=$(echo "$sum_ttft + $ttft" | bc -l)
                valid_runs=$((valid_runs + 1))
            fi
        done

        if [[ $valid_runs -eq 0 ]]; then
            printf "| %s | %d/%d | — | — | — | — | — |\n" "$test_name" "$RUNS" "$RUNS"
            continue
        fi

        # Calculate averages
        local avg_avg_time avg_tokens avg_pp_tps avg_tg_tps avg_ttft
        avg_avg_time=$(echo "scale=2; $sum_avg_time / $valid_runs" | bc -l)
        avg_tokens=$(printf "%.0f" "$(echo "$sum_tokens / $valid_runs" | bc -l)")
        avg_pp_tps=$(echo "scale=2; $sum_pp_tps / $valid_runs" | bc -l)
        avg_tg_tps=$(echo "scale=2; $sum_tg_tps / $valid_runs" | bc -l)
        avg_ttft=$(echo "scale=2; $sum_ttft / $valid_runs" | bc -l)

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

# Run a single benchmark test on local model and return JSON output
run_benchmark_json_local() {
    local model_path="$1"
    local pp="$2"
    local tg="$3"
    local ngl="$4"
    local run_num="$5"

    local cmd=("$LLAMA_BIN" bench -m "$model_path" -p "$pp" -n "$tg" -ngl "$ngl" -r 1 -b "$BATCH" -t "$THREADS" -o json --no-warmup)
    [[ "$PROGRESS" -eq 1 ]] && cmd+=(--progress)

    # Run and capture JSON output (keep stderr separate to avoid progress pollution)
    local output
    output=$("${cmd[@]}") || {
        echo "ERROR: benchmark failed for $model_path (pp=$pp, tg=$tg, run=$run_num)" >&2
        return 1
    }

    echo "$output"
}

run_model_benchmarks() {
    local model_idx="$1"
    local ngl_override="${2:-}"  # optional NGL override for header
    local model_config="${MODELS[model_idx]}"

    IFS='|' read -r hf_id label ngl quant params size_gb <<< "$model_config"

    # Use override NGL for the actual run if provided
    local actual_ngl="$ngl"
    [[ -n "$ngl_override" ]] && actual_ngl="$ngl_override"

    local gpu_name
    gpu_name=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1 || echo "Unknown GPU")
    local vram
    vram=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null | head -1 || echo "Unknown VRAM")

    if [[ -n "$ngl_override" ]]; then
        echo "### $label - $quant - $gpu_name ($vram) - NGL=$ngl_override"
    else
        echo "### $label - $quant - $gpu_name ($vram)"
    fi
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
            json_output=$(run_benchmark_json "$hf_id" "$pp" "$tg" "$actual_ngl" "$run") || continue

            local parsed
            parsed=$(parse_benchmark_json "$json_output") || continue

            IFS='|' read -r avg_time tokens_processed pp_tps tg_tps ttft <<< "$parsed"

            # Validate we got real numbers
            if [[ -n "$avg_time" && "$avg_time" != "0" && -n "$tokens_processed" && "$tokens_processed" != "0" ]]; then
                sum_avg_time=$(echo "$sum_avg_time + $avg_time" | bc -l)
                sum_tokens=$(echo "$sum_tokens + $tokens_processed" | bc -l)
                sum_pp_tps=$(echo "$sum_pp_tps + $pp_tps" | bc -l)
                sum_tg_tps=$(echo "$sum_tg_tps + $tg_tps" | bc -l)
                sum_ttft=$(echo "$sum_ttft + $ttft" | bc -l)
                valid_runs=$((valid_runs + 1))
            fi
        done

        if [[ $valid_runs -eq 0 ]]; then
            printf "| %s | %d/%d | — | — | — | — | — |\n" "$test_name" "$RUNS" "$RUNS"
            continue
        fi

        # Calculate averages
        local avg_avg_time avg_tokens avg_pp_tps avg_tg_tps avg_ttft
        avg_avg_time=$(echo "scale=2; $sum_avg_time / $valid_runs" | bc -l)
        avg_tokens=$(printf "%.0f" "$(echo "$sum_tokens / $valid_runs" | bc -l)")
        avg_pp_tps=$(echo "scale=2; $sum_pp_tps / $valid_runs" | bc -l)
        avg_tg_tps=$(echo "scale=2; $sum_tg_tps / $valid_runs" | bc -l)
        avg_ttft=$(echo "scale=2; $sum_ttft / $valid_runs" | bc -l)

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

# Global task list: each entry is "model_idx|section_header|ngl_override"
TASKS=()

# Resolve arguments into TASKS array.
# Groups expand to their model indices; offload adds NGL sweep entries.
resolve_tasks() {
    local args=("$@")
    TASKS=()

    for arg in "${args[@]}"; do
        local resolved=0
        for group in "${MODEL_GROUPS[@]}"; do
            IFS='|' read -r gname section start end <<< "$group"
            if [[ "$arg" == "$gname" ]]; then
                for ((i=start; i<=end; i++)); do
                    if [[ "$gname" == "offload" ]]; then
                        for ngl in "${OFFLOAD_NGL_VALUES[@]}"; do
                            TASKS+=("$i|$section|$ngl")
                        done
                    else
                        TASKS+=("$i|$section|")
                    fi
                done
                resolved=1
                break
            fi
        done
        if [[ "$resolved" -eq 0 ]]; then
            if [[ "$arg" =~ ^[0-9]+$ ]] && [[ "$arg" -ge 0 ]] && [[ "$arg" -lt "${#MODELS[@]}" ]]; then
                local section=""
                for group in "${MODEL_GROUPS[@]}"; do
                    IFS='|' read -r gname gsection gstart gend <<< "$group"
                    if [[ "$arg" -ge "$gstart" && "$arg" -le "$gend" ]]; then
                        section="$gsection"
                        break
                    fi
                done
                TASKS+=("$arg|$section|")
            else
                echo "ERROR: Unknown model index or group: $arg" >&2
                exit 1
            fi
        fi
    done
}

main() {
    local model_indices=()
    local model_label=""
    local model_ngl="-1"
    local output_file=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -b|--bin) LLAMA_BIN="$2"; shift 2 ;;
            -r|--runs) RUNS="$2"; shift 2 ;;
            -t|--threads) THREADS="$2"; shift 2 ;;
            -B|--batch) BATCH="$2"; shift 2 ;;
            -p|--progress) PROGRESS="$2"; shift 2 ;;
            -m|--model) MODEL_PATH="$2"; shift 2 ;;
            --model-label) model_label="$2"; shift 2 ;;
            --model-ngl) model_ngl="$2"; shift 2 ;;
            -o|--output)
                if [[ $# -ge 2 && -n "$2" && "${2#-}" = "$2" ]]; then
                    output_file="$2"; shift 2
                else
                    echo "ERROR: --output requires a filename argument" >&2; exit 1
                fi ;;
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

    # Check for required dependencies
    if ! command -v jq >/dev/null 2>&1; then
        echo "ERROR: jq not found" >&2
        exit 1
    fi
    if ! command -v bc >/dev/null 2>&1; then
        echo "ERROR: bc not found" >&2
        exit 1
    fi

    # If model path provided via -m/--model, run benchmarks on that model only
    if [[ -n "$MODEL_PATH" ]]; then
        if [[ ! -e "$MODEL_PATH" ]]; then
            echo "ERROR: Model path does not exist: $MODEL_PATH" >&2
            exit 1
        fi

        # Write header if output file is new
        if [[ -n "$output_file" && ! -f "$output_file" ]]; then
            {
                echo "# Benchmarks"
                echo ""
                echo "## Results"
                echo ""
            } > "$output_file"
        fi

        {
            echo "---"
            echo ""
            echo "## $(date '+%Y-%m-%d %H:%M') - local model"
            echo ""

            run_local_model_benchmarks "$MODEL_PATH" "$model_label" "$model_ngl"
        } > >(if [[ -n "$output_file" ]]; then tee -a "$output_file"; else cat; fi)
        exit 0
    fi

    # Default: run all groups if no args specified
    if [[ ${#model_indices[@]} -eq 0 ]]; then
        model_indices=(tiny small medium large offload)
    fi

    # Resolve args to task list
    resolve_tasks "${model_indices[@]}"

    # Build a group label from the args for the timestamp header
    local run_label=""
    for arg in "${model_indices[@]}"; do
        [[ -n "$run_label" ]] && run_label+=", "
        run_label+="$arg"
    done

    # Write header if output file is new
    if [[ -n "$output_file" && ! -f "$output_file" ]]; then
        {
            echo "# Benchmarks"
            echo ""
            echo "## Results"
            echo ""
        } > "$output_file"
    fi

    # Run all tasks, writing to stdout and optionally appending to output file
    {
        echo "---"
        echo ""
        echo "## $(date '+%Y-%m-%d %H:%M') - $run_label"
        echo ""

        local current_section=""
        for task in "${TASKS[@]}"; do
            IFS='|' read -r idx section ngl_override <<< "$task"

            if [[ -n "$section" && "$section" != "$current_section" ]]; then
                echo "## $section"
                echo ""
                current_section="$section"
            fi

            if [[ -n "$ngl_override" ]]; then
                run_model_benchmarks "$idx" "$ngl_override"
            else
                run_model_benchmarks "$idx"
            fi
        done
    } > >(if [[ -n "$output_file" ]]; then tee -a "$output_file"; else cat; fi)
}

main "$@"
