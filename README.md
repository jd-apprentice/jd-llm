# About

![BANNER](assets/about.png)

Repository to store all sort of experiments regarding local LLMs. Ideas are being tracked [HERE](https://github.com/jd-apprentice/jd-llm/issues/1)

## System Information

```sh
OS: Proxmox 9
Kernel: Linux 7.0.14-15-pve
CPU: AMD Ryzen 5 3400g
GPU: NVIDIA Tesla P40
Memory: 8GB DDR4 2400 MHz x2
```

## Custom Setup

`bench.sh` is a server-only client: it benchmarks whatever model is loaded on a remote `llama-server` via `POST /completion` timings. No local inference needed.

### Prerequisites (client)

- Git
- curl
- jq
- awk

```bash
git clone https://github.com/jd-apprentice/llm-setup.git
cd llm-setup
chmod +x scripts/bench.sh
./scripts/bench.sh --server http://192.168.88.33:8080 --gpu-label "Tesla P40" --output BENCHMARKS.md
```

The server must already be running with the desired model:

```bash
llama-server -m /path/to/model.gguf -c 8192 --port 8080
```

### Local Development

Dependencies:
- Shellcheck

Make sure to setup hooks with

```sh
git config --local core.hooksPath .githooks/
```

### Server setup (Pascal)

The benchmark host serves models with `llama-server`, and its Tesla P40 is a Pascal GPU (compute capability 6.1), so llama.cpp must be compiled from source with CUDA support for that architecture.

Relevant constraints:

- The NVIDIA `580` driver branch is the **last** one supporting Pascal and tops out at CUDA 13.0.
- CUDA Toolkit **13.x dropped support for architectures older than sm_70**, so the build must use a CUDA 12.x toolkit (12.8 in this setup). The 580 driver runs CUDA 12.x applications without issues.
- The `llama.app` Linux installer only provides CUDA builds compiled against the newest CUDA release, whose minimum driver the `580` branch cannot satisfy. Its probe silently falls back to a CPU-only binary (no CUDA devices visible) — another reason to build from source.

```bash
git clone --depth 1 --branch b10826 https://github.com/ggml-org/llama.cpp
cd llama.cpp
cmake -B build \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES="61" \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build --target llama-app -j 2
```

Notes:

- The build produces `llama-server` (`build/bin/llama-server`). Install it into your PATH with `cp build/bin/llama-server ~/.local/bin/llama-server`, and copy the shared libraries (`build/bin/*.so*`) into a library path such as `/usr/local/lib` followed by `ldconfig`.
- Do **not** run `llama update`: `llama.app` would replace the CUDA build with its CPU-only binary again.
- Sanity check that the GPU is visible: start the server and confirm the log reports `CUDA0: Tesla P40`, then `curl http://<host>:8080/health` responds once the model is loaded.
- Keep `CMAKE_CUDA_ARCHITECTURES="61"` and a CUDA 12.x toolkit when rebuilding with newer llama.cpp releases.
- `-j 2` avoids OOM during the CUDA compilation on hosts with 4 GB of RAM.

## Benchmarks

See [BENCHMARKS.md](BENCHMARKS.md) for results.

## Examples

See [examples/](examples/) for projects generated with the local models:

- [veterinary-web](examples/veterinary-web/) — live at [local-llm-example-1.jonathan.com.ar](https://local-llm-example-1.jonathan.com.ar)
- [retro-games](examples/retro-games/) — live at [local-llm-example-2.jonathan.com.ar](https://local-llm-example-2.jonathan.com.ar)

## References

- [llama.cpp CUDA build guide](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#cuda)
- [cmake build](https://cmake.org/cmake/help/latest/manual/cmake.1.html#cmdoption-cmake-build-j)
- [custom git hooks](https://stackoverflow.com/questions/39332407/git-hooks-applying-git-config-core-hookspath)
- [NVIDIA Quadro/Maxwell/Pascal/Volta support plan](https://nvidia.custhelp.com/app/answers/detail/a_id/5706/~/nvidia-quadro-support-plan-for-maxwell%2C-pascal%2C-and-volta-gpus.)
