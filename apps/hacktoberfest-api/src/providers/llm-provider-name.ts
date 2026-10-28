export type LlmProviderName = 'groq' | 'google';

export const parseLlmProvider = (raw: string | undefined): LlmProviderName => {
  const value = (raw ?? 'groq').trim().toLowerCase();
  if (value === 'google' || value === 'gemini' || value === 'gemma') {
    return 'google';
  }
  return 'groq';
};
