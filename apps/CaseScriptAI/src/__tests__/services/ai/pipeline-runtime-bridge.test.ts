import {
  arePipelineRuntimesReady,
  bindPipelinePorts,
  setPipelineRuntimesReady,
} from '@/services/ai/pipeline-runtime-bridge';

describe('pipeline-runtime-bridge', () => {
  it('reports ready only after bind + flag', async () => {
    setPipelineRuntimesReady(false);
    expect(arePipelineRuntimesReady()).toBe(false);

    bindPipelinePorts({
      whisper: {
        load: async () => ({ success: true, data: undefined }),
        transcribe: async () => ({ success: true, data: 'hi' }),
        unload: async () => ({ success: true, data: undefined }),
      },
      llm: {
        isReady: async () => ({ success: true, data: undefined }),
        generate: async () => ({ success: true, data: 'soap' }),
        interrupt: async () => ({ success: true, data: undefined }),
        unload: async () => ({ success: true, data: undefined }),
      },
    });
    setPipelineRuntimesReady(true);
    expect(arePipelineRuntimesReady()).toBe(true);
  });
});
