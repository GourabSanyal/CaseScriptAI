---
name: ai-service-update
description: Use when modifying Whisper, LLM prompts, or the audio processing pipeline.
---
# Workflow: AI Service Update
1. **Prompt Safety**: All prompt changes must be made in `src/services/ai/prompts.ts`. Never inline prompt strings in hooks.
2. **Pipeline Contract**: If modifying `use-pipeline.ts`, ensure compatibility with `src/services/audio/chunker.ts`.
3. **Tier Awareness**: Check `src/utils/device-tier.ts` to ensure the AI logic doesn't crash on lower-end devices.
4. **Evaluation**: After any change to `llm.ts` or `whisper.ts`, the AI must suggest running a command from the `eval/` directory to verify accuracy against the `golden-dataset`.

## Model Loading Rule
Never hardcode a model filename or path directly in `whisper.ts` or `llm.ts`.
Always resolve the path via `device-store.ts` which reads the tier 
set by `device-tier.ts` at onboarding.
Hardcoded model paths = wrong model loaded on wrong device tier.

## Memory Management Rule
Every call to `initWhisper()` must have a corresponding `context.release()` 
in a `finally` block. Every LLM model load must be unloaded after inference.
Never load Whisper and LLM simultaneously.
The pipeline is always: load → process → release → load next.
```typescript
// ✅ Correct
let context = null;
try {
  context = await initWhisper({ filePath: modelPath });
  const result = await context.transcribe(audioPath);
  return { success: true, data: result.text };
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  return { success: false, error: message };
} finally {
  await context?.release();
}
```