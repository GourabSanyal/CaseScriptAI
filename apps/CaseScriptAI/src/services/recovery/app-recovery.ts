import type { AppRecoveryDeps, SessionRecoverySnapshot } from '@/types/recovery';

const BUSY: ReadonlySet<string> = new Set([
  'recording',
  'paused',
  'stopping',
  'requesting-permission',
  'orphaned',
]);

export const inspectSessionRecovery = (input: {
  recordingStatus: string;
  queueStatuses: string[];
}): SessionRecoverySnapshot => {
  const failedCount = input.queueStatuses.filter((s) => s === 'failed').length;
  const queuedCount = input.queueStatuses.filter(
    (s) => s === 'queued' || s === 'processing',
  ).length;
  return {
    orphanedRecording: input.recordingStatus === 'orphaned',
    failedCount,
    queuedCount,
    recordingBusy: BUSY.has(input.recordingStatus),
  };
};

/**
 * Launch + AppState foreground recovery. Pipeline drain stays in pipeline-background.
 * Does not auto-resume an orphaned recording.
 */
export const createAppRecoveryController = (deps: AppRecoveryDeps) => {
  let lastApp = 'active';
  let lastOnline = deps.isOnline();
  let stopped = false;

  const recover = async (opts: { announceFailedQueue: boolean }): Promise<void> => {
    deps.clearStaleLock(deps.isPipelineRunning());

    const sessions = deps.snapshotSessions();
    if (opts.announceFailedQueue && sessions.failedCount > 0) {
      deps.toast({
        message: 'Some sessions need attention.',
        variant: 'warning',
      });
    }

    if (!sessions.recordingBusy) {
      const models = await deps.checkModelsReady();
      if (models.success && !models.data.ready) {
        deps.toast({
          message: 'A model file is missing or damaged. Re-download required.',
          variant: 'warning',
        });
        // ponytail: do not flip boot destination here — that unmounts (app) and drops ExecuTorch binds
      }
    }

    if (deps.isOnline() && deps.shouldRetryDownload()) {
      deps.retryDownload();
    }
  };

  const unsubApp = deps.subscribeAppState((status) => {
    const becameActive = status === 'active' && lastApp !== 'active';
    lastApp = status;
    if (becameActive) void recover({ announceFailedQueue: false });
  });

  const unsubNet = deps.subscribeOnline((online) => {
    const becameOnline = online && !lastOnline;
    lastOnline = online;
    if (becameOnline && deps.shouldRetryDownload()) deps.retryDownload();
  });

  void recover({ announceFailedQueue: true });

  return {
    recover,
    stop: () => {
      if (stopped) return;
      stopped = true;
      unsubApp();
      unsubNet();
    },
  };
};
