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

describe('H7 contest write-up pack', () => {
  it('root README has Hacktoberfest contest section', () => {
    const readme = read('README.md');
    assert.match(readme, /## Hacktoberfest weekend demo/);
    assert.match(readme, /therapist friend/i);
    assert.match(readme, /HACKTOBERFEST_WEEKEND_SCOPE\.md/);
    assert.match(readme, /hacktoberfest-api\/README\.md/);
    assert.match(readme, /synthetic|fixture/i);
    assert.match(readme, /HACKTOBERFEST_DEMO_CAPTURE\.md/);
    assert.match(readme, /HACKTOBERFEST_DEV_POST\.md/);
    assert.match(readme, /yarn hacktoberfest:dev/);
    assert.doesNotMatch(readme, /gsk_/);
    assert.doesNotMatch(readme, /sk_live|sk_test/);
  });

  it('demo capture checklist covers happy path + asset path', () => {
    const doc = read('docs/HACKTOBERFEST_DEMO_CAPTURE.md');
    assert.match(doc, /hacktoberfest-happy-path\.gif/);
    assert.match(doc, /Use sample session/);
    assert.match(doc, /Note preview/);
    assert.match(doc, /Download PDF/);
    assert.match(doc, /not real PHI/i);
  });

  it('DEV post draft names friend, Render, Whisper, and disclaimer', () => {
    const post = read('docs/HACKTOBERFEST_DEV_POST.md');
    assert.match(post, /therapist friend/i);
    assert.match(post, /Render/);
    assert.match(post, /Whisper/);
    assert.match(post, /YOUR_RENDER_HTTPS_URL/);
    assert.match(post, /GourabSanyal\/CaseScriptAI/);
    assert.match(post, /Best Use of Render/);
    assert.match(post, /synthetic demo data|not real PHI/i);
    assert.match(post, /Gemma/);
    assert.doesNotMatch(post, /gsk_/);
    assert.doesNotMatch(post, /CLERK_SECRET_KEY=\S+/);
  });
});
