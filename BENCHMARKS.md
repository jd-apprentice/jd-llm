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

> **Note:** This GPU lacks tensor cores (Turing architecture, CC 7.5). Performance is suboptimal for tensor core-optimized kernels. The flags `-DGGML_CUDA_FORCE_MMQ=ON` and `-DCMAKE_CUDA_ARCHITECTURES="75-virtual;80-virtual"` force Pascal (MMQ) kernels on Turing architecture for better performance.

---

## Model Family Comparison (Q4_K_M / Q4_0, CUDA, NGL=-1)

| Model Family | Params | Quant | Size | pp512 | pp16k | pp32k | tg128 | tg4k | VRAM |
|--------------|--------|-------|------|-------|-------|-------|-------|------|------|
| **FableForge** | 1.5B | Q4_K_M | 0.9 GB | **715** | **313** | **199** | **131** | **122** | ~1.0 GB |
| **Qwen3.5-Coder** | 4.3B | Q4_0 | 2.4 GB | 253 | 198 | 163 | 52 | 50 | ~2.5 GB |
| **Qwen3.5-GLM-Distill** | 9.0B | Q4_K_M | 5.2 GB | 142 | — | — | 30 | 29 | ~5.3 GB |

*All: CUDA, NGL=-1 (full offload), MMQ forced on Turing (CC 7.5), avg of 3 runs*

---

## Detailed Benchmarks

### FableForge-1.5B (fableforge-ai/FableForge-1.5B:Q4_K_M)

| Metric | pp512 | pp16k | pp32k | tg128 | tg4k |
|--------|-------|-------|-------|-------|------|
| **tok/s** | 714.6 ± 0.2 | 313.3 | 198.9 | 130.7 ± 0.0 | 121.8 ± 0.1 |
| **Config** | CUDA, NGL=-1, MMQ forced | | | | |

---

### Qwen3.5-4B-Coder (jica98/qwen3.5-4B-super-coder:Q4_0)

| Metric | pp512 | pp16k | pp32k | tg128 | tg4k |
|--------|-------|-------|-------|-------|------|
| **tok/s** | 253.3 ± 0.5 | 198.4 | 163.2 | 51.9 ± 0.0 | 50.3 |
| **Config** | CUDA, NGL=-1, MMQ forced | | | | |

---

### Qwen3.5-9B-GLM5.1-Distill-v1 (Jackrong/Qwen3.5-9B-GLM5.1-Distill-v1:Q4_K_M)

| Metric | pp512 | pp16k | pp32k | tg128 | tg4k |
|--------|-------|-------|-------|-------|------|
| **tok/s** | 141.9 ± 0.5 | — | — | 29.9 ± 0.0 | 29.4 |
| **Config** | CUDA, NGL=-1, MMQ forced | | | | |

---

## Test Definitions

| Test | Description | Purpose |
|------|-------------|---------|
| **pp512** | Prompt processing (512 tokens) | Prompt ingestion throughput (short context) |
| **pp16k** | Prompt processing (16,384 tokens) | Long-context prompt ingestion throughput |
| **pp32k** | Prompt processing (32,768 tokens) | Very long-context prompt ingestion throughput |
| **tg128** | Token generation (128 tokens) | Token generation throughput (short) |
| **tg4k** | Token generation (4,096 tokens) | Sustained token generation throughput |

---

## References

- [Understanding Tensor Cores](https://www.digitalocean.com/community/tutorials/understanding-tensor-cores)
- [llama.cpp CUDA Build Guide](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#cuda)