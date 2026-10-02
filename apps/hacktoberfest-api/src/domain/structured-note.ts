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

const isPlaceholder = (value: string): boolean => {
  const t = value.trim();
  return t === '...' || t === '…' || /^[.…]{2,}$/.test(t);
};

/** Find balanced `{...}` objects in model text (handles prose wrappers). */
export const extractJsonCandidates = (raw: string): string[] => {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1]?.trim() ?? trimmed;
  const candidates: string[] = [];

  for (let i = 0; i < source.length; i += 1) {
    if (source[i] !== '{') continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < source.length; j += 1) {
      const ch = source[j];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === '{') depth += 1;
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          candidates.push(source.slice(i, j + 1));
          i = j;
          break;
        }
      }
    }
  }

  return candidates;
};

/** @deprecated prefer extractJsonCandidates; kept for tests */
export const extractJsonText = (raw: string): string =>
  extractJsonCandidates(raw)[0] ?? raw.trim();

const validateParsed = (parsed: unknown): ValidateNoteResult => {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'llm_invalid_json' };
  }

  const record = parsed as Record<string, unknown>;
  const note = {} as StructuredNote;
  const missing: string[] = [];

  for (const key of STRUCTURED_NOTE_KEYS) {
    const value = record[key];
    if (
      typeof value !== 'string' ||
      value.trim().length < MIN_SECTION_LEN ||
      isPlaceholder(value)
    ) {
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

export const validateStructuredNote = (raw: string): ValidateNoteResult => {
  const candidates = extractJsonCandidates(raw);
  if (candidates.length === 0) {
    return { ok: false, error: 'llm_invalid_json' };
  }

  let lastError = 'llm_invalid_json';
  for (const candidate of candidates) {
    try {
      const result = validateParsed(JSON.parse(candidate));
      if (result.ok) return result;
      lastError = result.error;
    } catch {
      lastError = 'llm_invalid_json';
    }
  }

  return { ok: false, error: lastError };
};
