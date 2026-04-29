describe("PipelineSection integration", () => {
  // code for Pipeline section - happy flow
  // flow 1: audio selected -> transcription success -> llm success -> completion state

  // code for Pipeline section - transcription error flow
  // flow 2: should render Whisper error state and reset pipeline step

  // code for Pipeline section - llm error flow
  // flow 3: should render LLM error state after transcript is available
});
