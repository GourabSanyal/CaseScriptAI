describe("wav-parser", () => {
  // code for resampleAudio - unit tests
  // test 1: should keep output length proportional to sample-rate ratio
  // test 2: should interpolate adjacent samples using linear interpolation

  // code for parseWavData - unit tests
  // test 3: should parse valid 16-bit PCM WAV bytes into Float32Array
  // test 4: should throw when WAV data is shorter than header minimum
  // test 5: should throw when bitsPerSample is not 16
});
