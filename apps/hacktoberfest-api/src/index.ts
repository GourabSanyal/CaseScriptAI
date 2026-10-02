import { createServer } from './create-server.js';
import { loadConfig } from './config.js';
import { loadEnvFile } from './db/env.js';
import { createPool } from './db/client.js';
import { createSessionRepository } from './db/session-repository.js';
import { defaultPdfDir, readSessionPdf } from './pdf/run-pdf-step.js';

loadEnvFile();
const config = loadConfig();

const buildServer = () => {
  if (!config.databaseUrl) {
    return createServer();
  }

  const pool = createPool(config.databaseUrl);
  const repo = createSessionRepository(pool);
  const pdfDir = defaultPdfDir();

  return createServer({
    getSessionById: (id) => repo.getById(id),
    readPdfBytes: (session) => readSessionPdf(session, pdfDir),
  });
};

const server = buildServer();

server.listen(config.port, () => {
  // Intentionally no PHI / paths — startup only.
  console.log(`hacktoberfest-api listening on :${config.port}`);
});
