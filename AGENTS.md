# AGENTS.md

## What this repo is

Local LLM benchmarking toolkit. Single Bash script (`scripts/bench.sh`) benchmarks the model loaded on a remote `llama-server` via `POST /completion` timings and outputs markdown results into `BENCHMARKS.md`. Server-only client: no local inference, no compiled app, no package manager.

## Hardware (benchmark context)

- OS: Proxmox 9, Kernel Linux 7.0.14-15-pve
- GPU: NVIDIA Tesla P40 (Pascal, compute capability 6.1, 24 GB VRAM)
- CPU: AMD Ryzen 5 3400g
- RAM: 8 GB DDR4 2400 MHz × 2 (dual-channel)

## Prerequisites (client)

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

The server must already be running with the desired model (`llama-server -m /path/to/model.gguf -c 8192 --port 8080`). Override the default server with `-s/--server URL` or `LLAMA_SERVER_URL`.

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
### <MODEL> - server - <GPU_LABEL> (<HOST:PORT>)
```

Table columns: `Test | Run | Avg Time | Tokens Processed | PP T/s | TG T/s | TTFT`

9 test names fixed (order matters): pp1024+tg16, pp4096+tg256, pp2048+tg256, pp2048+tg768, pp1024+tg1024, pp1280+tg3072, pp384+tg1152, pp64+tg1024, pp16+tg1536.

## HuggingFace CLI

`hf` (v1.23.0) available in PATH. Model download: `hf download REPO_ID`. Full reference at `.agents/skills/hf-cli/SKILL.md`.

## `scripts/bench.sh` details

- **Dependencies**: `curl`, `jq`, `awk` (`LC_ALL=C` forced in-script for `.` decimals)
- **Env overrides**: `LLAMA_SERVER_URL` (default `http://192.168.88.33:8080`), `RUNS`, `PROGRESS`
- **Flags**: `-s/--server URL`, `--model-label L` (default: `/props` model_path basename), `--gpu-label L` (default: `remote`; the API doesn't expose GPU info), `-r/--runs`, `-p/--progress`, `--test NAME` (repeatable, smoke test), `-o/--output FILE`
- **Method**: token-id array prompt of exactly `pp` tokens, `n_predict=tg`, `temperature: 0`, `cache_prompt: false`, `ignore_eos: true` (forces full-length generation); parses `.timings` (`prompt_ms`/`predicted_ms` → Avg Time/TTFT, `prompt_per_second`/`predicted_per_second` → PP/TG T/s). Raw control bytes in generated content are stripped before `jq`.
- **`-o/--output FILE`**: always appends a timestamped block. Does NOT overwrite the whole file.
- Server must be started with enough context (`-c`) for the largest test (`pp4096+tg3072`) and the desired model. Multi-model and NGL sweeps are manual (restart server per config).
- **`llama-server` binary** on the benchmark host must be compiled from source with CUDA 12.x toolkit (12.8) targeting Pascal architecture (`sm_61`). CUDA Toolkit 13.x dropped support for architectures older than sm_70. The NVIDIA `580` driver branch is the last one supporting Pascal and tops out at CUDA 13.0.

Build flags:
```bash
cmake -B build \
  -DGGML_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES="61" \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build --target llama-app -j 2
```

- Install: `cp build/bin/llama-server ~/.local/bin/llama-server`, then copy `build/bin/*.so*` to a library path (e.g. `/usr/local/lib`) and run `ldconfig`.
- Build against `ggml-org/llama.cpp` branch `b10826`: `git clone --depth 1 --branch b10826 https://github.com/ggml-org/llama.cpp`
- Do **not** run `llama update` — it replaces the CUDA build with a CPU-only binary.
- Sanity check: start the server and confirm the log reports `CUDA0: Tesla P40`, then `curl http://<host>:8080/health` responds once the model is loaded.

## `models/` directory

Gitignored (`.gitignore`). `bench.sh` no longer downloads models — it benches whatever the server has loaded. The directory remains for manually staged `.gguf` files served by `llama-server -m`.

## Commit style

Conventional commits: `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`.

## Plans

`plans/base.md` — benchmark plan (model groups, time estimates, output conventions). Consult before adding/removing models.

## References

- [llama.cpp CUDA build guide](https://github.com/ggml-org/llama.cpp/blob/master/docs/build.md#cuda)
- [cmake build](https://cmake.org/cmake/help/latest/manual/cmake.1.html#cmdoption-cmake-build-j)
- [custom git hooks](https://stackoverflow.com/questions/39332407/git-hooks-applying-git-config-core-hookspath)
- [NVIDIA Quadro/Maxwell/Pascal/Volta support plan](https://nvidia.custhelp.com/app/answers/detail/a_id/5706/~/nvidia-quadro-support-plan-for-maxwell%2C-pascal%2C-and-volta-gpus.)
