import { createDemoApiClient } from '@/services/demo-api/demo-api-client';

describe('createDemoApiClient', () => {
  it('starts a demo and returns id/status', async () => {
    const client = createDemoApiClient({
      baseUrl: 'http://api.test',
      fetchImpl: async (input, init) => {
        expect(String(input)).toBe('http://api.test/sessions/demo');
        expect(init?.method).toBe('POST');
        return new Response(JSON.stringify({ id: 'abc', status: 'queued' }), {
          status: 202,
        });
      },
    });
    const result = await client.startDemo();
    expect(result).toEqual({
      success: true,
      data: { id: 'abc', status: 'queued' },
    });
  });

  it('maps rate_limited and network failures', async () => {
    const limited = createDemoApiClient({
      baseUrl: 'http://api.test',
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), {
          status: 429,
        }),
    });
    expect(await limited.startDemo()).toEqual({
      success: false,
      error: 'rate_limited',
    });

    const offline = createDemoApiClient({
      baseUrl: 'http://api.test',
      fetchImpl: async () => {
        throw new Error('offline');
      },
    });
    expect(await offline.startDemo()).toEqual({
      success: false,
      error: 'network',
    });
  });

  it('polls with backoff until ready', async () => {
    let calls = 0;
    let clock = 0;
    const client = createDemoApiClient({
      baseUrl: 'http://api.test',
      now: () => clock,
      sleep: async (ms) => {
        clock += ms;
      },
      fetchImpl: async () => {
        calls += 1;
        if (calls < 3) {
          return new Response(
            JSON.stringify({
              id: 's1',
              status: 'stt_running',
              error: null,
              pdfUrl: null,
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            id: 's1',
            status: 'ready',
            error: null,
            pdfUrl: 'http://api.test/sessions/s1/pdf',
          }),
          { status: 200 },
        );
      },
    });

    const statuses: string[] = [];
    const result = await client.pollUntilReady('s1', (s) => {
      statuses.push(s.status);
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pdfUrl).toContain('/pdf');
    }
    expect(statuses).toContain('stt_running');
    expect(statuses).toContain('ready');
  });

  it('sends x-demo-key when provided', async () => {
    let sawKey: string | null = null;
    const client = createDemoApiClient({
      baseUrl: 'http://api.test',
      demoAccessKey: 'secret',
      fetchImpl: async (_url, init) => {
        const h = init?.headers as Record<string, string>;
        sawKey = h['x-demo-key'] ?? null;
        return new Response(JSON.stringify({ id: 'x', status: 'queued' }), {
          status: 202,
        });
      },
    });
    await client.startDemo();
    expect(sawKey).toBe('secret');
  });
});
