import { wrapPcmAsWav } from '@/services/audio/wav-pcm';
import type { Result } from '@/types/result';

export type AtomicFileWriter = {
  writeAtomic: (finalPath: string, bytes: Uint8Array) => Promise<Result<void>>;
};

export type ChunkPathFactory = (sessionId: string, sequence: number) => string;

export const createWavChunkWriter = (
  writeAtomic: AtomicFileWriter['writeAtomic'],
  chunkPath: ChunkPathFactory,
) => ({
  writeChunk: async (input: {
    sessionId: string;
    sequence: number;
    pcm: Uint8Array;
  }): Promise<Result<{ path: string; id: string }>> => {
    if (!input.sessionId.trim() || input.sequence < 0 || !Number.isInteger(input.sequence)) {
      return { success: false, error: 'Invalid chunk metadata' };
    }
    if (input.pcm.byteLength === 0) {
      return { success: false, error: 'Refusing to write an empty audio chunk' };
    }

    const path = chunkPath(input.sessionId, input.sequence);
    const wav = wrapPcmAsWav(input.pcm);
    const written = await writeAtomic(path, wav);
    if (!written.success) return written;

    return {
      success: true,
      data: { path, id: `${input.sessionId}-${input.sequence}` },
    };
  },
});
