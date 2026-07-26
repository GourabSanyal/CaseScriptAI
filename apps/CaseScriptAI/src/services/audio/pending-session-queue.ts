import type { ProcessingEnqueuePort } from '@/types/recording';
import type { Result } from '@/types/result';

export type PendingSessionPersistence = {
  load: () => string[];
  save: (sessionIds: readonly string[]) => void;
};

/** Lightweight pending list until Slice 3 processing-queue-store owns the real queue. */
export const createPendingSessionQueue = (
  persistence: PendingSessionPersistence,
): ProcessingEnqueuePort => {
  let sessions = persistence.load().filter((id) => id.trim().length > 0);

  return {
    enqueue: async (sessionId): Promise<Result<void>> => {
      if (!sessionId.trim()) return { success: false, error: 'sessionId is required' };
      if (!sessions.includes(sessionId)) {
        sessions = [...sessions, sessionId];
        persistence.save(sessions);
      }
      return { success: true, data: undefined };
    },
    pendingCount: () => sessions.length,
  };
};
