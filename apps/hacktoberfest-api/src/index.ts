import { createServer } from './create-server.js';
import { FIXTURE_AUDIO_PATH, loadConfig } from './config.js';
import { createPool } from './db/client.js';
import { loadEnvFile } from './db/env.js';
import { createSessionRepository } from './db/session-repository.js';
import { createDemoSessionStarter } from './pipeline/demo-session-starter.js';
import { defaultPdfDir, readSessionPdf } from './pdf/run-pdf-step.js';
import { createGemmaLlm } from './providers/gemma-llm.js';
import { createGroqWhisperStt } from './providers/groq-whisper-stt.js';

loadEnvFile();
const config = loadConfig();

const buildServer = () => {
  if (!config.databaseUrl) {
    return createServer({ publicBaseUrl: config.publicBaseUrl });
  }

  const pool = createPool(config.databaseUrl);
  const repo = createSessionRepository(pool);
  const pdfDir = defaultPdfDir();

  const deps = {
    publicBaseUrl: config.publicBaseUrl,
    getSessionById: (id: string) => repo.getById(id),
    readPdfBytes: (session: Parameters<typeof readSessionPdf>[0]) =>
      readSessionPdf(session, pdfDir),
  };

  if (!config.groqApiKey || !config.googleAiApiKey) {
    return createServer(deps);
  }

  return createServer({
    ...deps,
    startDemoSession: createDemoSessionStarter({
      repo,
      stt: createGroqWhisperStt({ apiKey: config.groqApiKey }),
      llm: createGemmaLlm({
        apiKey: config.googleAiApiKey,
        model: config.gemmaModel,
      }),
      audioPath: FIXTURE_AUDIO_PATH,
      pdfDir,
    }),
  });
};

const server = buildServer();

server.listen(config.port, () => {
  // Intentionally no PHI / paths — startup only.
  console.log(`hacktoberfest-api listening on :${config.port}`);
});
