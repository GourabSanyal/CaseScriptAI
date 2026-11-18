import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_AUDIO_MAX_BYTES,
  DEMO_AUDIO_MAX_DURATION_SEC,
  validateDemoAudio,
} from '../audio/validate-demo-audio.js';

/** Minimal PCM WAV: 22050 Hz mono 16-bit, `frames` samples. */
const buildWav = (frames: number): Buffer => {
  const dataBytes = frames * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(22_050, 24);
  buffer.writeUInt32LE(22_050 * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  return buffer;
};

describe('validateDemoAudio', () => {
  it('rejects unknown magic bytes', () => {
    const result = validateDemoAudio(Buffer.from('not-audio'));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'audio_invalid_type');
  });

  it('rejects over size cap', () => {
    const huge = Buffer.alloc(DEMO_AUDIO_MAX_BYTES + 1, 0);
    huge.write('RIFF', 0);
    huge.write('WAVE', 8);
    const result = validateDemoAudio(huge);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'audio_too_large');
  });

  it('rejects WAV longer than duration cap', () => {
    const frames = 22_050 * (DEMO_AUDIO_MAX_DURATION_SEC + 5);
    const result = validateDemoAudio(buildWav(frames));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'audio_too_long');
  });

  it('accepts a short WAV', () => {
    const result = validateDemoAudio(buildWav(22_050)); // ~1s
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.format, 'wav');
      assert.ok(result.durationSec > 0.9 && result.durationSec < 1.1);
    }
  });

  it('accepts MP3 with ID3 magic within size/duration estimate', () => {
    // ~1s at 128kbps ≈ 16KB; ID3 header + payload
    const mp3 = Buffer.alloc(16_384, 0);
    mp3.write('ID3', 0);
    const result = validateDemoAudio(mp3);
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.format, 'mp3');
  });
});
