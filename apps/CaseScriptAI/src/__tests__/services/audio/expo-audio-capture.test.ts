import { pcmPayloadFromWavBytes } from '@/services/audio/wav-pcm';

describe('pcmPayloadFromWavBytes', () => {
  it('strips a 44-byte WAV header', () => {
    const wav = new Uint8Array(44 + 4);
    wav[44] = 1;
    wav[45] = 2;
    wav[46] = 3;
    wav[47] = 4;
    expect(Array.from(pcmPayloadFromWavBytes(wav))).toEqual([1, 2, 3, 4]);
  });

  it('returns empty for tiny buffers', () => {
    expect(pcmPayloadFromWavBytes(new Uint8Array(10)).byteLength).toBe(0);
  });
});
