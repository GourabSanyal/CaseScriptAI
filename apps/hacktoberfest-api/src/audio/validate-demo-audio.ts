/** H9.1 — caps for optional demo audio upload (fixture is ~5.7MB / ~2–3 min). */
export const DEMO_AUDIO_MAX_BYTES = 8 * 1024 * 1024;
export const DEMO_AUDIO_MAX_DURATION_SEC = 180;
/** Used only to estimate MP3 duration from size (CBR approximation). */
const MP3_BITRATE_BPS = 128_000;

export type DemoAudioFormat = 'wav' | 'mp3';

export type DemoAudioOk = {
  ok: true;
  format: DemoAudioFormat;
  durationSec: number;
};

export type DemoAudioErr = {
  ok: false;
  error: 'audio_invalid_type' | 'audio_too_large' | 'audio_too_long';
};

export type DemoAudioResult = DemoAudioOk | DemoAudioErr;

const isWav = (bytes: Buffer): boolean =>
  bytes.length >= 12 &&
  bytes.toString('ascii', 0, 4) === 'RIFF' &&
  bytes.toString('ascii', 8, 12) === 'WAVE';

const isMp3 = (bytes: Buffer): boolean => {
  if (bytes.length < 3) return false;
  if (bytes.toString('ascii', 0, 3) === 'ID3') return true;
  // MPEG frame sync
  return bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
};

const wavDurationSec = (bytes: Buffer): number | null => {
  if (bytes.length < 44) return null;
  let offset = 12;
  let sampleRate = 0;
  let channels = 1;
  let bitsPerSample = 16;
  let dataBytes = 0;

  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    if (id === 'fmt ' && size >= 16 && chunkStart + 16 <= bytes.length) {
      channels = bytes.readUInt16LE(chunkStart + 2);
      sampleRate = bytes.readUInt32LE(chunkStart + 4);
      bitsPerSample = bytes.readUInt16LE(chunkStart + 14);
    } else if (id === 'data') {
      dataBytes = size;
      break;
    }
    offset = chunkStart + size + (size % 2);
  }

  if (!sampleRate || !dataBytes || !channels || !bitsPerSample) return null;
  const bytesPerSample = (bitsPerSample / 8) * channels;
  if (bytesPerSample <= 0) return null;
  return dataBytes / (sampleRate * bytesPerSample);
};

const mp3DurationSec = (bytes: Buffer): number =>
  (bytes.length * 8) / MP3_BITRATE_BPS;

/** Validate uploaded demo audio bytes (no disk I/O; never logs contents). */
export const validateDemoAudio = (bytes: Buffer): DemoAudioResult => {
  if (bytes.length > DEMO_AUDIO_MAX_BYTES) {
    return { ok: false, error: 'audio_too_large' };
  }

  if (isWav(bytes)) {
    const durationSec = wavDurationSec(bytes);
    if (durationSec === null) {
      return { ok: false, error: 'audio_invalid_type' };
    }
    if (durationSec > DEMO_AUDIO_MAX_DURATION_SEC) {
      return { ok: false, error: 'audio_too_long' };
    }
    return { ok: true, format: 'wav', durationSec };
  }

  if (isMp3(bytes)) {
    const durationSec = mp3DurationSec(bytes);
    if (durationSec > DEMO_AUDIO_MAX_DURATION_SEC) {
      return { ok: false, error: 'audio_too_long' };
    }
    return { ok: true, format: 'mp3', durationSec };
  }

  return { ok: false, error: 'audio_invalid_type' };
};
