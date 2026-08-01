import { SOAP_NOTE_PROMPT } from '@/services/ai/prompts';
import { validateSoapOutput } from '@/services/ai/output-validator';
import { AppErrorCode, type Result } from '@/types/result';

import type { MemoryManager } from '@/services/ai/memory-manager';
import type { LlmRuntimePort } from '@/types/pipeline';

export type LlmServiceDeps = {
  memory: MemoryManager;
  runtime: LlmRuntimePort;
  buildPrompt?: (transcript: string) => string;
};

const isOom = (error: string): boolean =>
  /oom|out of memory|memory/i.test(error);

/** LLM stage: lock → pre-check → generate SOAP → validate → interrupt+unload+GC. */
export class LlmService {
  private readonly buildPrompt: (transcript: string) => string;

  constructor(private readonly deps: LlmServiceDeps) {
    this.buildPrompt = deps.buildPrompt ?? SOAP_NOTE_PROMPT;
  }

  generateSoap = async (transcript: string): Promise<Result<string>> => {
    if (!transcript.trim()) {
      return { success: false, error: 'Transcript is empty' };
    }

    const lock = this.deps.memory.acquireLock('llm');
    if (!lock.success) return lock;

    try {
      const ready = await this.deps.runtime.isReady();
      if (!ready.success) return ready;

      const generated = await this.deps.runtime.generate(this.buildPrompt(transcript));
      if (!generated.success) {
        return {
          success: false,
          error: generated.error,
          errorCode: isOom(generated.error)
            ? AppErrorCode.MODEL_OOM
            : AppErrorCode.LLM_GENERATION_FAILED,
        };
      }

      return validateSoapOutput(generated.data);
    } finally {
      await this.deps.runtime.interrupt();
      await this.deps.runtime.unload();
      this.deps.memory.releaseLock('llm');
      this.deps.memory.forceGC();
    }
  };
}
