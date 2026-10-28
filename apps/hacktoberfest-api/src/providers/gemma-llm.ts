import { isAbortError } from '../util/abort-error.js';
import type { LlmProvider } from './llm-provider.js';

/** Prefer a current Gemini Flash id — Gemma defaults often time out on free tier. */
export const DEFAULT_GEMMA_MODEL = 'gemini-3.8-flash';
export const LLM_TIMEOUT_MS = 90_000;
export const LLM_MAX_ATTEMPTS = 3;

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GemmaLlmOptions = {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
};

export const gemmaGenerateContentUrl = (model: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const extractText = (payload: unknown): string => {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('llm_invalid_response');
  }
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('llm_invalid_response');
  }
  const content = (candidates[0] as { content?: { parts?: unknown } }).content;
  const parts = content?.parts;
  if (!Array.isArray(parts)) {
    throw new Error('llm_invalid_response');
  }
  const text = parts
    .map((part) =>
      typeof part === 'object' &&
      part !== null &&
      typeof (part as { text?: unknown }).text === 'string'
        ? (part as { text: string }).text
        : '',
    )
    .join('')
    .trim();
  if (!text) throw new Error('llm_empty_response');
  return text;
};

const mapHttpError = (status: number): Error => {
  if (status === 503) return new Error('llm_unavailable');
  if (status === 429) return new Error('llm_rate_limited');
  return new Error(`llm_http_${status}`);
};

const isRetryableStatus = (status: number): boolean =>
  status === 503 || status === 429;

export const createGemmaLlm = (options: GemmaLlmOptions): LlmProvider => {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('google_ai_api_key_missing');

  const model = options.model ?? DEFAULT_GEMMA_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = gemmaGenerateContentUrl(model);
  const timeoutMs = options.timeoutMs ?? LLM_TIMEOUT_MS;
  const maxAttempts = options.maxAttempts ?? LLM_MAX_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;

  const complete = async (prompt: string): Promise<string> => {
    const generationConfig: Record<string, unknown> = { temperature: 0.2 };
    if (model.startsWith('gemini-')) {
      generationConfig.responseMimeType = 'application/json';
    }

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let response: Response;
      try {
        response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig,
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
