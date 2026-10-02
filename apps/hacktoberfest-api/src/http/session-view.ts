import type { DemoSession } from '../db/session-repository.js';

/** Polling DTO — never includes transcript or note JSON (PHI). */
export type PublicSession = {
  id: string;
  status: string;
  error: string | null;
  pdfUrl: string | null;
};

export const toPublicSession = (
  session: DemoSession,
  publicBaseUrl: string,
): PublicSession => {
  const base = publicBaseUrl.replace(/\/$/, '');
  return {
    id: session.id,
    status: session.status,
    error: session.error,
    pdfUrl:
      session.status === 'ready'
        ? `${base}/sessions/${session.id}/pdf`
        : null,
  };
};
