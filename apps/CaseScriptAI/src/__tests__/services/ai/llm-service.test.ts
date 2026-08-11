import { MemoryManager } from '@/services/ai/memory-manager';
import { validateSoapOutput } from '@/services/ai/output-validator';
import { LlmService } from '@/services/ai/llm-service';
import { AppErrorCode } from '@/types/result';

describe('validateSoapOutput', () => {
  it('rejects short output', () => {
    const result = validateSoapOutput('too short');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe(AppErrorCode.LLM_GENERATION_FAILED);
    }
  });

  it('requires SOAP sections and strips meta', () => {
    const body = `
Subjective: patient reports headache for two days without fever or photophobia noted.
Objective: BP 120/80, alert, no focal neuro deficits on exam today.
Assessment: Tension-type headache, likely stress related, low concern for migraine.
Plan: hydration, OTC analgesic, follow up if worsens or new neurological signs.
`.trim();
    const result = validateSoapOutput(`Here is your SOAP note:\n${body}`);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toMatch(/Here is your SOAP note/i);
      expect(result.data).toMatch(/Subjective/i);
    }
  });
});

describe('LlmService', () => {
  const soapBody = `
Subjective: patient reports headache for two days without fever or photophobia noted.
Objective: BP 120/80, alert, no focal neuro deficits on exam today.
Assessment: Tension-type headache, likely stress related, low concern for migraine.
Plan: hydration, OTC analgesic, follow up if worsens or new neurological signs.
`.trim();

  it('acquires llm lock, validates SOAP, interrupts before unload', async () => {
    const memory = new MemoryManager();
    const runtime = {
      isReady: jest.fn(async () => ({ success: true as const, data: undefined })),
      generate: jest.fn(async () => ({ success: true as const, data: soapBody })),
      interrupt: jest.fn(async () => ({ success: true as const, data: undefined })),
      unload: jest.fn(async () => ({ success: true as const, data: undefined })),
    };
    const service = new LlmService({ memory, runtime });

    const result = await service.generateSoap('doctor patient talk about headache');
    expect(result.success).toBe(true);
    expect(runtime.interrupt).toHaveBeenCalled();
    expect(runtime.unload).toHaveBeenCalled();
    expect(memory.modelLoadLock).toBeNull();
  });

  it('maps OOM errors to MODEL_OOM and releases lock', async () => {
    const memory = new MemoryManager();
    const service = new LlmService({
      memory,
      runtime: {
        isReady: async () => ({ success: true, data: undefined }),
        generate: async () => ({ success: false, error: 'native OOM while generating' }),
        interrupt: async () => ({ success: true, data: undefined }),
        unload: async () => ({ success: true, data: undefined }),
      },
    });

    const result = await service.generateSoap('transcript text here');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errorCode).toBe(AppErrorCode.MODEL_OOM);
    }
    expect(memory.modelLoadLock).toBeNull();
  });

  it('does not treat generic memory wording as OOM', async () => {
    const memory = new MemoryManager();
    const service = new LlmService({
      memory,
      runtime: {
        isReady: async () => ({ success: true, data: undefined }),
        generate: async () => ({ success: false, error: 'KV memory map failed' }),
        interrupt: async () => ({ success: true, data: undefined }),
        unload: async () => ({ success: true, data: undefined }),
      },
    });
    const result = await service.generateSoap('transcript text here');
    expect(result).toMatchObject({
      success: false,
      errorCode: AppErrorCode.LLM_GENERATION_FAILED,
    });
  });

  it('fails pre-check when runtime not ready', async () => {
    const memory = new MemoryManager();
    const service = new LlmService({
      memory,
      runtime: {
        isReady: async () => ({ success: false, error: 'model missing' }),
        generate: async () => ({ success: true, data: soapBody }),
        interrupt: async () => ({ success: true, data: undefined }),
        unload: async () => ({ success: true, data: undefined }),
      },
    });
    const result = await service.generateSoap('hello');
    expect(result.success).toBe(false);
    expect(memory.modelLoadLock).toBeNull();
  });
});
