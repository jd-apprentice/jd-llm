# About

![BANNER](assets/about.png)

Repository to store all sort of experiments regarding local LLMs. Ideas are being tracked [HERE](https://github.com/jd-apprentice/jd-llm/issues/1)

## System Information

```sh
OS: Proxmox 9
Kernel: Linux 7.0.14-12-pve
CPU: AMD Ryzen 5 2600
GPU: NVIDIA Tesla P40
Memory: 8GB DDR4 2400 MHz x2
```

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
./scripts/bench.sh tiny --output BENCHMARKS.md
```

### Local Development

Dependencies:
- Shellcheck

Make sure to setup hooks with

```sh
git config --local core.hooksPath .githooks/
```

### Turing Setup

Check [issue](https://github.com/jd-apprentice/jd-llm/issues/4) for more information.

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
  -DCMAKE_CUDA_ARCHITECTURES="80-virtual" \
  -DCUDAToolkit_ROOT=/opt/cuda \
  -DCMAKE_CUDA_COMPILER=/opt/cuda/bin/nvcc \
  -DCMAKE_C_COMPILER=/usr/bin/gcc-15 \
  -DCMAKE_CXX_COMPILER=/usr/bin/g++-15
```

**Compile command:**
```bash
cmake --build build --config Release -j 4
```

The binary itself stores in `$PWD/build/bin/llama-bench` use it with `./build/bin/llama-bench`.

## Benchmarks

See [BENCHMARKS.md](BENCHMARKS.md) for native results.

## References

- [understanding tensor cores](https://www.digitalocean.com/community/tutorials/understanding-tensor-cores)
- [cmake build](https://cmake.org/cmake/help/latest/manual/cmake.1.html#cmdoption-cmake-build-j)
- [llama.cpp CUDA build guide](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#cuda)
- [custom git hooks](https://stackoverflow.com/questions/39332407/git-hooks-applying-git-config-core-hookspath)
