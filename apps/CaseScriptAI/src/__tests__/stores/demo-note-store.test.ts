import { createDemoApiClient } from '@/services/demo-api/demo-api-client';
import { useDemoNoteStore } from '@/stores/demo-note-store';

jest.mock('@/services/api/wake-demo-api', () => ({
  wakeDemoApi: jest.fn(async () => ({
    success: true,
    data: { wasColdStart: false, elapsedMs: 10 },
  })),
}));

describe('demo-note-store', () => {
  beforeEach(() => {
    useDemoNoteStore.getState().reset();
  });

  it('runs wake → start → poll to ready', async () => {
    let polls = 0;
    const client = createDemoApiClient({
      baseUrl: 'http://api.test',
      sleep: async () => undefined,
      fetchImpl: async (input, init) => {
        const url = String(input);
        if (url.endsWith('/sessions/demo') && init?.method === 'POST') {
          return new Response(JSON.stringify({ id: 's1', status: 'queued' }), {
            status: 202,
          });
        }
        polls += 1;
        if (polls < 2) {
          return new Response(
            JSON.stringify({
              id: 's1',
              status: 'llm_running',
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

    const result = await useDemoNoteStore.getState().generate(client);
    expect(result.success).toBe(true);
    expect(useDemoNoteStore.getState().phase).toBe('ready');
    expect(useDemoNoteStore.getState().session?.pdfUrl).toContain('/pdf');
  });

  it('surfaces start failures', async () => {
    const client = createDemoApiClient({
      baseUrl: 'http://api.test',
      fetchImpl: async () =>
        new Response(JSON.stringify({ ok: false, error: 'busy' }), {
          status: 503,
        }),
    });
    const result = await useDemoNoteStore.getState().generate(client);
    expect(result.success).toBe(false);
    expect(useDemoNoteStore.getState().phase).toBe('failed');
    expect(useDemoNoteStore.getState().error).toBe('busy');
  });
});
