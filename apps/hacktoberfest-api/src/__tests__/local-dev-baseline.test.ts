import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

describe('H5L local dev baseline', () => {
  it('docker-compose.yml exposes Postgres 16 matching .env.example', () => {
    const compose = readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8');
    assert.match(compose, /image:\s*postgres:16/);
    assert.match(compose, /['"]5432:5432['"]/);
    assert.match(compose, /POSTGRES_USER:\s*user/);
    assert.match(compose, /POSTGRES_PASSWORD:\s*password/);
    assert.match(compose, /POSTGRES_DB:\s*casescriptai_demo/);

    const envExample = readFileSync(
      path.join(repoRoot, 'apps/hacktoberfest-api/.env.example'),
      'utf8',
    );
    assert.match(
      envExample,
      /DATABASE_URL=postgres:\/\/user:password@localhost:5432\/casescriptai_demo/,
    );
  });

  it('root package.json exposes hacktoberfest typecheck/migrate/check scripts', () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };
    assert.equal(pkg.scripts['hacktoberfest:typecheck'], 'yarn workspace hacktoberfest-api typecheck');
    assert.equal(pkg.scripts['hacktoberfest:migrate'], 'yarn workspace hacktoberfest-api migrate');
    assert.equal(
      pkg.scripts['hacktoberfest:check'],
      'yarn hacktoberfest:typecheck && LIVE_PROVIDER_SMOKE=0 yarn hacktoberfest:test',
    );
  });

  it('pins Node 20 and uses a quoted shell-independent test glob', () => {
    const nvmrc = readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8').trim();
    assert.equal(nvmrc, '20');

    const apiPkg = JSON.parse(
      readFileSync(path.join(repoRoot, 'apps/hacktoberfest-api/package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    assert.equal(apiPkg.scripts.test, "node --import tsx --test 'src/__tests__/*.test.ts'");
    assert.doesNotMatch(apiPkg.scripts.test, /\*\*/);
  });
});
