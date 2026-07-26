const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BIT_DEPTH = 16;

const writeAscii = (view: DataView, offset: number, value: string): void => {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
};

/** Canonical 44-byte PCM WAV header for Whisper-ready chunks. */
export const buildWavHeader = (
  dataLength: number,
  sampleRate = SAMPLE_RATE,
  channels = CHANNELS,
  bitDepth = BIT_DEPTH,
): Uint8Array => {
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const blockAlign = (channels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  return new Uint8Array(buffer);
};

export const pcmBytesForDurationMs = (durationMs: number): number => {
  const samples = Math.floor((SAMPLE_RATE * Math.max(0, durationMs)) / 1000);
  return samples * CHANNELS * (BIT_DEPTH / 8);
};

export const concatBytes = (parts: readonly Uint8Array[]): Uint8Array => {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
};

export const wrapPcmAsWav = (pcm: Uint8Array): Uint8Array =>
  concatBytes([buildWavHeader(pcm.byteLength), pcm]);

export const WAV_TARGET = {
  sampleRate: SAMPLE_RATE,
  channels: CHANNELS,
  bitDepth: BIT_DEPTH,
} as const;
