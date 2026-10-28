import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_GROQ_LLM_MODEL,
  GROQ_CHAT_URL,
  createGroqLlm,
  type FetchLike,
} from '../providers/groq-llm.js';

describe('createGroqLlm', () => {
  it('POSTs chat completions and returns content', async () => {
    let sawUrl = '';
    let sawAuth = '';
    let sawModel = '';

    const fetchImpl: FetchLike = async (input, init) => {
      sawUrl = String(input);
      sawAuth = String(
        (init?.headers as Record<string, string>).Authorization ?? '',
      );
      const body = JSON.parse(String(init?.body));
      sawModel = body.model;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"subjective":"ok"}' } }],
        }),
        { status: 200 },
      );
    };

    const llm = createGroqLlm({ apiKey: 'g-key', fetchImpl });
    assert.equal(await llm.complete('hello'), '{"subjective":"ok"}');
    assert.equal(sawUrl, GROQ_CHAT_URL);
    assert.equal(sawAuth, 'Bearer g-key');
    assert.equal(sawModel, DEFAULT_GROQ_LLM_MODEL);
  });

  it('retries 503 then succeeds', async () => {
    let calls = 0;
    const llm = createGroqLlm({
      apiKey: 'g-key',
      maxAttempts: 3,
      sleep: async () => undefined,
      fetchImpl: async () => {
        calls += 1;
        if (calls < 2) return new Response('busy', { status: 503 });
        return new Response(
          JSON.stringify({ choices: [{ message: { content: 'done' } }] }),
          { status: 200 },
        );
      },
    });
    assert.equal(await llm.complete('x'), 'done');
    assert.equal(calls, 2);
  });

  it('maps exhausted 503 to llm_unavailable', async () => {
    const llm = createGroqLlm({
      apiKey: 'g-key',
      maxAttempts: 2,
      sleep: async () => undefined,
      fetchImpl: async () => new Response('busy', { status: 503 }),
    });
    await assert.rejects(() => llm.complete('x'), /llm_unavailable/);
  });
});
