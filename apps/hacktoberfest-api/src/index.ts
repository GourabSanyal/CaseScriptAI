import { createClerkTokenVerifier } from './auth/verify-clerk-token.js';
import { createServer } from './create-server.js';
import { FIXTURE_AUDIO_PATH, loadConfig } from './config.js';
import { createPool } from './db/client.js';
import { loadEnvFile } from './db/env.js';
import { createSessionRepository } from './db/session-repository.js';
import { createUserRepository } from './db/user-repository.js';
import { createDemoSessionStarter } from './pipeline/demo-session-starter.js';
import { PipelineConcurrencyGate } from './pipeline/pipeline-concurrency.js';
import { recoverInterruptedSessions } from './pipeline/recover-interrupted.js';
import { readSessionPdf } from './pdf/run-pdf-step.js';
import { createGemmaLlm } from './providers/gemma-llm.js';
import { createGroqWhisperStt } from './providers/groq-whisper-stt.js';
import { attachSigtermHandler } from './shutdown.js';

loadEnvFile();
const config = loadConfig();

const buildServer = async () => {
  if (!config.databaseUrl) {
    return { server: createServer({ publicBaseUrl: config.publicBaseUrl }) };
  }

  const pool = createPool(config.databaseUrl);
  await recoverInterruptedSessions(pool);

  const repo = createSessionRepository(pool);
  const users = createUserRepository(pool);
  const gate = new PipelineConcurrencyGate(2);

  const deps = {
    publicBaseUrl: config.publicBaseUrl,
    getSessionById: (id: string) => repo.getById(id),
    readPdfBytes: (session: Parameters<typeof readSessionPdf>[0]) =>
      readSessionPdf(session),
    rateLimitStore: repo,
    ipHashSalt: config.ipHashSalt,
    tryAcquirePipeline: () => gate.tryAcquire(),
    releasePipeline: () => gate.release(),
    ...(config.clerkSecretKey
      ? {
          verifyClerkToken: createClerkTokenVerifier({
            secretKey: config.clerkSecretKey,
          }),
          upsertUserByClerkId: users.upsertByClerkId,
        }
      : {}),
  };

  if (!config.groqApiKey || !config.googleAiApiKey) {
    return { server: createServer(deps), pool };
  }

  return {
    pool,
    server: createServer({
      ...deps,
      startDemoSession: createDemoSessionStarter({
        repo,
        stt: createGroqWhisperStt({ apiKey: config.groqApiKey }),
        llm: createGemmaLlm({
          apiKey: config.googleAiApiKey,
          model: config.gemmaModel,
        }),
        audioPath: FIXTURE_AUDIO_PATH,
        gate,
      }),
    }),
  };
};

const { server, pool } = await buildServer();
attachSigtermHandler({ server, pool });

server.listen(config.port, () => {
  console.log(`hacktoberfest-api listening on :${config.port}`);
});
