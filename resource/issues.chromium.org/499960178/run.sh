#!/bin/bash
# Reproduce V8 sandbox violation via gin EPT type confusion.
# Usage: ./run.sh /path/to/chrome
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=9400

CHROME="${1:-}"
[[ -n "$CHROME" && -x "$CHROME" ]] || { echo "Usage: $0 /path/to/chrome"; exit 1; }

pkill -9 -f "remote-debugging-port=${PORT}" 2>/dev/null || true
sleep 1

PY="$(command -v python3)" || { echo "python3 not found"; exit 1; }
"$PY" -c "import websocket" 2>/dev/null || "$PY" -m pip install websocket-client -q

"$PY" "$SCRIPT_DIR/poc.py" --chrome "$CHROME" --port "$PORT"
