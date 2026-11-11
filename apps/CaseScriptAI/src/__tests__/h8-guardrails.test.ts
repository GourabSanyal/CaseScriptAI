import { readFileSync } from 'node:fs';
import path from 'node:path';

import { LOCAL_ON_DEVICE_AI_ENABLED } from '@/constants/features';

const appRoot = path.resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(path.join(appRoot, rel), 'utf8');

describe('H8 guardrails', () => {
  it('strips console in production babel config', () => {
    const babel = read('babel.config.js');
    expect(babel).toMatch(/transform-remove-console/);
    expect(babel).toMatch(/production/);
  });

  it('does not depend on expo-av', () => {
    const pkg = JSON.parse(read('package.json')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['expo-av']).toBeUndefined();
    expect(pkg.dependencies['expo-audio']).toBeDefined();
  });

  it('keeps on-device AI gated off by default', () => {
    expect(LOCAL_ON_DEVICE_AI_ENABLED).toBe(false);
  });

  it('redirects poc and explore when not in __DEV__', () => {
    expect(read('src/app/poc.tsx')).toMatch(/!__DEV__/);
    expect(read('src/app/poc.tsx')).toMatch(/Redirect/);
    expect(read('src/app/explore.tsx')).toMatch(/!__DEV__/);
    expect(read('src/app/explore.tsx')).toMatch(/Redirect/);
  });

  it('ships therapist demo-note screen on the app tabs', () => {
    expect(read('src/app/(app)/demo-note.tsx')).toMatch(/Generate demo note/);
    expect(read('src/app/(app)/_layout.tsx')).toMatch(/demo-note/);
  });
});
