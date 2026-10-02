import { validateStructuredNote } from '../domain/structured-note.js';
import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import {
  buildStructuredNotePrompt,
  buildStructuredNoteRetryPrompt,
} from '../prompts/structured-note-prompt.js';
import type { LlmProvider } from '../providers/llm-provider.js';

type RunLlmStepDeps = {
  repo: SessionRepository;
  llm: LlmProvider;
  sessionId: string;
};

const sanitizeLlmError = (err: unknown): string => {
  if (!(err instanceof Error)) return 'llm_failed';
  const message = err.message;
  if (
    message.startsWith('llm_') ||
    message.startsWith('google_ai_') ||
    message === 'llm_missing_transcript'
  ) {
    return message.slice(0, 160);
  }
  return 'llm_failed';
};

const generateValidatedNote = async (
  llm: LlmProvider,
  transcript: string,
) => {
  const first = await llm.complete(buildStructuredNotePrompt(transcript));
  const firstResult = validateStructuredNote(first);
  if (firstResult.ok) return firstResult.note;

  const second = await llm.complete(buildStructuredNoteRetryPrompt(transcript));
  const secondResult = validateStructuredNote(second);
  if (secondResult.ok) return secondResult.note;

  throw new Error(secondResult.error);
};

/** llm_running → (note_json + pdf_running) | failed */
export const runLlmStep = async (deps: RunLlmStepDeps): Promise<DemoSession> => {
  const current = await deps.repo.getById(deps.sessionId);
  if (!current) throw new Error(`session_not_found:${deps.sessionId}`);
  if (current.status !== 'llm_running') {
    throw new Error(`llm_bad_status:${current.status}`);
  }
  if (!current.transcript?.trim()) {
    return deps.repo.updateStatus(deps.sessionId, 'failed', {
      error: 'llm_missing_transcript',
    });
  }

  try {
    const note = await generateValidatedNote(deps.llm, current.transcript);
    return await deps.repo.updateStatus(deps.sessionId, 'pdf_running', {
      noteJson: note,
    });
  } catch (err) {
    return await deps.repo.updateStatus(deps.sessionId, 'failed', {
      error: sanitizeLlmError(err),
    });
  }
};
