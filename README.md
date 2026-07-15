# About

![BANNER](assets/about.png)

Repository to store all sort of experiments regarding local LLMs. Ideas are being tracked [HERE](https://github.com/jd-apprentice/jd-llm/issues/1)

## System Information

```sh
OS: Arch Linux x86_64
Kernel: Linux 7.0.12-arch1-1
CPU: AMD Ryzen 5 2600
GPU: NVIDIA GeForce GTX 1660
Memory: 8GB DDR4 2400 MHz x1
```

## Simple Setup

[localScore](https://github.com/jd-apprentice/localScore) docs are quite straightforward

```bash
chmod +x localscore-0.9.3
./localscore-0.9.3 -m path/to/model.gguf
```

To download a model I'm using huggingface, for example [LiquidAI/LFM2.5-8B-A1B-GGUF](https://huggingface.co/LiquidAI/LFM2.5-8B-A1B-GGUF) on the right there is a button that says "Use this model" and you can download it from various sources, the manual one would be go into "Files and versions" and download the `.gguf` file.

## Custom Setup (WIP)

These includes the prerequisites and build instructions for running the benchmarks with `bench.sh`.

### Prerequisites

- Git
- llama.cpp
- CUDA / ROCm
- jq
- bc

```bash
git clone https://github.com/jd-apprentice/llm-setup.git
cd llm-setup
chmod +x scripts/bench.sh
./scripts/bench.sh -r 3 > results.md
```

### Turing Setup

If you are using a Turing-based GPU (e.g. GTX 1660) which lacks tensor cores, you may encounter the following limitation:

> **Note:** This GPU lacks tensor cores (Turing architecture, CC 7.5). Performance is suboptimal for tensor core-optimized kernels. The flags `-DGGML_CUDA_FORCE_MMQ=ON` and `-DCMAKE_CUDA_ARCHITECTURES="75-virtual;80-virtual"` force Pascal (MMQ) kernels on Turing architecture for better performance.

In order to fix this, you have to compile llama.cpp from source with the flags `-DGGML_CUDA_FORCE_MMQ=ON` and `-DCMAKE_CUDA_ARCHITECTURES="75-virtual;80-virtual"` like the comment says.

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

## Benchmarks

See [BENCHMARKS.md](BENCHMARKS.md).

## References

- [Understanding Tensor Cores](https://www.digitalocean.com/community/tutorials/understanding-tensor-cores)
- [llama.cpp CUDA Build Guide](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#cuda)
- [localscore.ai - Benchmark Tool](https://localscore.ai)
- [Custom Git Hooks](https://stackoverflow.com/questions/39332407/git-hooks-applying-git-config-core-hookspath)
