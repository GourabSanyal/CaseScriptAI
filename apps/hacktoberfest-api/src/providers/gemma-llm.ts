import type { LlmProvider } from './llm-provider.js';

export const DEFAULT_GEMMA_MODEL = 'gemma-4-26b-a4b-it';

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GemmaLlmOptions = {
  apiKey: string;
  model?: string;
  fetchImpl?: FetchLike;
};

export const gemmaGenerateContentUrl = (model: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

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

export const createGemmaLlm = (options: GemmaLlmOptions): LlmProvider => {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error('google_ai_api_key_missing');

  const model = options.model ?? DEFAULT_GEMMA_MODEL;
  const fetchImpl = options.fetchImpl ?? fetch;
  const url = gemmaGenerateContentUrl(model);

  const complete = async (prompt: string): Promise<string> => {
    const generationConfig: Record<string, unknown> = { temperature: 0.2 };
    // Gemini models support JSON mime type; Gemma often does not.
    if (model.startsWith('gemini-')) {
      generationConfig.responseMimeType = 'application/json';
    }

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
    });

    if (!response.ok) {
      // Surface status only — never echo full provider payloads (may include prompt).
      throw new Error(`llm_http_${response.status}`);
    }

    return extractText(await response.json());
  };

  return { complete };
};
