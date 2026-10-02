# Demo fixture audio — NOT real PHI

This folder holds a **synthetic** therapy-style session recording for the
Hacktoberfest weekend demo only.

- Speakers are fictional; names and details are invented.
- Do **not** use with real patient audio.
- Do **not** treat this demo as clinical software.

## Files

| File | Purpose |
|------|---------|
| `sample-session.wav` | ~2+ min mono WAV (macOS `say`) used by the generate pipeline |
| `sample-session-script.txt` | Spoken script used to generate the WAV |
| `generate-fixture.sh` | Regenerates `sample-session.wav` from the script (macOS `say` + `afconvert`) |

## Path used by the API

`apps/hacktoberfest-api/fixtures/sample-session.wav`  
(resolved in code as `FIXTURE_AUDIO_PATH` in `src/config.ts`)
