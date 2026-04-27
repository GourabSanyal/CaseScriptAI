# Test Case Placement Map

Use this map to know exactly where to write each function's tests.

## Unit

- `resampleAudio`, `parseWavData` -> `tests/unit/services/audio/wav-parser.test.ts`
- `convertToWav` -> `tests/unit/services/audio/audio-processor.test.ts`
- `ensureCaseDirectory`, `copyToDocuments`, `resolveAudioUri`, `deleteAudioFile` -> `tests/unit/services/audio/audio-storage.test.ts`
- `encryptFile`, `decryptFile` -> `tests/unit/services/audio/crypto-service.test.ts`
- `getModelPath`, `checkModelExists` -> `tests/unit/services/ai/model-utils.test.ts`
- `initializeExecutorch`, `createLLMService().generate` -> `tests/unit/services/ai/llm-inference.test.ts`
- `initWhisperModel`, `transcribeAudio`, `releaseWhisper` -> `tests/unit/services/ai/whisper-inference.test.ts`
- `SOAP_NOTE_PROMPT` -> `tests/unit/services/ai/prompts.test.ts`
- `generatePDF` -> `tests/unit/services/pdf/generator.test.ts`
- `waitForCondition` -> `tests/unit/utils/async-utils.test.ts`
- `usePocStore` actions -> `tests/unit/stores/poc-store.test.ts`

## Integration

- `useLLMInference` flow -> `tests/integration/hooks/use-llm-inference.test.ts`
- `useSpeechToTextInference` flow -> `tests/integration/hooks/use-speech-to-text.test.ts`
- `useAudio` flow -> `tests/integration/hooks/use-audio.test.ts`
- `PipelineSection` flow -> `tests/integration/pipeline/pipeline-section.test.tsx`

## E2E

- App launch + POC navigation -> `e2e/smoke/app-launch.e2e.ts`
- Full pipeline happy/failure flows -> `e2e/pipeline/pipeline-run.e2e.ts`
