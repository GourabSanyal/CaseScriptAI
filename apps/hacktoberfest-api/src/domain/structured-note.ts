export const STRUCTURED_NOTE_KEYS = [
  'subjective',
  'objective',
  'assessment',
  'plan',
] as const;

export type StructuredNoteKey = (typeof STRUCTURED_NOTE_KEYS)[number];

export type StructuredNote = Record<StructuredNoteKey, string>;

export type ValidateNoteResult =
  | { ok: true; note: StructuredNote }
  | { ok: false; error: string };

const MIN_SECTION_LEN = 3;

/** Strip ```json fences if the model wraps output. */
export const extractJsonText = (raw: string): string => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
};

export const validateStructuredNote = (raw: string): ValidateNoteResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonText(raw));
  } catch {
    return { ok: false, error: 'llm_invalid_json' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'llm_invalid_json' };
  }

  const record = parsed as Record<string, unknown>;
  const note = {} as StructuredNote;
  const missing: string[] = [];

  for (const key of STRUCTURED_NOTE_KEYS) {
    const value = record[key];
    if (typeof value !== 'string' || value.trim().length < MIN_SECTION_LEN) {
      missing.push(key);
      continue;
    }
    note[key] = value.trim();
  }

  if (missing.length > 0) {
    return { ok: false, error: `llm_missing_sections:${missing.join(',')}` };
  }

  return { ok: true, note };
};
