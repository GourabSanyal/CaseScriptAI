import {
  STRUCTURED_NOTE_KEYS,
  type StructuredNote,
} from '../domain/structured-note.js';
import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import { buildNotePdf } from './build-note-pdf.js';

const asStructuredNote = (value: unknown): StructuredNote | null => {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const note = {} as StructuredNote;
  for (const key of STRUCTURED_NOTE_KEYS) {
    if (typeof record[key] !== 'string' || !record[key].trim()) return null;
    note[key] = record[key].trim();
  }
  return note;
};

const buildPdfBytes = (note: StructuredNote): Buffer => {
  const bytes = buildNotePdf(note);
  if (bytes.length === 0 || !bytes.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    throw new Error('pdf_invalid_bytes');
  }
  return bytes;
};

type RunPdfStepDeps = {
  repo: SessionRepository;
  sessionId: string;
  /** @deprecated H5S.4 stores bytes in Postgres; ignored. */
  pdfDir?: string;
};

/**
 * pdf_running → ready with pdf_bytes in Postgres (no durable disk path).
 * Idempotent: ready + existing bytes → no-op; ready + missing bytes → regenerate.
 */
export const runPdfStep = async (deps: RunPdfStepDeps): Promise<DemoSession> => {
  const current = await deps.repo.getById(deps.sessionId);
  if (!current) throw new Error(`session_not_found:${deps.sessionId}`);

  const note = asStructuredNote(current.noteJson);

  if (current.status === 'ready') {
    if (!current.pdfBytes || current.pdfBytes.length === 0) {
      if (!note) throw new Error('pdf_missing_note');
      const bytes = buildPdfBytes(note);
      return deps.repo.setPdfBytes(deps.sessionId, bytes);
    }
    return current;
  }

  if (current.status !== 'pdf_running') {
    throw new Error(`pdf_bad_status:${current.status}`);
  }
  if (!note) {
    return deps.repo.updateStatus(deps.sessionId, 'failed', {
      error: 'pdf_missing_note',
    });
  }

  try {
    const bytes = buildPdfBytes(note);
    return await deps.repo.updateStatus(deps.sessionId, 'ready', {
      pdfBytes: bytes,
      pdfPath: null,
    });
  } catch {
    return deps.repo.updateStatus(deps.sessionId, 'failed', {
      error: 'pdf_failed',
    });
  }
};

export const readSessionPdf = async (
  session: DemoSession,
): Promise<Buffer | null> => {
  if (session.status !== 'ready') return null;
  if (session.pdfBytes && session.pdfBytes.length > 0) {
    return session.pdfBytes;
  }
  return null;
};

/** @deprecated Kept so older imports compile; PDFs live in DB now. */
export const defaultPdfDir = (): string => '';
export const pdfPathForSession = (sessionId: string): string =>
  `db:${sessionId}`;
