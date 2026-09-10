# Todo List CLI

Simple task manager built in Bash — **powered by qwen3.6:35b-a3b**.

## Why this model?

qwen3.6:35b-a3b is a 35-billion-parameter open-weight language model from the Qwen family. Its strong reasoning, code generation, and instruction-following capabilities make it ideal for local AI tasks like generating task descriptions, suggesting priorities, or answering project-related questions — all running locally on your machine with no API calls needed.

### Hardware context
- GPU: NVIDIA Tesla P40

The model runs via [Ollama](https://ollama.com/) and is accessed over its local API (`http://localhost:11434`).

## Quick start

```bash
# Add a task
./todo.sh add "Buy groceries"
./todo.sh add "Read chapter 5 of the docs"

# List tasks
./todo.sh list

# Mark as done
./todo.sh done 1

# Remove a task
./todo.sh remove 2

# Ask the model for help
./todo.sh ai "Suggest a weekly workout plan"

# Clear everything
./todo.sh clear

# Help
./todo.sh help
```

## Tasks storage

Tasks are stored in `tasks.txt` (a plain text file with checkboxes):

```
- [ ] Buy groceries
- [x] Read chapter 5
```

## Commands

| Command | Description |
|---------|-------------|
| `add <task>` | Add a new task |
| `list` | Show all tasks with numbers |
| `done <id>` | Toggle done/undone on a task |
| `remove <id>` | Remove a task by number |
| `clear` | Clear all tasks |
| `ai <prompt>` | Ask qwen3.6:35b-a3b via Ollama |

## Prerequisites

- [Ollama](https://ollama.com/) with model pulled (`ollama pull qwen3.6:35b-a3b`)
- Bash 4+ (Linux / macOS / WSL)

- [llama.cpp](https://github.com/ggerganov/llama/cpp) (`llama` in PATH for AI features)
- Bash 4+ (Linux / macOS / WSL)
