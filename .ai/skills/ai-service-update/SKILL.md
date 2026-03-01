---
name: ai-service-update
description: Use when modifying Whisper, LLM prompts, or the audio processing pipeline.
---
# Workflow: AI Service Update
1. **Prompt Safety**: All prompt changes must be made in `src/services/ai/prompts.ts`. Never inline prompt strings in hooks.
2. **Pipeline Contract**: If modifying `use-pipeline.ts`, ensure compatibility with `src/services/audio/chunker.ts`.
3. **Tier Awareness**: Check `src/utils/device-tier.ts` to ensure the AI logic doesn't crash on lower-end devices.
4. **Evaluation**: After any change to `llm.ts` or `whisper.ts`, the AI must suggest running a command from the `eval/` directory to verify accuracy against the `golden-dataset`.