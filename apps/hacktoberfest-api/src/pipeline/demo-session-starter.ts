import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import type { SttProvider } from '../providers/stt-provider.js';
import { FIXTURE_AUDIO_PATH } from '../config.js';
import { runDemoPipeline } from './run-demo-pipeline.js';

export type DemoSessionStarter = () => Promise<{ id: string; status: string }>;

type CreateDemoStarterDeps = {
  repo: SessionRepository;
  stt: SttProvider;
  llm: LlmProvider;
  audioPath?: string;
  pdfDir?: string;
};

/** Create a queued session and kick off the in-process pipeline (non-blocking). */
export const createDemoSessionStarter = (
  deps: CreateDemoStarterDeps,
): DemoSessionStarter => {
  return async () => {
    const session = await deps.repo.createSession();

    void runDemoPipeline({
      repo: deps.repo,
      stt: deps.stt,
      llm: deps.llm,
      sessionId: session.id,
      audioPath: deps.audioPath ?? FIXTURE_AUDIO_PATH,
      pdfDir: deps.pdfDir,
    }).catch(() => {
      // Steps persist sanitized failures; do not log PHI.
      console.error('demo_pipeline_failed');
    });

    return { id: session.id, status: session.status };
  };
};
