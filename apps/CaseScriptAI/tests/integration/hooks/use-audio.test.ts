describe("useAudio integration", () => {
  // code for useAudio.handleAudioImport - integration tests
  // flow 1: should pick, convert, copy, cleanup, and store audio on happy flow
  // flow 2: should fallback to original file on Android conversion failure
  // flow 3: should abort and cleanup on copy failure

  // code for useAudio.playAudio/pauseAudio/seekTo - integration tests
  // flow 4: should control playback state for active audio
});
