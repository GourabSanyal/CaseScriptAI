import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isAbortError } from '../util/abort-error.js';
import type { SttProvider } from './stt-provider.js';

export const GROQ_TRANSCRIPTIONS_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

export const GROQ_WHISPER_MODEL = 'whisper-large-v3-turbo';
export const STT_TIMEOUT_MS = 60_000;

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

type GroqWhisperOptions = {
  apiKey: string;
  fetchImpl?: FetchLike;
  model?: string;
  timeoutMs?: number;
};

export const createGroqWhisperStt = (options: GroqWhisperOptions): SttProvider => {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new Error('groq_api_key_missing');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const model = options.model ?? GROQ_WHISPER_MODEL;
  const timeoutMs = options.timeoutMs ?? STT_TIMEOUT_MS;

  const transcribeFile = async (audioPath: string): Promise<string> => {
    const bytes = await readFile(audioPath);
    const form = new FormData();
    form.append('model', model);
    form.append('response_format', 'json');
    form.append('language', 'en');
    form.append(
      'file',
      new Blob([new Uint8Array(bytes)], { type: 'audio/wav' }),
      path.basename(audioPath),
    );

    let response: Response;
    try {
      response = await fetchImpl(GROQ_TRANSCRIPTIONS_URL, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      if (isAbortError(err)) throw new Error('stt_timeout');
      throw err;
    }

    if (!response.ok) {
      // Do not surface response body (may echo request metadata).
      throw new Error(`stt_http_${response.status}`);
    }

    const payload: unknown = await response.json();
    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('text' in payload) ||
      typeof (payload as { text: unknown }).text !== 'string'
    ) {
      throw new Error('stt_invalid_response');
    }

    const text = (payload as { text: string }).text.trim();
    if (!text) {
      throw new Error('stt_empty_transcript');
    }
    return text;
  };

  return { transcribeFile };
};
