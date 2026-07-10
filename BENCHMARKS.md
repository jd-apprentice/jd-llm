# Benchmarks

## System Information

```sh
OS: Arch Linux x86_64
Kernel: Linux 7.0.12-arch1-1
CPU: AMD Ryzen 5 2600 (12) @ 3.65 GHz
GPU: NVIDIA GeForce GTX 1660 [Discrete] (5754 MiB VRAM, CC 7.5 Turing, no tensor cores)
Memory: 8GB DDR4 2400 MHz x1
```

---

## Consolidated Benchmarks

**Hardware:** NVIDIA GeForce GTX 1660 (5754 MiB VRAM), compute capability 7.5 (Turing, no tensor cores)
**Build:** 259f2e2a5 (9940) | **Backend:** CUDA (ngl=-1)

> **Note:** This GPU lacks tensor cores (Turing architecture, CC 7.5). Performance is suboptimal for tensor core-optimized kernels. The flags `-DGGML_CUDA_FORCE_MMQ=ON` and `-DCMAKE_CUDA_ARCHITECTURES="75-virtual;80-virtual"` force Pascal (MMQ) kernels on Turing architecture for better performance.

| Model | Size | Params | Quant | Backend | NGL | pp512 (tok/s) | tg128 (tok/s) |
|-------|------|--------|-------|---------|-----|---------------|---------------|
| FableForge-1.5B (fableforge-ai/FableForge-1.5B:Q4_K_M) | 934.69 MiB | 1.54 B | Q4_K_M | CUDA | -1 | **714.59 ± 0.17** | **130.86 ± 0.01** |
| qwen3.5-4B-super-coder (jica98/qwen3.5-4B-super-coder:Q4_K_M) | 2.42 GiB | 4.33 B | Q4_0 | CUDA | -1 | **252.99 ± 1.00** | **51.93 ± 0.06** |
| Qwen3.5-9B-GLM5.1-Distill-v1 (Jackrong/Qwen3.5-9B-GLM5.1-Distill-v1:Q4_K_M) | 5.23 GiB | 8.95 B | Q4_K_M | CUDA | -1 | **142.52 ± 0.46** | **29.95 ± 0.01** |

**Test definitions:**
- **pp512**: Prompt processing (512 tokens) — measures prompt ingestion throughput
- **tg128**: Token generation (128 tokens) — measures token generation throughput

## Build Configuration for CUDA

Clone the repository and navigate to the `llama.cpp` directory:

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
```

**Required dependencies:**
- CMake ≥ 3.20
- CUDA Toolkit (installed at `/opt/cuda`)
- GCC/G++ 15

**Build command:**
```bash
cmake -B build \
  -DGGML_CUDA=ON \
  -DGGML_CUDA_FORCE_MMQ=ON \
  -DCMAKE_CUDA_ARCHITECTURES="75-virtual;80-virtual" \
  -DCUDAToolkit_ROOT=/opt/cuda \
  -DCMAKE_CUDA_COMPILER=/opt/cuda/bin/nvcc \
  -DCMAKE_C_COMPILER=/usr/bin/gcc-15 \
  -DCMAKE_CXX_COMPILER=/usr/bin/g++-15
```

**Compile command:**
```bash
cmake --build build --config Release -j
```
---

## References

- https://www.digitalocean.com/community/tutorials/understanding-tensor-cores
- https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#cuda
