import type { Result } from '@/types/result';

export type SessionStatus =
  | 'recording'
  | 'queued'
  | 'processing'
  | 'complete'
  | 'failed';

export type Session = {
  id: string;
  status: SessionStatus;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  durationMs?: number;
  patientName?: string;
  patientId?: string;
  notes?: string;
  /** Encrypted SOAP file path (no plaintext PHI in SQLite). */
  soapPath?: string;
  soapIv?: string;
  soapTag?: string;
  transcriptPath?: string;
};

export type SessionSearchFilter = {
  /** Inclusive start (ms). */
  fromMs?: number;
  /** Inclusive end (ms). */
  toMs?: number;
  /** Case-insensitive substring on patientName or patientId. */
  patientQuery?: string;
  status?: SessionStatus;
};

export type SessionRepository = {
  upsert: (session: Session) => Promise<Result<void>>;
  getById: (id: string) => Promise<Result<Session | null>>;
  list: (filter?: SessionSearchFilter) => Promise<Result<Session[]>>;
  remove: (id: string) => Promise<Result<void>>;
};

export type SessionStore = {
  items: Session[];
  hasHydrated: boolean;
  error: string | null;
  hydrate: () => Promise<Result<void>>;
  search: (filter?: SessionSearchFilter) => Promise<Result<Session[]>>;
  upsertLocal: (session: Session) => Promise<Result<void>>;
  updatePatient: (
    id: string,
    fields: Pick<Session, 'patientName' | 'patientId' | 'notes'>,
  ) => Promise<Result<void>>;
};
