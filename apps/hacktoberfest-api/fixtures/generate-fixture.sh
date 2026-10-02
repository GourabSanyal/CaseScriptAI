#!/usr/bin/env bash
# Regenerates fixtures/sample-session.wav from the synthetic script.
# Requires macOS `say` and `afconvert`. Output is demo data only — not PHI.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="$ROOT/sample-session-script.txt"
AIFF="$ROOT/sample-session.aiff"
WAV="$ROOT/sample-session.wav"

say -v Samantha -f "$SCRIPT" -o "$AIFF"
afconvert -f WAVE -d LEI16 "$AIFF" "$WAV"
rm -f "$AIFF"

# Duration hint for humans (seconds)
python3 - <<'PY' "$WAV"
import wave, sys
with wave.open(sys.argv[1], "rb") as w:
    seconds = w.getnframes() / float(w.getframerate())
print(f"Wrote {sys.argv[1]} (~{seconds:.0f}s)")
PY
