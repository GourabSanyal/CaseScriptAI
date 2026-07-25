import { createWavChunkWriter } from '@/services/audio/wav-chunk-writer';
import { buildWavHeader, pcmBytesForDurationMs, wrapPcmAsWav } from '@/services/audio/wav-pcm';

describe('wav-pcm', () => {
  it('builds a 44-byte 16k mono PCM header', () => {
    const header = buildWavHeader(32000);
    expect(header.byteLength).toBe(44);
    expect(String.fromCharCode(...header.slice(0, 4))).toBe('RIFF');
    expect(header[22] | (header[23] << 8)).toBe(1);
    expect(header[24] | (header[25] << 8) | (header[26] << 16) | (header[27] << 24)).toBe(16000);
    expect(header[34] | (header[35] << 8)).toBe(16);
  });

  it('sizes ~30s of PCM at 16k/mono/16-bit', () => {
    expect(pcmBytesForDurationMs(30_000)).toBe(960_000);
  });

  it('wraps PCM with a matching data length', () => {
    const pcm = new Uint8Array(100);
    const wav = wrapPcmAsWav(pcm);
    expect(wav.byteLength).toBe(144);
    const dataLen = wav[40] | (wav[41] << 8) | (wav[42] << 16) | (wav[43] << 24);
    expect(dataLen).toBe(100);
  });
});

describe('wav-chunk-writer', () => {
  it('writes wav bytes atomically and rejects empty pcm', async () => {
    const writes: { path: string; bytes: Uint8Array }[] = [];
    const writer = createWavChunkWriter(async (path, bytes) => {
      writes.push({ path, bytes });
      return { success: true, data: undefined };
    }, (sessionId, sequence) => `/tmp/${sessionId}/${sequence}.wav`);

    const empty = await writer.writeChunk({
      sessionId: 's1',
      sequence: 0,
      pcm: new Uint8Array(),
    });
    expect(empty.success).toBe(false);

    const ok = await writer.writeChunk({
      sessionId: 's1',
      sequence: 0,
      pcm: new Uint8Array([1, 2, 3, 4]),
    });
    expect(ok).toEqual({
      success: true,
      data: { path: '/tmp/s1/0.wav', id: 's1-0' },
    });
    expect(writes[0]?.bytes.byteLength).toBe(48);
  });
});
