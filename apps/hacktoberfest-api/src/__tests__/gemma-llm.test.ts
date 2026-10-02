import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_GEMMA_MODEL,
  createGemmaLlm,
  gemmaGenerateContentUrl,
  type FetchLike,
} from '../providers/gemma-llm.js';

describe('createGemmaLlm', () => {
  it('POSTs generateContent and returns model text', async () => {
    let sawUrl = '';
    let sawKey = '';

    const fetchImpl: FetchLike = async (input, init) => {
      sawUrl = String(input);
      sawKey = String(
        (init?.headers as Record<string, string>)['x-goog-api-key'] ?? '',
      );
      const body = JSON.parse(String(init?.body));
      assert.equal(body.contents[0].parts[0].text.includes('hello'), true);
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '{"subjective":"ok"}' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };

    const llm = createGemmaLlm({ apiKey: 'test-key', fetchImpl });
    const text = await llm.complete('prompt hello');

    assert.equal(text, '{"subjective":"ok"}');
    assert.equal(sawUrl, gemmaGenerateContentUrl(DEFAULT_GEMMA_MODEL));
    assert.equal(sawKey, 'test-key');
  });

  it('maps non-OK HTTP to llm_http_*', async () => {
    const llm = createGemmaLlm({
      apiKey: 'test-key',
      fetchImpl: async () => new Response('nope', { status: 403 }),
    });
    await assert.rejects(() => llm.complete('x'), /llm_http_403/);
  });

  it('rejects empty API key', () => {
    assert.throws(() => createGemmaLlm({ apiKey: ' ' }), /google_ai_api_key_missing/);
  });
});
