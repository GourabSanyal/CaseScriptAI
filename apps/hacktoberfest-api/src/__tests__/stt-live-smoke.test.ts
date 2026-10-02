import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FIXTURE_AUDIO_PATH } from '../config.js';
import { createPool } from '../db/client.js';
import { loadEnvFile } from '../db/env.js';
import { runMigrations } from '../db/migrate.js';
import { createSessionRepository } from '../db/session-repository.js';
import { runSttStep } from '../pipeline/run-stt-step.js';
import { createGroqWhisperStt } from '../providers/groq-whisper-stt.js';

loadEnvFile();

const liveEnabled =
  process.env.LIVE_PROVIDER_SMOKE === '1' && Boolean(process.env.GROQ_API_KEY);

describe('STT live smoke', { skip: !liveEnabled }, () => {
  it('transcribes fixture and stores non-empty transcript on session', async () => {
    await runMigrations();
    const pool = createPool();
    const repo = createSessionRepository(pool);
    const stt = createGroqWhisperStt({ apiKey: process.env.GROQ_API_KEY! });

    try {
      const session = await repo.createSession();
      const result = await runSttStep({
        repo,
        stt,
        sessionId: session.id,
        audioPath: FIXTURE_AUDIO_PATH,
      });

      assert.equal(result.status, 'llm_running');
      assert.ok(result.transcript && result.transcript.trim().length > 0);
    } finally {
      await pool.end();
    }
  });
});
