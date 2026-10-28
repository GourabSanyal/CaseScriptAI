import type { AppConfig } from '../config.js';
import { createGemmaLlm } from './gemma-llm.js';
import { createGroqLlm, DEFAULT_GROQ_LLM_MODEL } from './groq-llm.js';
import type { LlmProvider } from './llm-provider.js';
import type { LlmProviderName } from './llm-provider-name.js';

export type { LlmProviderName } from './llm-provider-name.js';
export { parseLlmProvider } from './llm-provider-name.js';

/** Build LLM from env — switch with LLM_PROVIDER=groq|google. */
export const createLlmFromConfig = (config: AppConfig): LlmProvider => {
  const timeoutMs = config.llmTimeoutMs;

  if (config.llmProvider === 'google') {
    const apiKey = config.googleAiApiKey?.trim();
    if (!apiKey) throw new Error('google_ai_api_key_missing');
    return createGemmaLlm({
      apiKey,
      model: config.llmModel ?? config.gemmaModel,
      timeoutMs,
    });
  }

  const apiKey = config.groqApiKey?.trim();
  if (!apiKey) throw new Error('groq_api_key_missing');
  return createGroqLlm({
    apiKey,
    model: config.llmModel ?? DEFAULT_GROQ_LLM_MODEL,
    timeoutMs,
  });
};

export const llmReadyFromConfig = (config: AppConfig): boolean => {
  if (!config.groqApiKey?.trim()) return false;
  if (config.llmProvider === 'google') {
    return Boolean(config.googleAiApiKey?.trim());
  }
  return true;
};
