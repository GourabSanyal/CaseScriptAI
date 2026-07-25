import { AudioRecorderService } from '@/services/audio/audio-recorder-service';
import { AppErrorCode } from '@/types/result';

import type { AudioCapturePort, AudioRecorderDependencies } from '@/types/recording';

const pcm = (bytes: number): Uint8Array => new Uint8Array(bytes).fill(1);

const createCapture = (): AudioCapturePort & {
  onPcm: ((data: Uint8Array) => void | Promise<void>) | null;
  paused: boolean;
} => {
  const capture = {
    onPcm: null as ((data: Uint8Array) => void | Promise<void>) | null,
    paused: false,
    requestPermission: async () => ({ success: true as const, data: undefined }),
    start: async (onPcm: (data: Uint8Array) => void | Promise<void>) => {
      capture.onPcm = onPcm;
      return { success: true as const, data: undefined };
    },
    pause: async () => {
      capture.paused = true;
      return { success: true as const, data: undefined };
    },
    resume: async () => {
      capture.paused = false;
      return { success: true as const, data: undefined };
    },
    stop: async () => ({ success: true as const, data: undefined }),
  };
  return capture;
};

describe('AudioRecorderService', () => {
  it('flushes ~30s worth of PCM into path-only queue entries', async () => {
    const capture = createCapture();
    const enqueued: { sequence: number; path: string }[] = [];

    const deps: AudioRecorderDependencies = {
      capture,
      chunkDurationMs: 1_000,
      writeChunk: async ({ sequence }) => ({
        success: true,
        data: { path: `/chunks/${sequence}.wav`, id: `id-${sequence}` },
      }),
      enqueueChunk: async (chunk) => {
        enqueued.push({ sequence: chunk.sequence, path: chunk.path });
        return { success: true, data: undefined };
      },
      clock: {
        now: () => 0,
        every: () => () => undefined,
      },
    };

    const recorder = new AudioRecorderService(deps);
    expect(await recorder.start('s1')).toEqual({ success: true, data: undefined });

    // 1s @ 16k mono 16-bit = 32000 bytes
    await capture.onPcm?.(pcm(32_000));
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]).toEqual({ sequence: 0, path: '/chunks/0.wav' });

    await capture.onPcm?.(pcm(10_000));
    const stopped = await recorder.stop();
    expect(enqueued).toHaveLength(2);
    expect(stopped).toEqual({ success: true, data: { sessionId: 's1', chunkCount: 2 } });
  });

  it('returns AUDIO_PERMISSION when mic access is denied', async () => {
    const capture = createCapture();
    capture.requestPermission = async () => ({
      success: false,
      error: 'no mic',
      errorCode: AppErrorCode.AUDIO_PERMISSION,
    });

    const recorder = new AudioRecorderService({
      capture,
      writeChunk: async () => ({ success: true, data: { path: '/x', id: 'x' } }),
      enqueueChunk: async () => ({ success: true, data: undefined }),
      clock: { now: () => 0, every: () => () => undefined },
    });

    const result = await recorder.start('s1');
    expect(result).toMatchObject({
      success: false,
      errorCode: AppErrorCode.AUDIO_PERMISSION,
    });
  });

  it('ignores PCM while paused and resumes capture afterward', async () => {
    const capture = createCapture();
    const enqueued: number[] = [];
    const recorder = new AudioRecorderService({
      capture,
      chunkDurationMs: 1_000,
      writeChunk: async ({ sequence }) => ({
        success: true,
        data: { path: `/c/${sequence}.wav`, id: `${sequence}` },
      }),
      enqueueChunk: async ({ sequence }) => {
        enqueued.push(sequence);
        return { success: true, data: undefined };
      },
      clock: { now: () => 0, every: () => () => undefined },
    });

    await recorder.start('s1');
    await recorder.pause();
    await capture.onPcm?.(pcm(32_000));
    expect(enqueued).toHaveLength(0);
    await recorder.resume();
    await capture.onPcm?.(pcm(32_000));
    expect(enqueued).toEqual([0]);
  });
});
