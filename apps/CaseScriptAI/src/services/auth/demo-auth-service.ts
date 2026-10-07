import type { AuthSession, PatientJoinInput, TherapistLoginInput } from '@/types/auth';
import type { Result } from '@/types/result';

const DEMO_PATIENT_CODE = 'JOIN-DEMO';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const displayNameFromEmail = (email: string) => {
  const local = normalizeEmail(email).split('@')[0] ?? 'Therapist';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Therapist';
};

export const signInTherapistDemo = (
  input: TherapistLoginInput,
): Result<AuthSession> => {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  if (!email.includes('@')) {
    return { success: false, error: 'Enter a valid email address' };
  }
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }
  return {
    success: true,
    data: {
      role: 'therapist',
      displayName: displayNameFromEmail(email),
      token: `demo-therapist-${email}`,
      createdAt: Date.now(),
    },
  };
};

export const continueAsTherapistDemo = (): Result<AuthSession> =>
  signInTherapistDemo({ email: 'demo.therapist@casescript.ai', password: 'demo-pass' });

/** Demo join: `JOIN-DEMO` or any code ≥6 chars (real invite validation is C1). */
export const joinAsPatientDemo = (input: PatientJoinInput): Result<AuthSession> => {
  const code = input.inviteCode.trim().toUpperCase();
  if (code.length < 6) {
    return { success: false, error: 'Enter a valid invite code' };
  }
  const name = input.displayName?.trim() || 'Patient';
  return {
    success: true,
    data: {
      role: 'patient',
      displayName: name,
      token: `demo-patient-${code}`,
      createdAt: Date.now(),
    },
  };
};

export const DEMO_INVITE_CODE = DEMO_PATIENT_CODE;
