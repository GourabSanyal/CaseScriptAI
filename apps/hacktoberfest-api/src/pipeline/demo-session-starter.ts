import { unlink } from 'node:fs/promises';
import type { SessionRepository } from '../db/session-repository.js';
import type { LlmProvider } from '../providers/llm-provider.js';
import type { SttProvider } from '../providers/stt-provider.js';
import { FIXTURE_AUDIO_PATH } from '../config.js';
import type { PipelineConcurrencyGate } from './pipeline-concurrency.js';
import { runDemoPipeline } from './run-demo-pipeline.js';

export type DemoStartContext = {
  clientIpHash?: string | null;
  /** Optional upload path; defaults to fixture. Deleted after pipeline when set. */
  audioPath?: string;
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

    const audioPath =
      ctx.audioPath ?? deps.audioPath ?? FIXTURE_AUDIO_PATH;
    const deleteAfter = Boolean(ctx.audioPath);

    void runDemoPipeline({
      repo: deps.repo,
      stt: deps.stt,
      llm: deps.llm,
      sessionId: session.id,
      audioPath,
    })
      .catch(() => {
        console.error('demo_pipeline_failed');
      })
      .finally(() => {
        if (deleteAfter) {
          void unlink(audioPath).catch(() => undefined);
        }
        deps.gate?.release();
      });

    return { id: session.id, status: session.status };
  };
};
