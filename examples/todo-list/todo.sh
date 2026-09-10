#!/usr/bin/env bash
#
# Todo List CLI — powered by qwen3.6:35b-a3b
# Simple task manager stored in a plain text file.
#
# Usage:
#   ./todo.sh add "Buy groceries"
#   ./todo.sh list
#   ./todo.sh done 1
#   ./todo.sh remove 2
#   ./todo.sh clear
#

set -euo pipefail

FILE="tasks.txt"
MODEL="qwen3.6:35b-a3b"

# ── helpers ────────────────────────────────────────────────────────
die() { echo "error: $*" >&2; exit 1; }
ensure_file() { [[ -f "$FILE" ]] || touch "$FILE"; }

usage() {
  cat <<EOF
Todo List CLI — powered by qwen3.6:35b-a3b

Usage:
  $0 add <task>     Add a new task
  $0 list           Show all tasks
  $0 done <id>      Mark task as done
  $0 remove <id>    Remove a task
  $0 clear          Remove all tasks
  $0 ai <prompt>    Ask the model for help (via llama.cpp)

Commands:
  id   — sequential number shown in list
EOF
}

# ── add ────────────────────────────────────────────────────────────
do_add() {
  ensure_file
  [[ $# -eq 0 ]] && die "Usage: $0 add <task>"
  echo "- [ ] $*" >> "$FILE"
  last=$(wc -l < "$FILE")
  echo "Added task #$last ✓"
}

# ── list ───────────────────────────────────────────────────────────
do_list() {
  ensure_file
  [[ ! -s "$FILE" ]] && echo "(empty)" && return
  echo ""
  cat -n "$FILE"
  echo ""
}

# ── done (toggle) ─────────────────────────────────────────────────
do_done() {
  ensure_file
  [[ $# -eq 0 ]] && die "Usage: $0 done <id>"
  id="$1"
  line=$(sed -n "${id}p" "$FILE")
  [[ -z "$line" ]] && die "Task #$id not found"

  if echo "$line" | grep -q '\[x\]'; then
    sed -i "${id}s/- \[x\]/- [ ]/" "$FILE"
    echo "Task #$id marked as undone ✓"
  else
    sed -i "${id}s/- \[ \]/- [x]/" "$FILE"
    echo "Task #$id marked as done ✓"
  fi
}

# ── remove ─────────────────────────────────────────────────────────
do_remove() {
  ensure_file
  [[ $# -eq 0 ]] && die "Usage: $0 remove <id>"
  id="$1"
  line=$(sed -n "${id}p" "$FILE")
  [[ -z "$line" ]] && die "Task #$id not found"

  sed -i "${id}d" "$FILE"
  echo "Task #$id removed ✓"
}

# ── clear ──────────────────────────────────────────────────────────
do_clear() {
  ensure_file
  : > "$FILE"
  echo "All tasks cleared ✓"
}

# ── ai helper (calls local model) ──────────────────────────────────
do_ai() {
  [[ $# -eq 0 ]] && die "Usage: $0 ai <prompt>"
  if ! command -v llama &>/dev/null; then
    die "'llama' not found in PATH. Install llama.cpp first."
  fi
  echo "Asking ${MODEL}..."
  llama eval -m ~/.cache/huggingface/**/*.gguf --prompt "$*" 2>&1 || \
    llama run "$*" 2>&1 || echo "(model replied with no output)"
}

# ── main ───────────────────────────────────────────────────────────
cmd="${1:-list}"
shift || true

case "$cmd" in
  add)     do_add "$@" ;;
  list)    do_list ;;
  done)    do_done "$@" ;;
  remove)  do_remove "$@" ;;
  clear)   do_clear ;;
  ai)      do_ai "$@" ;;
  help|-h|--help) usage ;;
  *)       die "Unknown command: $cmd (run '$0 help')" ;;
esac
