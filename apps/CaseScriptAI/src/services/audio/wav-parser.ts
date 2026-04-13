/**
 * Simple WAV file parser for 16-bit PCM data.
 * Adheres to 30-line service limit per GEMINI.md where possible.
 */

// Simple audio resampling (linear interpolation)
export const resampleAudio = (input: Float32Array, fromRate: number, toRate: number): Float32Array => {
  const ratio = toRate / fromRate;
  const outputLength = Math.floor(input.length * ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const inputIndex = i / ratio;
    const index = Math.floor(inputIndex);
    const fraction = inputIndex - index;

    if (index + 1 < input.length) {
      output[i] = input[index] * (1 - fraction) + input[index + 1] * fraction;
    } else {
      output[i] = input[index];
    }
  }

  return output;
};

/**
 * Parses WAV bytes into a Float32Array of samples.
 * Resamples to 16kHz if necessary for Whisper compatibility.
 */
export const parseWavData = (wavBytes: Uint8Array): Float32Array => {
  if (wavBytes.length < 44) throw new Error("Invalid WAV file: too short");

  const sampleRate = wavBytes[24] | (wavBytes[25] << 8) | (wavBytes[26] << 16) | (wavBytes[27] << 24);
  const numChannels = wavBytes[22] | (wavBytes[23] << 8);
  const bitsPerSample = wavBytes[34] | (wavBytes[35] << 8);

  if (bitsPerSample !== 16) {
    throw new Error(`Unsupported bits per sample: ${bitsPerSample}, expected 16`);
  }

  const dataOffset = 44;
  const numSamples = (wavBytes.length - dataOffset) / 2 / numChannels;
  const audioBuffer = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const sampleOffset = dataOffset + (i * numChannels * 2);
    const sample = wavBytes[sampleOffset] | (wavBytes[sampleOffset + 1] << 8);
    audioBuffer[i] = (sample > 32767 ? sample - 65536 : sample) / 32768.0;
  }

  return sampleRate !== 16000 ? resampleAudio(audioBuffer, sampleRate, 16000) : audioBuffer;
};
