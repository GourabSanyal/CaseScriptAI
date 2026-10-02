import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPool } from '../db/client.js';
import { loadEnvFile } from '../db/env.js';
import { runMigrations } from '../db/migrate.js';
import { createSessionRepository } from '../db/session-repository.js';
import { runLlmStep } from '../pipeline/run-llm-step.js';
import { createGemmaLlm } from '../providers/gemma-llm.js';

loadEnvFile();

const liveEnabled =
  process.env.LIVE_PROVIDER_SMOKE === '1' &&
  Boolean(process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY);

describe('LLM live smoke', { skip: !liveEnabled }, () => {
  it('generates validated note_json from a synthetic transcript', async () => {
    await runMigrations();
    const pool = createPool();
    const repo = createSessionRepository(pool);
    const llm = createGemmaLlm({
      apiKey: (process.env.GOOGLE_AI_API_KEY ?? process.env.GEMINI_API_KEY)!,
      model: process.env.GEMMA_MODEL ?? process.env.GEMINI_MODEL,
    });

    try {
      const created = await repo.createSession();
      await repo.updateStatus(created.id, 'stt_running');
      await repo.updateStatus(created.id, 'llm_running', {
        transcript:
          'Therapist asked about sleep. Client reported waking at 3am with work thoughts. Agreed to phone-free hour and breathing three nights.',
      });

      const result = await runLlmStep({
        repo,
        llm,
        sessionId: created.id,
      });

      assert.equal(
        result.status,
        'pdf_running',
        `expected pdf_running, got ${result.status}` +
          (result.error ? ` error=${result.error}` : ''),
      );
      assert.ok(result.noteJson);
      assert.equal(typeof (result.noteJson as { subjective: string }).subjective, 'string');
    } finally {
      await pool.end();
    }
  });
});
