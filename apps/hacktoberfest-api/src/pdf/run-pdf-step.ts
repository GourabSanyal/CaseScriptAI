import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  STRUCTURED_NOTE_KEYS,
  type StructuredNote,
} from '../domain/structured-note.js';
import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import { packageRoot } from '../db/env.js';
import { buildNotePdf } from './build-note-pdf.js';

export const defaultPdfDir = (): string => path.join(packageRoot, 'data', 'pdfs');

export const pdfPathForSession = (sessionId: string, pdfDir = defaultPdfDir()): string =>
  path.join(pdfDir, `${sessionId}.pdf`);

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

const fileExistsNonEmpty = async (filePath: string): Promise<boolean> => {
  try {
    const info = await stat(filePath);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
};

const writePdf = async (
  sessionId: string,
  note: StructuredNote,
  pdfDir: string,
): Promise<string> => {
  await mkdir(pdfDir, { recursive: true });
  const filePath = pdfPathForSession(sessionId, pdfDir);
  const bytes = buildNotePdf(note);
  if (bytes.length === 0 || !bytes.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    throw new Error('pdf_invalid_bytes');
  }
  await writeFile(filePath, bytes);
  return filePath;
};

type RunPdfStepDeps = {
  repo: SessionRepository;
  sessionId: string;
  pdfDir?: string;
};

/**
 * pdf_running → ready with pdf_path.
 * Idempotent: ready + existing file → no-op; ready + missing file → regenerate in place.
 */
export const runPdfStep = async (deps: RunPdfStepDeps): Promise<DemoSession> => {
  const pdfDir = deps.pdfDir ?? defaultPdfDir();
  const current = await deps.repo.getById(deps.sessionId);
  if (!current) throw new Error(`session_not_found:${deps.sessionId}`);

  const note = asStructuredNote(current.noteJson);
  const existingPath = pdfPathForSession(deps.sessionId, pdfDir);

  if (current.status === 'ready') {
    // Idempotent regenerate: rewrite only when the artifact is missing.
    if (!(await fileExistsNonEmpty(existingPath))) {
      if (!note) throw new Error('pdf_missing_note');
      await writePdf(deps.sessionId, note, pdfDir);
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
    if (!(await fileExistsNonEmpty(existingPath))) {
      await writePdf(deps.sessionId, note, pdfDir);
    }
    return await deps.repo.updateStatus(deps.sessionId, 'ready', {
      pdfPath: existingPath,
    });
  } catch {
    return deps.repo.updateStatus(deps.sessionId, 'failed', {
      error: 'pdf_failed',
    });
  }
};

export const readSessionPdf = async (
  session: DemoSession,
  pdfDir = defaultPdfDir(),
): Promise<Buffer | null> => {
  if (session.status !== 'ready') return null;
  const filePath = session.pdfPath ?? pdfPathForSession(session.id, pdfDir);
  try {
    const bytes = await readFile(filePath);
    return bytes.length > 0 ? bytes : null;
  } catch {
    return null;
  }
};
