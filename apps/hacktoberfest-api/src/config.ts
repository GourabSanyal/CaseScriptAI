import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseLlmProvider,
  type LlmProviderName,
} from './providers/llm-provider-name.js';

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
  clerkSecretKey: string | undefined;
  ipHashSalt: string;
  llmTimeoutMs: number | undefined;
  /** Switch note LLM: groq (default) | google */
  llmProvider: LlmProviderName;
  /** Optional model id for the selected provider */
  llmModel: string | undefined;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const port = Number(env.PORT ?? '3001');
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error('PORT must be a positive number');
  }

  const llmTimeoutRaw = env.LLM_TIMEOUT_MS;
  const llmTimeoutMs = llmTimeoutRaw ? Number(llmTimeoutRaw) : undefined;
  if (
    llmTimeoutMs !== undefined &&
    (!Number.isFinite(llmTimeoutMs) || llmTimeoutMs < 5_000)
  ) {
    throw new Error('LLM_TIMEOUT_MS must be a number >= 5000');
  }

  return {
    port,
    publicBaseUrl: env.PUBLIC_BASE_URL ?? `http://localhost:${port}`,
    databaseUrl: env.DATABASE_URL,
    groqApiKey: env.GROQ_API_KEY,
    // Google AI Studio often labels these GEMINI_*; both names accepted.
    googleAiApiKey: env.GOOGLE_AI_API_KEY ?? env.GEMINI_API_KEY,
    gemmaModel: env.GEMMA_MODEL ?? env.GEMINI_MODEL,
    clerkSecretKey: env.CLERK_SECRET_KEY,
    ipHashSalt: env.IP_HASH_SALT?.trim() || 'dev-ip-salt',
    llmTimeoutMs,
    llmProvider: parseLlmProvider(env.LLM_PROVIDER),
    llmModel: env.LLM_MODEL?.trim() || undefined,
  };
}
