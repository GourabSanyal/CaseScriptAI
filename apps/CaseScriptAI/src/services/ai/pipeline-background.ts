export type AppStateStatus = 'active' | 'background' | 'inactive' | 'unknown' | 'extension';

export type PipelineBackgroundDeps = {
  /** Called when app returns to foreground — drain any queued work. */
  onForeground: () => void | Promise<void>;
  /** Subscribe to AppState changes; return unsubscribe. */
  subscribe: (listener: (status: AppStateStatus) => void) => () => void;
};

/**
 * Keeps pipeline draining across AppState transitions (ARCHITECTURE §9 auto-resume).
 * Does not pause mid-session — orchestrator owns in-flight work; foreground re-ticks the queue.
 */
export const createPipelineBackgroundController = (deps: PipelineBackgroundDeps) => {
  let last: AppStateStatus = 'active';

  const unsubscribe = deps.subscribe((status) => {
    const becameActive = status === 'active' && last !== 'active';
    last = status;
    if (becameActive) {
      void deps.onForeground();
    }
  });

  return {
    stop: () => unsubscribe(),
  };
};
