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
    const gc = (globalThis as typeof globalThis & { gc?: () => void }).gc;
    gc?.();
  };
}

export const memoryManager = new MemoryManager();
