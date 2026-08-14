import { parseWavData } from '@/services/audio/wav-parser';
import { wrapPcmAsWav } from '@/services/audio/wav-pcm';

describe('parseWavData', () => {
  it('converts 16-bit PCM to float samples', () => {
    const pcm = new Uint8Array([0x00, 0x40, 0x00, 0xc0]);
    const samples = parseWavData(wrapPcmAsWav(pcm));
    expect(samples.length).toBe(2);
    expect(samples[0]).toBeCloseTo(0.5, 2);
    expect(samples[1]).toBeCloseTo(-0.5, 2);
  });

  it('rejects short buffers', () => {
    expect(() => parseWavData(new Uint8Array(10))).toThrow('too short');
  });
});
