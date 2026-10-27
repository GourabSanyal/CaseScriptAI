import { wakeDemoApi } from '@/services/api/wake-demo-api';

describe('wakeDemoApi', () => {
  it('succeeds on first healthy response', async () => {
    const result = await wakeDemoApi({
      baseUrl: 'http://api.test',
      fetchImpl: async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      sleep: async () => undefined,
      now: (() => {
        let t = 0;
        return () => {
          t += 10;
          return t;
        };
      })(),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wasColdStart).toBe(false);
    }
  });

  it('retries until health succeeds and flags cold start', async () => {
    let calls = 0;
    let clock = 0;
    const result = await wakeDemoApi({
      baseUrl: 'http://api.test',
      timeoutMs: 20_000,
      now: () => clock,
      sleep: async () => {
        clock += 2_000;
      },
      fetchImpl: async () => {
        calls += 1;
        clock += 1_500;
        if (calls < 3) throw new Error('down');
        return new Response('{"ok":true}', { status: 200 });
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wasColdStart).toBe(true);
      expect(calls).toBe(3);
    }
  });

  it('fails after timeout', async () => {
    let clock = 0;
    const result = await wakeDemoApi({
      baseUrl: 'http://api.test',
      timeoutMs: 5_000,
      now: () => clock,
      sleep: async () => {
        clock += 3_000;
      },
      fetchImpl: async () => {
        throw new Error('down');
      },
    });
    expect(result.success).toBe(false);
  });
});
