import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Checked-in synthetic session audio (not real PHI). */
export const FIXTURE_AUDIO_PATH = path.join(
  packageRoot,
  'fixtures',
  'sample-session.wav',
);

export type AppConfig = {
  port: number;
  publicBaseUrl: string;
  databaseUrl: string | undefined;
  groqApiKey: string | undefined;
  googleAiApiKey: string | undefined;
  gemmaModel: string | undefined;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? '3001');
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PORT must be a positive number');
  }

  return {
    port,
    publicBaseUrl: env.PUBLIC_BASE_URL ?? `http://localhost:${port}`,
    databaseUrl: env.DATABASE_URL,
    groqApiKey: env.GROQ_API_KEY,
    googleAiApiKey: env.GOOGLE_AI_API_KEY,
    gemmaModel: env.GEMMA_MODEL,
  };
}
