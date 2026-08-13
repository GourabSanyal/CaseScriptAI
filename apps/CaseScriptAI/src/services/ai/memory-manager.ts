import type { Result } from '@/types/result';

export type ModelKind = 'whisper' | 'llm';

export class MemoryManager {
  private lock: ModelKind | null = null;

  get modelLoadLock(): ModelKind | null {
    return this.lock;
  }

  canLoadModel = (_model: ModelKind): boolean => this.lock === null;

  acquireLock = (model: ModelKind): Result<void> => {
    if (this.lock !== null) {
      return {
        success: false,
        error: `Cannot load ${model}; ${this.lock} already owns the model lock`,
      };
    }

    this.lock = model;
    return { success: true, data: undefined };
  };

  releaseLock = (model: ModelKind): Result<void> => {
    if (this.lock !== model) {
      return {
        success: false,
        error: this.lock
          ? `${model} cannot release a lock owned by ${this.lock}`
          : `Cannot release ${model}; the model lock is already free`,
      };
    }

    this.lock = null;
    return { success: true, data: undefined };
  };

  forceGC = (): void => {
    // ponytail: Hermes rarely exposes gc(); real reclaim is unload wait in bind ports
    const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
    gc?.();
  };

  /** Drop a lock left behind after a crash path. Never call while the pipeline is running. */
  clearStaleLock = (pipelineRunning: boolean): boolean => {
    if (pipelineRunning || this.lock === null) return false;
    this.lock = null;
    this.forceGC();
    return true;
  };
}

export const memoryManager = new MemoryManager();
