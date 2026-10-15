export type UserRole = 'therapist' | 'patient';

export type AuthSession = {
  role: UserRole;
  displayName: string;
  /** Clerk JWT or demo token. Role always comes from server `/me` for Clerk. */
  token: string;
  /** Postgres `users.id` after H5A `/me` upsert. */
  userId?: string;
  createdAt: number;
};

/** Demo / __DEV__ only — production therapists use Google via Clerk. */
export type TherapistLoginInput = {
  email: string;
  password: string;
};

export type PatientJoinInput = {
  inviteCode: string;
  displayName?: string;
};
