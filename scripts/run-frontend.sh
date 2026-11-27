#!/usr/bin/env bash
set -e

export PATH="$HOME/.local/bin:$PATH"

echo "=== INICIANDO BOMBERMAN REACT FRONTEND ==="
cd "$(dirname "$0")/../frontend"
npm run dev
