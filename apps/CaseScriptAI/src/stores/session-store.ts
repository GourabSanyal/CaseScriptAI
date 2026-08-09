import { create } from 'zustand';

import type { Result } from '@/types/result';
import type {
  Session,
  SessionRepository,
  SessionSearchFilter,
  SessionStore,
} from '@/types/session';

export type SessionStoreDeps = {
  repository: SessionRepository;
  now?: () => number;
};

export const createSessionStore = ({
  repository,
  now = Date.now,
}: SessionStoreDeps) =>
  create<SessionStore>((set, get) => ({
    items: [],
    hasHydrated: false,
    error: null,
    hydrate: async () => {
      const listed = await repository.list();
      if (!listed.success) {
        set({ error: listed.error, hasHydrated: true });
        return listed;
      }
      set({ items: listed.data, hasHydrated: true, error: null });
      return { success: true, data: undefined };
    },
    search: async (filter) => {
      const listed = await repository.list(filter);
      if (!listed.success) {
        set({ error: listed.error });
        return listed;
      }
      set({ items: listed.data, error: null });
      return listed;
    },
    upsertLocal: async (session) => {
      const saved = await repository.upsert(session);
      if (!saved.success) {
        set({ error: saved.error });
        return saved;
      }
      const items = [...get().items.filter((s) => s.id !== session.id), session].sort(
        (a, b) => b.createdAt - a.createdAt,
      );
      set({ items, error: null });
      return { success: true, data: undefined };
    },
    updatePatient: async (id, fields) => {
      const existing = await repository.getById(id);
      if (!existing.success) return existing;
      if (!existing.data) return { success: false, error: 'Session not found' };
      const next: Session = {
        ...existing.data,
        ...fields,
        updatedAt: now(),
      };
      return get().upsertLocal(next);
    },
  }));
