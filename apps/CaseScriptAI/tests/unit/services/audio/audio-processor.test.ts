describe("audio-processor", () => {
  // code for convertToWav - unit tests
  // test 1: should return error when FFmpeg native module is unavailable
  // test 2: should return success with output file URI on successful conversion
  // test 3: should return conversion failed when FFmpeg return code is not success
  // test 4: should return readable error when dynamic import throws
  // test 5: should strip file:// scheme before FFmpeg command is executed
});
