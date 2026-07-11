#!/usr/bin/env bash
set -euo pipefail

# Automated llama.cpp benchmark runner using `llama bench -hf`
# Outputs markdown tables to stdout (redirect to .md file)

# Configuration
LLAMA_BIN="${LLAMA_BIN:-llama}"  # llama binary in PATH on remote machine
RUNS="${RUNS:-3}"
BATCH="${BATCH:-1}"
THREADS="${THREADS:-$(nproc)}"

# Model configurations: "hf_model_id|label|ngl|quant|params|size_gb"
# Uses Hugging Face model IDs with quantization suffix (e.g., :Q4_0, :Q4_K_M)
MODELS=(
    "fableforge-ai/FableForge-1.5B:Q4_K_M|FableForge-1.5B|-1|Q4_K_M|1.5B|0.9"
    "jica98/qwen3.5-4B-super-coder:Q4_0|Qwen3.5-4B-Coder|-1|Q4_0|4.3B|2.4"
    "jica98/qwen3.5-4B-super-coder:Q4_K_M|Qwen3.5-4B-Coder-Q4KM|-1|Q4_K_M|4.3B|2.5"
    "jica98/qwen3.5-4B-super-coder:Q5_K_M|Qwen3.5-4B-Coder-Q5KM|-1|Q5_K_M|4.3B|3.0"
    "jica98/qwen3.5-4B-super-coder:Q6_K|Qwen3.5-4B-Coder-Q6K|-1|Q6_K|4.3B|3.5"
    "jica98/qwen3.5-4B-super-coder:IQ4_XS|Qwen3.5-4B-Coder-IQ4XS|-1|IQ4_XS|4.3B|2.2"
    "Jackrong/Qwen3.5-9B-GLM5.1-Distill-v1:Q4_K_M|Qwen3.5-9B-GLM-Distill|-1|Q4_K_M|9.0B|5.2"
    "Jackrong/Qwen3.5-9B-GLM5.1-Distill-v1:Q5_K_M|Qwen3.5-9B-GLM-Distill-Q5KM|-1|Q5_K_M|9.0B|6.0"
)

# Benchmark configs: "label|pp|tg|n|extra_args"
# extra_args: additional flags for llama bench
BENCHMARKS=(
    # Prompt processing
    "pp512|512|128|128|"
    "pp16k|16384|128|128|"
    "pp32k|32768|128|128|"
    "pp64k|65536|128|128|"

    # Token generation
    "tg128|512|128|128|"
    "tg4k|512|4096|4096|"

    # Long context with KV cache quant (KQ4_0)
    "pp16k_kq4|16384|128|128|--cache-type-k q4_0 --cache-type-v q4_0"
    "pp32k_kq4|32768|128|128|--cache-type-k q4_0 --cache-type-v q4_0"
    "pp64k_kq4|65536|128|128|--cache-type-k q4_0 --cache-type-v q4_0"

    # KV cache quant variants
    "pp16k_kq6|16384|128|128|--cache-type-k q6_0 --cache-type-v q6_0"
    "pp32k_kq6|32768|128|128|--cache-type-k q6_0 --cache-type-v q6_0"
    "pp16k_kq8|16384|128|128|--cache-type-k q8_0 --cache-type-v q8_0"
    "pp32k_kq8|32768|128|128|--cache-type-k q8_0 --cache-type-v q8_0"
)

usage() {
    cat <<EOF
Usage: $0 [options] [model_index...]

Options:
  -b, --bin BIN        llama binary (default: llama, must be in PATH on target)
  -r, --runs N         Number of runs per benchmark (default: 3)
  -t, --threads N      CPU threads (default: nproc)
  -B, --batch N        Batch size (default: 1)
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
        printf "%d) %s [%s] (%.1f GB, %s params) — HF: %s\n" "$i" "$label" "$quant" "$size_gb" "$params" "$hf_id"
    done
    exit 0
}

