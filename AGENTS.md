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

Example: `### Phi 4 Mini Instruct 4.5B - Q4_K - Medium (NVIDIA GeForce GTX 1660 6GB) - https://www.localscore.ai/result/3908`

Table columns are fixed: `Test | Run | Avg Time | Tokens Processed | PP T/s | TG T/s | TTFT`

The 9 benchmark tests (defined in `BENCHMARKS` array in `bench.sh`) are fixed and must appear in this order: pp1024+tg16, pp4096+tg256, pp2048+tg256, pp2048+tg768, pp1024+tg1024, pp1280+tg3072, pp384+tg1152, pp64+tg1024, pp16+tg1536.

## HuggingFace CLI

`hf` is available in PATH (v1.23.0). Useful for downloading models for local benchmarking (`hf download`) or managing HF cache. Full reference: `.agents/skills/hf-cli/SKILL.md`.

## bench.sh details

- Dependencies: `llama` binary in PATH, `jq`, `bc`, `nvidia-smi`
- Env vars override defaults: `LLAMA_BIN`, `RUNS`, `BATCH`, `THREADS`, `PROGRESS`
- Two modes: HF model by index (`./bench.sh 0 1`) or local model (`./bench.sh -m /path/to/model.gguf`)
- Models are defined in the `MODELS` array (line 18-27) -- format: `hf_id|label|ngl|quant|params|size_gb`

## Commit style

Conventional commits: `feat(...)`, `fix(...)`, `chore(...)`, `docs(...)`.
