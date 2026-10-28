import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { AppConfig } from '../config.js';
import {
  createLlmFromConfig,
  llmReadyFromConfig,
  parseLlmProvider,
} from '../providers/create-llm.js';

const baseConfig = (over: Partial<AppConfig> = {}): AppConfig => ({
  port: 3001,
  publicBaseUrl: 'http://localhost:3001',
  databaseUrl: undefined,
  groqApiKey: 'groq-key',
  googleAiApiKey: 'google-key',
  gemmaModel: undefined,
  clerkSecretKey: undefined,
  ipHashSalt: 'salt',
  llmTimeoutMs: undefined,
  llmProvider: 'groq',
  llmModel: undefined,
  ...over,
});

describe('parseLlmProvider', () => {
  it('defaults to groq; accepts google aliases', () => {
    assert.equal(parseLlmProvider(undefined), 'groq');
    assert.equal(parseLlmProvider('groq'), 'groq');
    assert.equal(parseLlmProvider('GOOGLE'), 'google');
    assert.equal(parseLlmProvider('gemini'), 'google');
  });
});

describe('llmReadyFromConfig', () => {
  it('groq only needs GROQ_API_KEY', () => {
    assert.equal(
      llmReadyFromConfig(
        baseConfig({ llmProvider: 'groq', googleAiApiKey: undefined }),
      ),
      true,
    );
    assert.equal(
      llmReadyFromConfig(baseConfig({ llmProvider: 'groq', groqApiKey: '' })),
      false,
    );
  });

  it('google needs both groq (STT) and google keys', () => {
    assert.equal(
      llmReadyFromConfig(baseConfig({ llmProvider: 'google' })),
      true,
    );
    assert.equal(
      llmReadyFromConfig(
        baseConfig({ llmProvider: 'google', googleAiApiKey: undefined }),
      ),
      false,
    );
  });
});

describe('createLlmFromConfig', () => {
  it('requires google key for google provider', () => {
    assert.throws(
      () =>
        createLlmFromConfig(
          baseConfig({ llmProvider: 'google', googleAiApiKey: undefined }),
        ),
      /google_ai_api_key_missing/,
    );
  });

  it('returns a complete() function for groq', () => {
    const llm = createLlmFromConfig(baseConfig({ llmProvider: 'groq' }));
    assert.equal(typeof llm.complete, 'function');
  });
});
