import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractMultipartAudio } from '../audio/parse-multipart-audio.js';

const buildMultipart = (field: string, filename: string, bytes: Buffer): {
  body: Buffer;
  contentType: string;
} => {
  const boundary = '----CaseScriptBoundary7MA4YWxkTrZu0gW';
  const head =
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${field}"; filename="${filename}"\r\n` +
    `Content-Type: application/octet-stream\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat([Buffer.from(head), bytes, Buffer.from(tail)]),
  };
};

describe('extractMultipartAudio', () => {
  it('returns the audio file part bytes', () => {
    const payload = Buffer.from('RIFF....WAVEdata');
    const { body, contentType } = buildMultipart('audio', 'clip.wav', payload);
    const extracted = extractMultipartAudio(body, contentType);
    assert.ok(extracted);
    assert.deepEqual(extracted, payload);
  });

  it('returns null when audio field is missing', () => {
    const { body, contentType } = buildMultipart('file', 'clip.wav', Buffer.from('x'));
    assert.equal(extractMultipartAudio(body, contentType), null);
  });
});
