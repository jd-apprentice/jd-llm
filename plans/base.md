# Benchmark Plan - Models 1B to 9B

## Goal
Exhaustive benchmark of instruct/chat LLM models across different sizes (1B-9B)
for GTX 1660 SUPER 6GB with llama.cpp CUDA.

## Hardware
- GPU: NVIDIA GeForce GTX 1660 SUPER 6GB (5.6GB usable VRAM)
- CPU: AMD Ryzen 5 2600
- RAM: 8GB DDR4
- Backend: llama.cpp with CUDA + MMQ (Turing)
- Quantization: Q4_K_M

## Run groups

```bash
./bench.sh tiny      # 1B models (full GPU)
./bench.sh small     # 2B models (full GPU)
./bench.sh medium    # 4B models (full GPU)
./bench.sh large     # 7-8B models (full GPU, <5GB)
./bench.sh offload   # 9B+ models (NGL sweep: 0,10,20,32,-1)
```

## Models by group

### tiny - 1B (full GPU)

| Model | HF ID | Downloads/mo | Size Q4 |
|-------|-------|--------------|---------|
| Llama 3.2 1B Instruct | bartowski/Llama-3.2-1B-Instruct-GGUF | ~400k | ~0.8GB |
| FableForge 1.5B | fableforge-ai/FableForge-1.5B:Q4_K_M | — | ~0.9GB |
| Qwen3.5 0.8B | unsloth/Qwen3.5-0.8B-GGUF | ~120k | ~0.5GB |
| Gemma 3 1B | unsloth/gemma-3-1b-it-GGUF | ~50k | ~0.7GB |

### small - 2B (full GPU)

| Model | HF ID | Downloads/mo | Size Q4 |
|-------|-------|--------------|---------|
| Gemma 2 2B Instruct | google/gemma-2-2b-it-GGUF | ~840k | ~1.6GB |
| Qwen2.5 3B Instruct | Qwen/Qwen2.5-3B-Instruct-GGUF | ~214k | ~1.9GB |
| Llama 3.2 3B Instruct | bartowski/Llama-3.2-3B-Instruct-GGUF | ~213k | ~2.0GB |

### medium - 4B (full GPU)

| Model | HF ID | Downloads/mo | Size Q4 |
|-------|-------|--------------|---------|
| Phi-4-mini-instruct | unsloth/Phi-4-mini-instruct-GGUF | ~71k | ~2.5GB |
| Phi-3-mini-4k-instruct | microsoft/Phi-3-mini-4k-instruct-gguf | ~68k | ~2.2GB |
| Qwen3 4B Instruct | bartowski/Qwen_Qwen3-4B-Instruct-2507-GGUF | ~11k | ~2.6GB |
| Nemotron 3 Nano 4B | unsloth/Nemotron-3-Nano-4B-Instruct-GGUF | ~50k | ~2.5GB |

### large - 7-8B (full GPU, <5GB)

| Model | HF ID | Downloads/mo | Size Q4 |
|-------|-------|--------------|---------|
| Llama 3.1 8B Instruct | unsloth/Meta-Llama-3.1-8B-Instruct-GGUF | ~650k | ~4.7GB |
| Qwen2.5 7B Instruct | Qwen/Qwen2.5-7B-Instruct-GGUF | ~84k | ~4.4GB |
| Mistral 7B Instruct v0.3 | MaziyarPanahi/Mistral-7B-Instruct-v0.3-GGUF | ~50k+ | ~4.4GB |

### offload - 9B (NGL sweep: 0,10,20,32,-1)

| Model | HF ID | Downloads/mo | Size Q4 |
|-------|-------|--------------|---------|
| Qwen3 8B | Qwen/Qwen3-8B-GGUF | ~132k | ~5.0GB |
| Gemma 2 9B Instruct | bartowski/gemma-2-9b-it-GGUF | ~290k | ~5.8GB |
| Qwen3.5 9B | unsloth/Qwen3.5-9B-GGUF | ~50k+ | ~5.6GB |
| GLM-4 9B | tensorblock/glm-4-9b-hf-GGUF | ~50k+ | ~6.2GB |
| LFM2.5 8B A1B | LiquidAI/LFM2.5-8B-A1B-GGUF | ~50k+ | ~5.3GB |

## Total: 19 models, ~40 runs

## Changes in bench.sh (done)

1. **Group mapping**: tiny(0-3), small(4-6), medium(7-10), large(11-13), offload(14-18)
2. **NGL values flag**: Applied only for offload group (sweep: 0,10,20,32,-1)
3. **NGL in header**: `### Model - Q4_K_M - GPU (VRAM) - NGL=10`
4. **Output sections**: 1B, 2-3B, 4B, 7-8B, 9B Models
5. **Re-test LFM2.5 8B A1B**: Added to offload group (index 18)

## Time estimate

| Group | Runs | Estimated time |
|-------|------|----------------|
| tiny | 4 | ~1 hour |
| small | 3 | ~1 hour |
| medium | 4 | ~1.5 hours |
| large | 3 | ~2.5 hours |
| offload | 25 (5x5 NGL) | ~7-10 hours |
| **Total** | **~40** | **~13-16 hours** |

## Output

- Append results to BENCHMARKS.md via `--output BENCHMARKS.md`
- Each run is timestamped: `## YYYY-MM-DD HH:MM - <group>`
- Keep table format unchanged
- Include NGL in header for offload models