run_benchmark() {
    local hf_model="$1"
    local label="$2"
    local ngl="$3"
    local bench_label="$4"
    local pp="$5"
    local tg="$6"
    local n="$7"
    local extra_args="$8"

    # Build llama bench command
    # llama bench -hf <model> -p <pp> -n <tg> -ngl <ngl> -r <runs> -b <batch> -t <threads> [extra_args]
    local cmd=("$LLAMA_BIN" bench -hf "$hf_model" -p "$pp" -n "$n" -ngl "$ngl" -r "$RUNS" -b "$BATCH" -t "$THREADS")
    [[ -n "$extra_args" ]] && cmd+=($extra_args)

    echo "Running: ${cmd[*]}" >&2

    # Run and capture output
    local output
    output=$("${cmd[@]}" 2>&1) || {
        echo "ERROR: benchmark failed for $label ($bench_label)" >&2
        echo "$output" >&2
        return 1
    }

    # Parse markdown table output from llama-bench
    # Format: |model|size|params|backend|ngl|test|t/s|
    # Example: |llama 7B Q4_0|3.56 GiB|6.74 B|CUDA|-1|pp512|2368.80 ± 93.24|
    local result_line
    result_line=$(echo "$output" | grep -E '^\|.*\|.*pp[0-9]|^\|.*\|.*tg[0-9]' | tail -1)

    # Extract the second-to-last field (t/s) - field before trailing empty field
    local last_col
    last_col=$(echo "$result_line" | awk -F'|' '{print $(NF-1)}' | xargs)

    # Parse t/s value and optional std_dev (format: "123.45 ± 0.67")
    local tok_s tok_s_std
    if [[ "$last_col" =~ ([0-9.]+)[[:space:]]*±[[:space:]]*([0-9.]+) ]]; then
        tok_s="${BASH_REMATCH[1]}"
        tok_s_std="${BASH_REMATCH[2]}"
    elif [[ "$last_col" =~ ([0-9.]+) ]]; then
        tok_s="${BASH_REMATCH[1]}"
    fi

    if [[ -z "$tok_s" ]]; then
        echo "ERROR: could not parse result: $result_line" >&2
        return 1
    fi

    if [[ -n "$tok_s_std" && "$tok_s_std" != "nan" && "$tok_s_std" != "0" && "$tok_s_std" != "" ]]; then
        printf "%s|%.1f ± %.1f\n" "$bench_label" "$tok_s" "$tok_s_std"
    else
        printf "%s|%.1f\n" "$bench_label" "$tok_s"
    fi
}

print_model_header() {
    local label="$1"
    local quant="$2"
    local params="$3"
    local size="$4"
    local ngl="$5"

    echo "## $label ($quant, CUDA, NGL=$ngl) — ${params} params, ~${size}GB"
    echo ""
    echo "| Metric | pp512 | pp16k | pp32k | pp64k | tg128 | tg4k |"
    echo "|--------|-------|-------|-------|-------|-------|------|"
}

print_kv_header() {
    local label="$1"
    local quant="$2"
    local ngl="$3"

    echo "## $label ($quant, NGL=$ngl) — KV Cache Quantization"
    echo ""
    echo "| Metric | pp16k | pp32k | tg128 | tg4k |"
    echo "|--------|-------|-------|-------|------|"
}

run_model_benchmarks() {
    local model_idx="$1"
    local model_config="${MODELS[model_idx]}"

    IFS='|' read -r hf_id label ngl quant params size_gb <<< "$model_config"

    print_model_header "$label" "$quant" "$params" "$size_gb" "$ngl"

    declare -A results
    for bench in "${BENCHMARKS[@]}"; do
        IFS='|' read -r bench_label bench_pp bench_tg bench_n bench_extra <<< "$bench"
        if [[ "$bench_label" == pp*_kq* ]]; then
            continue  # Skip KV quant benchmarks for main table
        fi

        local result
        result=$(run_benchmark "$hf_id" "$label" "$ngl" "$bench_label" "$bench_pp" "$bench_tg" "$bench_n" "$bench_extra")
        local key="${result%%|*}"
        local val="${result#*|}"
        results["$key"]="$val"
    done

    printf "| tok/s | %s | %s | %s | %s | %s | %s |\n" \
        "${results[pp512]:-—}" \
        "${results[pp16k]:-—}" \
        "${results[pp32k]:-—}" \
        "${results[pp64k]:-—}" \
        "${results[tg128]:-—}" \
        "${results[tg4k]:-—}"

    echo ""
}

