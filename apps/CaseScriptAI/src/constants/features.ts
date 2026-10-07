/**
 * On-device Whisper/LLM download + ExecuTorch pipeline.
 * Cloud / external-API builds keep this false — notes run via server adapters.
 * Flip true only on the historical on-device product track (`mvp_local_AI`).
 */
export const LOCAL_ON_DEVICE_AI_ENABLED = false;
