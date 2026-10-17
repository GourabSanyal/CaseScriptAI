import type { SessionRepository } from '../db/session-repository.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import type { SttProvider } from '../providers/stt-provider.js';
import { FIXTURE_AUDIO_PATH } from '../config.js';
import type { PipelineConcurrencyGate } from './pipeline-concurrency.js';
import { runDemoPipeline } from './run-demo-pipeline.js';

export type DemoStartContext = {
  clientIpHash?: string | null;
};

export type DemoSessionStarter = (
  ctx?: DemoStartContext,
) => Promise<{ id: string; status: string }>;

type CreateDemoStarterDeps = {
  repo: SessionRepository;
  stt: SttProvider;
  llm: LlmProvider;
  audioPath?: string;
  gate?: PipelineConcurrencyGate;
};

/** Create a queued session and kick off the in-process pipeline (non-blocking). */
export const createDemoSessionStarter = (
  deps: CreateDemoStarterDeps,
): DemoSessionStarter => {
  return async (ctx = {}) => {
    const session = await deps.repo.createSession({
      clientIpHash: ctx.clientIpHash ?? null,
    });

    void runDemoPipeline({
      repo: deps.repo,
      stt: deps.stt,
      llm: deps.llm,
      sessionId: session.id,
      audioPath: deps.audioPath ?? FIXTURE_AUDIO_PATH,
    })
      .catch(() => {
        console.error('demo_pipeline_failed');
      })
      .finally(() => {
        deps.gate?.release();
      });

    return { id: session.id, status: session.status };
  };
};
