import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  GROQ_TRANSCRIPTIONS_URL,
  GROQ_WHISPER_MODEL,
  createGroqWhisperStt,
  type FetchLike,
} from '../providers/groq-whisper-stt.js';

describe('createGroqWhisperStt', () => {
  it('POSTs multipart audio to Groq and returns trimmed text', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'stt-'));
    const audioPath = path.join(dir, 'sample.wav');
    await writeFile(audioPath, Buffer.from('RIFF-fake-wav'));

    let sawUrl = '';
    let sawAuth = '';
    let sawModel = '';

    const fetchImpl: FetchLike = async (input, init) => {
      sawUrl = String(input);
      sawAuth = String((init?.headers as Record<string, string>).Authorization ?? '');
      const body = init?.body;
      assert.ok(body instanceof FormData);
      sawModel = String(body.get('model') ?? '');
      assert.ok(body.get('file'));
      return new Response(JSON.stringify({ text: '  hello therapist  ' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const stt = createGroqWhisperStt({
      apiKey: 'test-key',
      fetchImpl,
    });
    const text = await stt.transcribeFile(audioPath);

    assert.equal(text, 'hello therapist');
    assert.equal(sawUrl, GROQ_TRANSCRIPTIONS_URL);
    assert.equal(sawAuth, 'Bearer test-key');
    assert.equal(sawModel, GROQ_WHISPER_MODEL);
  });

  it('fails on non-OK HTTP without requiring response body details', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'stt-'));
    const audioPath = path.join(dir, 'sample.wav');
    await writeFile(audioPath, Buffer.from('x'));

    const stt = createGroqWhisperStt({
      apiKey: 'test-key',
      fetchImpl: async () => new Response('nope', { status: 401 }),
    });

    await assert.rejects(() => stt.transcribeFile(audioPath), /stt_http_401/);
  });

  it('rejects empty API key at construction', () => {
    assert.throws(() => createGroqWhisperStt({ apiKey: '   ' }), /groq_api_key_missing/);
  });
});
