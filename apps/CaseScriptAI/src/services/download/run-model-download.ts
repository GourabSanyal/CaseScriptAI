import { downloadLlmAssets, downloadSttAssets } from '@/services/download/executorch-model-download';
import { transitionDownloadState } from '@/services/download/download-state-machine';
import { AppErrorCode } from '@/types/result';

import type {
  AssetDownloader,
  DownloadEvent,
  DownloadProgressSnapshot,
  DownloadState,
  ModelDowngrade,
  ModelWarmup,
} from '@/types/download';
import type { LLMTier } from '@/types/device';
import type { Result } from '@/types/result';

const apply = (machine: DownloadState, event: DownloadEvent): DownloadState => {
  const next = transitionDownloadState(machine, event);
  return next.success ? next.data : machine;
};

export const runModelDownload = async (args: {
  tier: LLMTier;
  machine: DownloadState;
  downloadAsset: AssetDownloader;
  warmup: ModelWarmup;
  downgradeAfterWarmupFailure: ModelDowngrade;
  onUpdate: (snapshot: DownloadProgressSnapshot) => void;
  /** Optional disk gate before marking complete (MMKV progress is not enough). */
  verifyReady?: (tier: LLMTier) => Promise<Result<void>>;
}): Promise<Result<void>> => {
  let machine = args.machine;
  if (machine.status === 'failed') {
    machine = apply(machine, { type: 'RETRY' });
  } else if (machine.status !== 'checking-storage') {
    machine = apply(machine.status === 'idle' ? machine : { status: 'idle' }, { type: 'START' });
  }
  args.onUpdate({ machine, progress: 0, phaseLabel: 'Checking storage', error: null });

  machine = apply(machine, { type: 'STORAGE_OK' });
  args.onUpdate({ machine, progress: 0, phaseLabel: 'Downloading Whisper', error: null });

  const fail = (error: string, errorCode?: AppErrorCode): Result<void> => {
    machine = apply(machine, { type: 'FAIL', error, errorCode });
    args.onUpdate({ machine, progress: 0, phaseLabel: 'Failed', error });
    return { success: false, error, errorCode };
  };

  const stt = await downloadSttAssets(args.downloadAsset, (progress) => {
    machine = apply(machine, { type: 'PROGRESS', progress: progress * 0.45 });
    args.onUpdate({
      machine,
      progress: progress * 0.45,
      phaseLabel: 'Downloading Whisper',
      error: null,
    });
  });
  if (!stt.success) return fail(stt.error, stt.errorCode);

  args.onUpdate({ machine, progress: 0.45, phaseLabel: 'Downloading LLM', error: null });
  const llm = await downloadLlmAssets(args.tier, args.downloadAsset, (progress) => {
    const overall = 0.45 + progress * 0.45;
    machine = apply(machine, { type: 'PROGRESS', progress: overall });
    args.onUpdate({ machine, progress: overall, phaseLabel: 'Downloading LLM', error: null });
  });
  if (!llm.success) return fail(llm.error, llm.errorCode);

  machine = apply(machine, { type: 'DOWNLOADED' });
  args.onUpdate({ machine, progress: 0.9, phaseLabel: 'Verifying', error: null });

  let activeTier = args.tier;
  let warmup = await args.warmup(activeTier);
  if (!warmup.success && warmup.errorCode === AppErrorCode.MODEL_OOM) {
    const downgraded = args.downgradeAfterWarmupFailure();
    if (downgraded.success) {
      activeTier = downgraded.data.tier;
      const redownload = await downloadLlmAssets(activeTier, args.downloadAsset);
      if (!redownload.success) return fail(redownload.error, redownload.errorCode);
      warmup = await args.warmup(activeTier);
    }
  }
  if (!warmup.success) return fail(warmup.error, warmup.errorCode);

  // Disk is source of truth — warmup is currently a no-op and MMKV must not claim complete alone.
  if (args.verifyReady) {
    const onDisk = await args.verifyReady(activeTier);
    if (!onDisk.success) return fail(onDisk.error, onDisk.errorCode ?? AppErrorCode.MODEL_MISSING);
  }

  machine = apply(machine, { type: 'VERIFIED' });
  args.onUpdate({ machine, progress: 1, phaseLabel: 'Complete', error: null });
  return { success: true, data: undefined };
};
