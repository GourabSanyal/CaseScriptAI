import { isAbortError } from '../util/abort-error.js';
import type { LlmProvider } from './llm-provider.js';

export const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
/** Free/dev replacement after llama-3.1-8b-instant shutdown (Aug 2026). */
export const DEFAULT_GROQ_LLM_MODEL = 'openai/gpt-oss-20b';
export const GROQ_LLM_TIMEOUT_MS = 90_000;
export const GROQ_LLM_MAX_ATTEMPTS = 3;

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GroqLlmOptions = {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const extractText = (payload: unknown): string => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('llm_invalid_response');
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('llm_invalid_response');
  }
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  const content = message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('llm_empty_response');
  }
  return content.trim();
};

const mapHttpError = (status: number): Error => {
  if (status === 503) return new Error('llm_unavailable');
  if (status === 429) return new Error('llm_rate_limited');
  return new Error(`llm_http_${status}`);
};

const isRetryableStatus = (status: number): boolean =>
  status === 503 || status === 429;

export const createGroqLlm = (options: GroqLlmOptions): LlmProvider => {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('groq_api_key_missing');

  const model = options.model ?? DEFAULT_GROQ_LLM_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? GROQ_LLM_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? GROQ_LLM_MAX_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;

  const complete = async (prompt: string): Promise<string> => {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response: Response;
      try {
        response = await fetchImpl(GROQ_CHAT_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        if (isAbortError(err)) {
          lastError = new Error('llm_timeout');
          if (attempt < maxAttempts) {
            await sleep(1_500 * attempt);
            continue;
          }
          throw lastError;
        }
        throw err;
      }

      if (response.ok) {
        return extractText(await response.json());
      }

      lastError = mapHttpError(response.status);
      if (isRetryableStatus(response.status) && attempt < maxAttempts) {
        await sleep(1_500 * attempt);
        continue;
      }
      throw lastError;
    }

    throw lastError ?? new Error('llm_failed');
  };

  return { complete };
};
