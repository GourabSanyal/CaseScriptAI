/** Server-only structured note prompt (SOAP-shaped JSON). Never log the transcript. */
export const buildStructuredNotePrompt = (transcript: string): string => `
You are a clinical documentation assistant for a therapy session demo.
Convert the transcript into a structured SOAP note as JSON.

STRICT OUTPUT RULES:
- Output ONLY one JSON object and nothing else
- No markdown fences, no bullet lists, no role replay, no preamble
- Use exactly these keys: "subjective", "objective", "assessment", "plan"
- Each value must be a real non-empty sentence from the transcript (not "...")
- Do not invent findings absent from the transcript
- Missing data → write "[not documented]"
- This is synthetic demo data, not a real clinical record

---
Transcript:
${transcript}
`.trim();

export const buildStructuredNoteRetryPrompt = (transcript: string): string => `
${buildStructuredNotePrompt(transcript)}

RETRY: Your previous output was invalid. Respond with ONLY valid JSON matching the schema.
`.trim();
