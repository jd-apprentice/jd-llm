# AGENTS.md

## What this repo is

Local LLM benchmarking toolkit. Single Bash script (`scripts/bench.sh`) runs `llama bench` against models and outputs markdown results into `BENCHMARKS.md`. No compiled app, no package manager.

## Lint & verify

```bash
shellcheck scripts/*.sh
```

This is the only CI check (GitHub Actions on push to `main`). Run `shellcheck` after modifying **any** script inside `scripts/` and before committing any `.sh` change.

## Pre-commit hook

`.githooks/pre-commit` runs `shellcheck` on staged `.sh` files and validates `BENCHMARKS.md` format (title, columns, test order). **Not auto-enabled** -- requires manual setup:

```bash
git config core.hooksPath .githooks
```

## BENCHMARKS.md format

Every model section must have an H3 title matching exactly:

```
### <MODEL> - <QUANTIZATION> - <GPU_NAME> (<VRAM>) - <URL>
```
For offload NGL-sweep runs the header appends `- NGL=<value>`.

Offload models header example: `### Qwen3 8B - Q4_K_M - NVIDIA GeForce GTX 1660 (6144 MiB) - NGL=10`

Table columns are fixed: `Test | Run | Avg Time | Tokens Processed | PP T/s | TG T/s | TTFT`

The 9 benchmark tests (defined in the `BENCHMARKS` array in `bench.sh`) are fixed and must appear in this fixed order: pp1024+tg16, pp4096+tg256, pp2048+tg256, pp2048+tg768, pp1024+tg1024, pp1280+tg3072, pp384+tg1152, pp64+tg1024, pp16+tg1536.

## HuggingFace CLI

`hf` is available in PATH (v1.23.0). Useful for downloading models (`hf download REPO_ID`) or managing HF cache. Full reference: `.agents/skills/hf-cli/SKILL.md`.

## bench.sh details

- Dependencies: `llama` binary in PATH, `jq`, `bc`, `nvidia-smi`
- Env vars override defaults: `LLAMA_BIN`, `RUNS`, `BATCH`, `THREADS`, `PROGRESS`
- Two modes: HF model by group name or index (`./bench.sh tiny` / `./bench.sh 0 1`) or local model (`./bench.sh -m /path/to/model.gguf`)
- Groups with their model indices: tiny(0-3), small(4-6), medium(7-10), large(11-13), offload(14-18)
- The `offload` group sweeps NGL values `0,10,20,32,-1` (5 runs per model)
- Models are defined in the `MODELS` array (lines 29-59) -- format: `hf_id|label|ngl|quant|params|size_gb`
- `-o/--output FILE` appends results to FILE and echoes to stdout (via `tee`); does NOT overwrite
- The `llama` binary must be compiled with `-DGGML_CUDA_FORCE_MMQ=ON` and `-DCMAKE_CUDA_ARCHITECTURES="75-virtual;80-virtual"` for Turing GPUs (GTX 1660). See `README.md` for full build instructions.

## Commit style

Conventional commits: `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`.

## Plans

`plans/base.md` documents the current benchmark plan (model groups, time estimates, output conventions). Consult before adding/removing models.
