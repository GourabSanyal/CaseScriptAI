import { wakeDemoApi } from '@/services/api/wake-demo-api';

describe('wakeDemoApi', () => {
  it('succeeds on first healthy response without cold-start flag', async () => {
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
      expect(result.data.elapsedMs).toBeLessThan(3000);
    }
  });

  it('retries network throws and non-OK health until success (cold start)', async () => {
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
        if (calls === 1) throw new Error('offline');
        if (calls === 2) return new Response('warming', { status: 503 });
        return new Response('{"ok":true}', { status: 200 });
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wasColdStart).toBe(true);
      expect(calls).toBe(3);
    }
  });

  it('fails after timeout with connection error copy', async () => {
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
    if (!result.success) {
      expect(result.error).toMatch(/Can't reach server/i);
      expect(result.error).toMatch(/connection/i);
    }
  });

  it('treats repeated non-OK health as failure after timeout', async () => {
    let clock = 0;
    const result = await wakeDemoApi({
      baseUrl: 'http://api.test',
      timeoutMs: 4_000,
      now: () => clock,
      sleep: async () => {
        clock += 2_500;
      },
      fetchImpl: async () => new Response('no', { status: 502 }),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(
        "Can't reach server. Check your connection or try again.",
      );
    }
  });
});
