import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = path.resolve(packageRoot, '../..');

const loadOneEnvFile = (envPath: string): void => {
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

/** Load package `.env`, then repo-root `.env`, without logging values. */
export const loadEnvFile = (): void => {
  loadOneEnvFile(path.join(packageRoot, '.env'));
  loadOneEnvFile(path.join(repoRoot, '.env'));
};

export const requireDatabaseUrl = (): string => {
  loadEnvFile();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL is required. Set it in apps/hacktoberfest-api/.env (or repo-root .env), or export it in the shell.',
    );
  }
  return url;
};

export { packageRoot };
