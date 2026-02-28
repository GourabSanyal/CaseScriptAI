# Golden Dataset

This directory contains ground-truth audio + transcript + summary pairs used
to evaluate the CaseScriptAI AI pipeline (Whisper + LLM).

## Directory layout

```
golden-dataset/
  case-NNN/
    audio.wav                    # raw mono 16 kHz WAV, ≤ 15 min
    transcript-ground-truth.txt  # verbatim transcript (UTF-8)
    summary-ground-truth.json    # structured summary matching Session schema
```

## How to add a new case

1. Record or prepare a de-identified audio clip (WAV, mono, 16 kHz).
2. Create `case-NNN/` where NNN is zero-padded (e.g. `case-002`).
3. Place `audio.wav` inside the folder.
4. Write `transcript-ground-truth.txt` — exact verbatim transcript.
5. Write `summary-ground-truth.json` using the schema in
   `src/types/session.ts`.
6. Run `yarn eval` to get WER / MTER scores and commit the results log.

## Limits

- Maximum 30 cases in the initial dataset.
- Audio must be de-identified before committing (no real patient data).
