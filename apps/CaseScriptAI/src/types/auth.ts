export type UserRole = 'therapist' | 'patient';

export type AuthSession = {
  role: UserRole;
  displayName: string;
  /** Demo / local only until C1 issues real tokens. */
  token: string;
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
