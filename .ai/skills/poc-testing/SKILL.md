---
name: poc-testing
description: >
  Use during POC validation phase. Governs all work in poc.tsx and 
  native module testing. Must be completed and all 4 tests passing 
  before any product feature work begins.
---

# Workflow: POC Testing

## ⚠️ Rules For This Phase
- All POC code lives exclusively in `src/app/poc.tsx`
- No logic from poc.tsx is ever imported into product code
- No product screens or services are built until all 4 tests pass
- poc.tsx will be deleted entirely before V1 development begins

---

## Test Sequence (Strict Order — Do Not Change)
The POC screen tests 7 things sequentially. The first 4 are 
the mandatory kill-switch tests. Tests 5–7 are pipeline validation 
and only run after the first 4 pass.

### 1️⃣ Whisper Loads
Install: `npm install whisper.rn`
Goal: confirm the model initializes without crash.
```typescript
import * as FileSystem from 'expo-file-system';
import { initWhisper } from 'whisper.rn';

const modelPath = FileSystem.documentDirectory + 'ggml-base.bin';
// Download model to modelPath first, then:
const context = await initWhisper({ filePath: modelPath });
console.log('Whisper loaded:', !!context);
```

Pass condition: no crash, context is not null, loads under 40 seconds.
Fail condition: crash on init, model not found, load > 40s → reduce to tiny model.

---

### 2️⃣ Whisper Memory Stability
Goal: confirm RAM returns to baseline after release. If it doesn't, 
the chunking architecture must be redesigned before proceeding.
```typescript
for (let i = 0; i < 3; i++) {
  let context = null;
  try {
    context = await initWhisper({ filePath: modelPath });
    await context.transcribe(audioPath);
  } finally {
    await context?.release();
    await new Promise(res => setTimeout(res, 500)); // allow GC
  }
}
```

Pass condition: RAM returns near baseline after each cycle. 
No steady upward growth across 3 runs.
Fail condition: RAM grows each cycle → stop everything, redesign before V1.

---

### 3️⃣ ffmpeg Conversion
Install: `npx expo install ffmpeg-kit-react-native && npx expo prebuild`
⚠️ Does not work in Expo Go. Requires a native build via EAS.
Goal: confirm audio converts to Whisper-compatible format.
```typescript
import { FFmpegKit } from 'ffmpeg-kit-react-native';

await FFmpegKit.execute(
  '-i input.m4a -ar 16000 -ac 1 -c:a pcm_s16le output.wav'
);
```

Pass condition: output.wav exists, is 16kHz mono, duration matches input, plays correctly.
Fail condition: output missing, duration mismatch, file unplayable → pin ffmpeg-kit 
to a specific known-working version.

---

### 4️⃣ Chunking Logic
Goal: confirm chunk generation produces valid, non-overlapping slices 
with no tiny broken last chunk.
```typescript
export const generateChunks = (
  duration: number,
  chunkSize = 60,
  overlap = 15
): Array<{ start: number; end: number }> => {
  const chunks = [];
  let start = 0;
  while (start < duration) {
    const end = Math.min(start + chunkSize, duration);
    if (end - start < 10) break; // discard tiny last chunk
    chunks.push({ start, end });
    start += chunkSize - overlap;
  }
  return chunks;
};

// Test: generateChunks(180) should produce:
// [{ 0, 60 }, { 45, 105 }, { 90, 150 }, { 135, 180 }]
console.log(generateChunks(180));
```

Pass condition: output matches expected array, no chunk shorter than 10s, 
sequential transcription of all chunks completes without crash.

### 5️⃣ Run LLM (Phi-3 / Mistral)
Goal: confirm llama.rn loads and produces structured output from 
a dummy transcript. Run only after Whisper memory stability is confirmed.

Pass condition: model loads, returns structured markdown summary, 
no crash, RAM stable after release.
Fail condition: model fails to load, output is garbage/hallucinated, 
RAM grows → reduce quantization level.

---

### 6️⃣ Generate PDF
Goal: confirm the PDF library produces a valid, openable file 
from hardcoded markdown input.

Pass condition: file exists on device, opens correctly, layout clean, 
file size reasonable (under 500KB for a simple summary).
Fail condition: file missing, corrupted, won't open → check PDF library 
compatibility with your Expo SDK version.

---

### 7️⃣ View Encrypted File
Goal: confirm AES-256 encryption writes a file that is unreadable 
outside the app and decrypts correctly within it.

Pass condition: encrypted file is unreadable in Files app / ADB pull, 
decryption restores original content correctly, wrong key fails cleanly.
Fail condition: file readable in plaintext outside app → encryption 
is not wired correctly, do not proceed to V1 without fixing this.

---

## Red Flags — Stop And Reassess If You See These
- RAM keeps increasing after `context.release()` across multiple runs
- 5 min audio takes longer than 10–12 min to transcribe
- Model load consistently takes longer than 40 seconds
- Device overheating significantly during transcription
- ffmpeg output file is missing or has wrong duration

If any red flag appears → do not proceed to product code. 
Reduce model size or investigate before continuing.

---

## Sign-Off Checklist
All 7 must be ✅ before poc.tsx is deleted and V1 begins.
Tests 1–4 are blockers. Tests 5–7 failing means redesign before V1, 
not just a warning.

| # | Test | Pass Condition | Status |
|---|------|---------------|--------|
| 1 | Whisper loads | No crash, context not null | ⬜ |
| 2 | Memory stability | RAM stable across 3 runs | ⬜ |
| 3 | ffmpeg conversion | Valid 16kHz mono WAV output | ⬜ |
| 4 | Chunking logic | Correct chunks, no crash | ⬜ |
| 5 | LLM runs | Structured output, RAM stable | ⬜ |
| 6 | PDF generation | Valid file, opens correctly | ⬜ |
| 7 | Encrypted file | Unreadable outside app | ⬜ |
```

---

## 6. `.gitignore` — Add These Lines

Add to your root `.gitignore`:
```
# Eval results — local only, never commit
eval/results/

# Large audio files in golden dataset — manage manually
eval/golden-dataset/**/*.wav
eval/golden-dataset/**/*.mp3
eval/golden-dataset/**/*.m4a