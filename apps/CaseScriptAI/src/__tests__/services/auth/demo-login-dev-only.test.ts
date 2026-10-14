/**
 * H5A.6 — demo therapist entry must stay behind `__DEV__` in welcome UI.
 * We assert the source gate rather than rendering RN trees here.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('demo therapist login gate', () => {
  it('welcome screen wraps demo continue in __DEV__', () => {
    const file = path.join(
      __dirname,
      '../../../app/(auth)/welcome.tsx',
    );
    const src = readFileSync(file, 'utf8');
    expect(src).toMatch(/__DEV__\s*\?\s*\(/);
    expect(src).toMatch(/auth-welcome-therapist-demo/);
    expect(src).toMatch(/Continue as therapist \(demo\)/);
  });
});
