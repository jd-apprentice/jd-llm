# Benchmark TODO List

Based on current benchmarks (FableForge-1.5B, Qwen3.5-4B-Coder, Qwen3.5-9B-GLM-Distill — all Q4_K_M/Q4_0, CUDA, NGL=-1)

---

## 🔴 High Priority (Best ROI for 6GB VRAM)

### Quantization Comparison (Same Model Family)
- [ ] **Qwen3.5-4B-Coder**: Q4_K_M vs Q5_K_M vs Q6_K vs IQ4_XS vs IQ3_XXS
  - Metrics: pp512, pp16384, tg128, tg4096, VRAM, perplexity proxy
- [ ] **Qwen3.5-9B-GLM-Distill**: Q4_K_M vs Q5_K_M vs Q6_K vs IQ4_XS
  - Target: find best quality/VRAM tradeoff for 9B on 6GB

### Partial GPU Offload (Critical for 7B+ on 6GB VRAM)
- [ ] **Qwen3.5-9B-GLM-Distill (Q4_K_M)**: NGL = 50, 35, 20, 10, 0
  - Target: find NGL where VRAM < 5.5 GB AND tg128 > 20 tok/s
  - Metrics: pp512, tg128, tg4096, VRAM, CPU%
- [ ] **Qwen3.5-4B-Coder (Q4_K_M)**: NGL = 20, 10, 0 (CPU baseline)
  - Baseline for CPU-only performance

### KV Cache Quantization + Long Context
- [ ] **Qwen3.5-9B (Q4_K_M, NGL=-1)**: KQ4_0, KQ6_0, KQ8_0
  - Metrics: pp16384, pp32768, pp65536, tg128, tg4096, VRAM at each context
- [ ] **Qwen3.5-4B-Coder (Q4_K_M, NGL=-1)**: KQ4_0, KQ6_0
  - Metrics: pp16384, pp32768, tg4096, VRAM

---

## 🟡 Medium Priority

### Flash Attention + MMQ (Turing CC 7.5)
- [ ] **Qwen3.5-9B (Q4_K_M, NGL=-1)**: Flash Attention v2 + MMQ forced
  - Build flags: `-DGGML_CUDA_FLASH_ATTN=ON -DGGML_CUDA_FORCE_MMQ=ON`
  - Metrics: pp512, pp16384, tg128, tg4096
  - Compare against current MMQ-only baseline

### Partial Offload + KV Quant Combined
- [ ] **Qwen3.5-9B (Q4_K_M)**: NGL=35 + KQ4_0
  - Target: fit 9B in <5GB VRAM with long context

### FlashInfer MHA (if buildable on Turing)
- [ ] Build llama.cpp with FlashInfer backend
- [ ] Benchmark Qwen3.5-9B (Q4_K_M) with FlashInfer MHA vs FlashAttn v2 vs MMQ

---

## 🟢 Low Priority (VRAM Limited / Future Work)

### Speculative Decoding
- [ ] Draft models: `dragonfly`, `eagle`, `medusa` draft models for Qwen
- [ ] Requires draft model + target model in VRAM (likely >6GB for 9B)

### Long Context (64k+)
- [ ] pp65536, pp131072, tg32768, tg65536
- [ ] Requires KV quant + possibly YaRN/LongRoPE scaling

### Continuous Batching / Inflight Batching
- [ ] Requires llama-server + concurrent requests benchmarking

### KV Cache Offload (CPU/Disk)
- [ ] `--cache-dir` for disk offload
- [ ] CPU KV cache offload patterns

### FlashInfer MLA (for DeepSeek/GLM models)
- [ ] Test with DeepSeek-Coder-V2, GLM-4 models when available

### CPU Backend Baseline
- [ ] CPU (AVX2) baseline for Qwen3.5-4B (Q4_K_M)
- [ ] CPU (AVX2) baseline for Qwen3.5-9B (Q4_K_M)

### Other Backends
- [ ] Vulkan backend (for comparison)
- [ ] Metal (N/A on Linux/NVIDIA)

---

## 📋 Benchmark Matrix Template

For each model+quant+config, run:

```bash
# Prompt processing benchmarks
llama-bench -m <model> -ngl <ngl> -c 512 -p 512 -n 128 -r 3 -b 1
llama-bench -m <model> -ngl <ngl> -c 16384 -p 16384 -n 128 -r 3 -b 1
llama-bench -m <model> -ngl <ngl> -c 32768 -p 32768 -n 128 -r 3 -b 1
llama-bench -m <model> -ngl <ngl> -c 65536 -p 65536 -n 128 -r 3 -b 1  # if VRAM allows

# Token generation benchmarks
llama-bench -m <model> -ngl <ngl> -c 2048 -p 512 -n 128 -r 5 -b 1
llama-bench -m <model> -ngl <ngl> -c 4096 -p 512 -n 4096 -r 3 -b 1

# With KV cache quant
llama-bench -m <model> -ngl <ngl> -c 32768 -p 32768 -n 128 -r 3 -b 1 -ctk kquants --cache-type-k q4_0 --cache-type-v q4_0
```

---

## 📝 Notes

- **GPU**: GTX 1660 (6GB VRAM, Turing CC 7.5, no tensor cores)
- **Build flags**: `-DGGML_CUDA_FORCE_MMQ=ON -DCMAKE_CUDA_ARCHITECTURES="75-virtual;80-virtual"`
- **VRAM budget**: ~5.5 GB usable (keep ~0.5GB for OS/display)
- **Target models for 6GB**: Up to ~9B Q4_K_M with full offload, up to ~14B with partial offload
- **Priority models to pull**: Qwen3.5-4B-Coder (Q4_K_M, Q5_K_M, Q6_K, IQ4_XS, IQ3_XXS), Qwen3.5-9B (Q4_K_M, Q5_K_M, IQ4_XS)
