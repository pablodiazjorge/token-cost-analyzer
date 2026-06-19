#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Token Cost Analyzer — CLI Script
# ─────────────────────────────────────────────────────────────
# Tokenizes a prompt string from the command line using the
# tiktoken library (WASM) and prints the token count and
# distribution without needing the Angular app.
#
# Usage:
#   bash scripts/analyze-cli.sh "Your prompt text here"
#   bash scripts/analyze-cli.sh "Your prompt" --model gpt-4o
#
# Requirements:
#   - Node.js 22.14.0+
#   - npm dependencies installed (npm install)
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ANALYZE_TS="$SCRIPT_DIR/analyze.ts"
DEFAULT_MODEL="gpt-4o"

# Parse arguments
PROMPT=""
MODEL="$DEFAULT_MODEL"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --model|-m)
      MODEL="$2"
      shift 2
      ;;
    *)
      PROMPT="$1"
      shift
      ;;
  esac
done

if [ -z "$PROMPT" ]; then
  echo "Usage: bash scripts/analyze-cli.sh \"<prompt>\" [--model <model>]"
  echo ""
  echo "Available models:"
  echo "  gpt-4o, gpt-4-turbo, gpt-3.5-turbo, claude-3.5-sonnet,"
  echo "  claude-3-opus, claude-3-haiku, gemini-2.0-flash,"
  echo "  gemini-1.5-pro, llama-3.3-70b, mixtral-8x22b"
  exit 1
fi

# Ensure dependencies are installed
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  cd "$PROJECT_DIR" && npm install
fi

# Run the analyzer via tsx (TypeScript execution without compilation)
echo "Analyzing prompt with model: $MODEL"
echo "──────────────────────────────────────────────"
cd "$PROJECT_DIR" && npx tsx "$ANALYZE_TS" "$PROMPT" "$MODEL"
