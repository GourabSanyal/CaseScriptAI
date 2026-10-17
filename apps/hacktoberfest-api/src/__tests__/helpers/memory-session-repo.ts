import type {
  DemoSession,
  SessionPatch,
  SessionRepository,
} from '../../db/session-repository.js';
import { assertTransition } from '../../domain/session-status.js';

export const withSessionDefaults = (
  partial: Partial<DemoSession> & Pick<DemoSession, 'id' | 'status'>,
): DemoSession => ({
  transcript: null,
  noteJson: null,
  pdfPath: null,
  pdfBytes: null,
  clientIpHash: null,
  attempt: 1,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...partial,
});

export const createMemoryRepo = (initial: DemoSession): SessionRepository => {
  let session = { ...initial };
  return {
    createSession: async (input = {}) => {
      session = {
        ...session,
        clientIpHash: input.clientIpHash ?? session.clientIpHash,
      };
      return { ...session };
    },
    getById: async (id) => (id === session.id ? { ...session } : null),
    updateStatus: async (id, next, patch: SessionPatch = {}) => {
      if (id !== session.id) throw new Error(`session_not_found:${id}`);
      assertTransition(session.status, next);
      session = {
        ...session,
        status: next,
        transcript:
          patch.transcript === undefined ? session.transcript : patch.transcript,
        noteJson: patch.noteJson === undefined ? session.noteJson : patch.noteJson,
        pdfPath: patch.pdfPath === undefined ? session.pdfPath : patch.pdfPath,
        pdfBytes: patch.pdfBytes === undefined ? session.pdfBytes : patch.pdfBytes,
        error: patch.error === undefined ? session.error : patch.error,
        updatedAt: new Date(),
      };
      return { ...session };
    },
    setPdfBytes: async (id, pdfBytes) => {
      if (id !== session.id) throw new Error(`session_not_found:${id}`);
      session = {
        ...session,
        pdfBytes,
        pdfPath: null,
        updatedAt: new Date(),
      };
      return { ...session };
    },
    countStartsByIpHash: async () => 0,
    countStartsGlobal: async () => 0,
  };
};
