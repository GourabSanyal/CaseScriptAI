/** Port for speech-to-text. Implementations call hosted Whisper APIs. */
export type SttProvider = {
  transcribeFile: (audioPath: string) => Promise<string>;
};
