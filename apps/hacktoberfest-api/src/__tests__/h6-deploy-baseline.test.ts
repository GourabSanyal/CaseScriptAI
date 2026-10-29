import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

const read = (rel: string) => readFileSync(path.join(repoRoot, rel), 'utf8');

describe('H6 deploy baseline', () => {
  it('render.yaml: web + Postgres, migrate preDeploy, workspace start', () => {
    const yaml = read('render.yaml');
    assert.match(yaml, /type:\s*web/);
    assert.match(yaml, /databases:/);
    assert.match(yaml, /hacktoberfest-api/);
    assert.match(
      yaml,
      /preDeployCommand:\s*yarn workspace hacktoberfest-api migrate/,
    );
    assert.match(
      yaml,
      /startCommand:\s*yarn workspace hacktoberfest-api start/,
    );
    assert.match(yaml, /buildCommand:.*workspaces focus hacktoberfest-api/);
    assert.match(yaml, /healthCheckPath:\s*\/health/);
    assert.match(yaml, /DATABASE_URL/);
    assert.doesNotMatch(yaml, /gsk_/);
    assert.doesNotMatch(yaml, /sk_live|sk_test/);
  });

  it('CI workflow runs API check + mobile typecheck/test on this branch', () => {
    const wf = read('.github/workflows/hacktoberfest.yml');
    assert.match(wf, /hacktoberfest\/render-session-note/);
    assert.match(wf, /yarn hacktoberfest:check/);
    assert.match(wf, /yarn hacktoberfest:migrate/);
    assert.match(wf, /LIVE_PROVIDER_SMOKE:\s*'0'/);
    assert.match(wf, /yarn workspace casescriptai typecheck/);
    assert.match(wf, /yarn workspace casescriptai test/);
    assert.match(wf, /postgres:16/);
  });

  it('.env.example documents Render-relevant keys including DEMO_ACCESS_KEY', () => {
    const env = read('apps/hacktoberfest-api/.env.example');
    for (const key of [
      'DATABASE_URL',
      'GROQ_API_KEY',
      'LLM_PROVIDER',
      'PUBLIC_BASE_URL',
      'CLERK_SECRET_KEY',
      'IP_HASH_SALT',
      'DEMO_ACCESS_KEY',
    ]) {
      assert.match(env, new RegExp(`^#?\\s*${key}=`, 'm'));
    }
  });

  it('API README has Render env + smoke checklist + Clerk mobile env', () => {
    const readme = read('apps/hacktoberfest-api/README.md');
    assert.match(readme, /## Render deploy/);
    assert.match(readme, /PUBLIC_BASE_URL/);
    assert.match(readme, /CLERK_SECRET_KEY/);
    assert.match(readme, /EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY/);
    assert.match(readme, /EXPO_PUBLIC_DEMO_API_URL/);
    assert.match(readme, /## Smoke checklist/);
    assert.match(readme, /\/health/);
    assert.match(readme, /Use sample session/);
    assert.match(readme, /PDF/);
    assert.match(readme, /DEMO_ACCESS_KEY/);
  });
});