run_model_kv_benchmarks() {
    local model_idx="$1"
    local model_config="${MODELS[model_idx]}"

    IFS='|' read -r hf_id label ngl quant params size_gb <<< "$model_config"

    print_kv_header "$label" "$quant" "$ngl"

    declare -A results
    for bench in "${BENCHMARKS[@]}"; do
        IFS='|' read -r bench_label bench_pp bench_tg bench_n bench_extra <<< "$bench"
        if [[ "$bench_label" != pp*_kq* ]]; then
            continue
        fi

        local result
        result=$(run_benchmark "$hf_id" "$label" "$ngl" "$bench_label" "$bench_pp" "$bench_tg" "$bench_n" "$bench_extra")
        local key="${result%%|*}"
        local val="${result#*|}"
        results["$key"]="$val"
    done

    printf "| tok/s | %s | %s | — | — |\n" \
        "${results[pp16k_kq4]:-—}" \
        "${results[pp32k_kq4]:-—}"

    echo ""
}

run_ngl_sweep() {
    local model_idx="$1"
    local model_config="${MODELS[model_idx]}"

    IFS='|' read -r hf_id label ngl quant params size_gb <<< "$model_config"

    echo "## $label ($quant) — NGL Sweep"
    echo ""
    echo "| NGL | VRAM (est) | pp512 | tg128 | tg4k |"
    echo "|-----|------------|-------|-------|------|"

    local ngls=(-1 50 35 20 10 0)
    for ngl_val in "${ngls[@]}"; do
        local vram_est
        case $ngl_val in
            -1) vram_est="Full" ;;
            50) vram_est="~4.0 GB" ;;
            35) vram_est="~3.2 GB" ;;
            20) vram_est="~2.2 GB" ;;
            10) vram_est="~1.5 GB" ;;
            0)  vram_est="CPU" ;;
        esac

        local pp512_res tg128_res tg4k_res
        pp512_res=$(run_benchmark "$hf_id" "$label" "$ngl_val" "pp512" 512 128 128 "" | cut -d'|' -f2)
        tg128_res=$(run_benchmark "$hf_id" "$label" "$ngl_val" "tg128" 512 128 128 "" | cut -d'|' -f2)
        tg4k_res=$(run_benchmark "$hf_id" "$label" "$ngl_val" "tg4k" 512 4096 4096 "" | cut -d'|' -f2)

        printf "| %s | %s | %s | %s | %s |\n" "$ngl_val" "$vram_est" "$pp512_res" "$tg128_res" "$tg4k_res"
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

    # Default: run all models if none specified
    if [[ ${#model_indices[@]} -eq 0 ]]; then
        model_indices=("${!MODELS[@]}")
    fi

    echo "# Automated llama.cpp Benchmarks (via llama bench -hf)"
    echo ""
    echo "Generated: $(date)"
    echo "GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null || echo 'Unknown')"
    echo "VRAM: $(nvidia-smi --query-gpu=memory.total --format=csv,noheader 2>/dev/null || echo 'Unknown')"
    echo "llama bin: $LLAMA_BIN"
    echo "Runs: $RUNS, Threads: $THREADS, Batch: $BATCH"
    echo ""

    for idx in "${model_indices[@]}"; do
        run_model_benchmarks "$idx"
        run_model_kv_benchmarks "$idx"
        run_ngl_sweep "$idx"
    done
}

main "$@"