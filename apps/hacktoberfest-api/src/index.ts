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
import {
  createLlmFromConfig,
  llmReadyFromConfig,
} from './providers/create-llm.js';
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
    ipHashSalt: config.ipHashSalt,
    demoAccessKey: config.demoAccessKey,
    rateLimitStore: {
      countStartsByIpHash: repo.countStartsByIpHash,
      countStartsGlobal: repo.countStartsGlobal,
    },
    tryAcquirePipeline: () => gate.tryAcquire(),
    getSessionById: (id: string) => repo.getById(id),
    readPdfBytes: (session: Parameters<typeof readSessionPdf>[0]) =>
      readSessionPdf(session),
    ...(config.clerkSecretKey
      ? {
          verifyClerkToken: createClerkTokenVerifier({
            secretKey: config.clerkSecretKey,
          }),
          upsertUserByClerkId: users.upsertByClerkId,
        }
      : {}),
  };

  if (!llmReadyFromConfig(config)) {
    return { server: createServer(deps), pool };
  }

  return {
    pool,
    server: createServer({
      ...deps,
      startDemoSession: createDemoSessionStarter({
        repo,
        stt: createGroqWhisperStt({ apiKey: config.groqApiKey! }),
        llm: createLlmFromConfig(config),
        audioPath: FIXTURE_AUDIO_PATH,
        gate,
      }),
    }),
  };
};

const { server, pool } = await buildServer();
attachSigtermHandler({ server, pool });

server.listen(config.port, () => {
  // Intentionally no PHI / paths — startup only.
  console.log(`hacktoberfest-api listening on :${config.port}`);
});
