import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import type { SttProvider } from '../providers/stt-provider.js';
import { runLlmStep } from './run-llm-step.js';
import { runSttStep } from './run-stt-step.js';
import { runPdfStep } from '../pdf/run-pdf-step.js';

export type RunDemoPipelineDeps = {
  repo: SessionRepository;
  stt: SttProvider;
  llm: LlmProvider;
  sessionId: string;
  audioPath: string;
  pdfDir?: string;
};

/** In-process STT → LLM → PDF. Never logs transcript/note/paths. */
export const runDemoPipeline = async (
  deps: RunDemoPipelineDeps,
): Promise<DemoSession> => {
  const afterStt = await runSttStep({
    repo: deps.repo,
    stt: deps.stt,
    sessionId: deps.sessionId,
    audioPath: deps.audioPath,
  });
  if (afterStt.status === 'failed') return afterStt;

  const afterLlm = await runLlmStep({
    repo: deps.repo,
    llm: deps.llm,
    sessionId: deps.sessionId,
  });
  if (afterLlm.status === 'failed') return afterLlm;

  return runPdfStep({
    repo: deps.repo,
    sessionId: deps.sessionId,
    pdfDir: deps.pdfDir,
  });
};
