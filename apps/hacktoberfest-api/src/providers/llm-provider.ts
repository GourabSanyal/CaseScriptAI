/** Port for note-generation LLMs. Implementations call hosted open-weight APIs. */
export type LlmProvider = {
  complete: (prompt: string) => Promise<string>;
};
