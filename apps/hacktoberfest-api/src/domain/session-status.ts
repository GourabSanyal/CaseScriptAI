export const SESSION_STATUSES = [
  'queued',
  'stt_running',
  'llm_running',
  'pdf_running',
  'ready',
  'failed',
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

const ALLOWED: Record<SessionStatus, readonly SessionStatus[]> = {
  queued: ['stt_running', 'failed'],
  stt_running: ['llm_running', 'failed'],
  llm_running: ['pdf_running', 'failed'],
  pdf_running: ['ready', 'failed'],
  ready: [],
  failed: [],
};

export const isSessionStatus = (value: string): value is SessionStatus =>
  (SESSION_STATUSES as readonly string[]).includes(value);

export const canTransition = (from: SessionStatus, to: SessionStatus): boolean =>
  ALLOWED[from].includes(to);

export const assertTransition = (from: SessionStatus, to: SessionStatus): void => {
  if (!canTransition(from, to)) {
    throw new Error(`invalid_status_transition:${from}->${to}`);
  }
};
