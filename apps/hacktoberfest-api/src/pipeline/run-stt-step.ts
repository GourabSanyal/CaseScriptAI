import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import type { SttProvider } from '../providers/stt-provider.js';

type RunSttStepDeps = {
  repo: SessionRepository;
  stt: SttProvider;
  sessionId: string;
  audioPath: string;
};

const sanitizeSttError = (err: unknown): string => {
  if (!(err instanceof Error)) return 'stt_failed';
  const message = err.message;
  // Avoid persisting filesystem paths or provider payloads.
  if (message.startsWith('stt_') || message === 'empty_transcript') {
    return message.slice(0, 120);
  }
  return 'stt_failed';
};

/** queued → stt_running → (transcript + llm_running) | failed */
export const runSttStep = async (deps: RunSttStepDeps): Promise<DemoSession> => {
  await deps.repo.updateStatus(deps.sessionId, 'stt_running');

  try {
    const transcript = await deps.stt.transcribeFile(deps.audioPath);
    if (!transcript.trim()) {
      throw new Error('stt_empty_transcript');
    }
    return await deps.repo.updateStatus(deps.sessionId, 'llm_running', {
      transcript,
    });
  } catch (err) {
    return await deps.repo.updateStatus(deps.sessionId, 'failed', {
      error: sanitizeSttError(err),
    });
  }
};
