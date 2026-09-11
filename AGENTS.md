# AGENTS.md

## What this repo is

Local LLM benchmarking toolkit. Single Bash script (`scripts/bench.sh`) runs `llama bench` against models and outputs markdown results into `BENCHMARKS.md`. No compiled app, no package manager.

## Hardware (benchmark context)

- OS: Proxmox 9, Kernel Linux 7.0.14-15-pve
- GPU: NVIDIA Tesla P40 (Pascal, compute capability 6.1, 24 GB VRAM)
- CPU: AMD Ryzen 5 3400g
- RAM: 8 GB DDR4 2400 MHz × 2 (dual-channel)

## Prerequisites

- Git
- llama.cpp (built from source — see build instructions below)
- CUDA 12.x toolkit
- jq
- bc

```bash
git clone https://github.com/jd-apprentice/llm-setup.git
cd llm-setup
chmod +x scripts/bench.sh
./scripts/bench.sh tiny --output BENCHMARKS.md
```

## Lint & verify

```bash
shellcheck scripts/*.sh
```

CI (`.github/workflows/shell.yaml`) runs `ludeeus/action-shellcheck@master` on all `.sh` files on push to `main`. Run `shellcheck` after modifying any `.sh` file and before committing.

## Pre-commit hook

`.githooks/pre-commit` — runs `shellcheck` on staged `.sh` files, validates `BENCHMARKS.md` format (H3 title pattern, table columns, test order). Not auto-enabled:

```bash
git config core.hooksPath .githooks
```

## BENCHMARKS.md format

H3 title pattern:
```
### <MODEL> - <QUANTIZATION> - <GPU_NAME> (<VRAM>) - <URL>
```
Offload runs append `- NGL=<value>` (e.g. `NGL=10`).

Table columns: `Test | Run | Avg Time | Tokens Processed | PP T/s | TG T/s | TTFT`

9 test names fixed (order matters): pp1024+tg16, pp4096+tg256, pp2048+tg256, pp2048+tg768, pp1024+tg1024, pp1280+tg3072, pp384+tg1152, pp64+tg1024, pp16+tg1536.

## HuggingFace CLI

`hf` (v1.23.0) available in PATH. Model download: `hf download REPO_ID`. Full reference at `.agents/skills/hf-cli/SKILL.md`.

## `scripts/bench.sh` details

- **Dependencies**: `llama` in PATH, `jq`, `bc`, `nvidia-smi`
- **Env overrides**: `LLAMA_BIN`, `RUNS`, `BATCH`, `THREADS`, `PROGRESS`
- **Two modes**: HF model by group name or index (`./bench.sh tiny` / `./bench.sh 0 1`), or local model (`./bench.sh -m /path/to/model.gguf`)
- **Local model extras**: `--model-label LABEL`, `--model-ngl N` (default: -1 = all GPU layers)
- **Model groups**: tiny(0-3), small(4-6), medium(7-10), large(11-13), offload(14-18); see `MODELS` array (lines 30-59)
- **Offload NGL sweep**: `0,10,20,32,-1` (5 runs per model)
- **`-o/--output FILE`**: single named groups replace their existing block in-place; all other invocations append. Does NOT overwrite the whole file.
- **`llama` binary** must be compiled from source with CUDA 12.x toolkit (12.8) targeting Pascal architecture (`sm_61`). CUDA Toolkit 13.x dropped support for architectures older than sm_70. The NVIDIA `580` driver branch is the last one supporting Pascal and tops out at CUDA 13.0.

Build flags:
```bash
cmake -B build \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES="61" \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build --target llama-app -j 2
```

- Install: `cp build/bin/llama ~/.local/bin/llama`, then copy `build/bin/*.so*` to a library path (e.g. `/usr/local/lib`) and run `ldconfig`.
- Build against `ggml-org/llama.cpp` branch `b10826`: `git clone --depth 1 --branch b10826 https://github.com/ggml-org/llama.cpp`
- Do **not** run `llama update` — it replaces the CUDA build with a CPU-only binary.
- Sanity check: `llama bench --list-devices` should report `CUDA0: Tesla P40`.

## `models/` directory

Gitignored (`.gitignore`). Contains one pre-downloaded model: `Bonsai-8B-Q1_0.gguf` (index 10 in `medium` group). For HF-hosted models, `bench.sh` downloads via `llama bench -hf` automatically at runtime.

## Commit style

Conventional commits: `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`.

## Plans

`plans/base.md` — benchmark plan (model groups, time estimates, output conventions). Consult before adding/removing models.

## References

- [llama.cpp CUDA build guide](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#cuda)
- [cmake build](https://cmake.org/cmake/help/latest/manual/cmake.1.html#cmdoption-cmake-build-j)
- [custom git hooks](https://stackoverflow.com/questions/39332407/git-hooks-applying-git-config-core-hookspath)
- [NVIDIA Quadro/Maxwell/Pascal/Volta support plan](https://nvidia.custhelp.com/app/answers/detail/a_id/5706/~/nvidia-quadro-support-plan-for-maxwell%2C-pascal%2C-and-volta-gpus.)
