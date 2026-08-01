import { AppErrorCode, type Result } from '@/types/result';

const MIN_LENGTH = 50;
const REQUIRED = ['Subjective', 'Objective', 'Assessment', 'Plan'] as const;

const stripMeta = (raw: string): string =>
  raw
    .replace(/^\s*(here is (your )?soap note[:\s]*)/i, '')
    .replace(/^\s*(sure[,!]?\s*)/i, '')
    .replace(/\n?\s*(let me know if you need.*)$/i, '')
    .trim();

/** Validates LLM SOAP output before UI display (ARCHITECTURE / ai-pipeline). */
export const validateSoapOutput = (raw: string): Result<string> => {
  const text = stripMeta(raw ?? '');
  if (text.length < MIN_LENGTH) {
    return {
      success: false,
      error: 'SOAP output too short or empty',
      errorCode: AppErrorCode.LLM_GENERATION_FAILED,
    };
  }
  const missing = REQUIRED.filter(
    (section) => !new RegExp(section, 'i').test(text),
  );
  if (missing.length > 0) {
    return {
      success: false,
      error: `SOAP missing sections: ${missing.join(', ')}`,
      errorCode: AppErrorCode.LLM_GENERATION_FAILED,
    };
  }
  return { success: true, data: text };
};
