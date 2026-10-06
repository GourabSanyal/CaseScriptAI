import {
  DEMO_INVITE_CODE,
  continueAsTherapistDemo,
  joinAsPatientDemo,
  signInTherapistDemo,
} from '@/services/auth/demo-auth-service';

describe('demo-auth-service', () => {
  it('signs in a therapist with valid demo credentials', () => {
    const result = signInTherapistDemo({
      email: 'ada@clinic.com',
      password: 'secret1',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.role).toBe('therapist');
    expect(result.data.displayName).toContain('Ada');
  });

  it('rejects short therapist passwords', () => {
    const result = signInTherapistDemo({ email: 'ada@clinic.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('continues as therapist demo', () => {
    const result = continueAsTherapistDemo();
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.role).toBe('therapist');
  });

  it('joins a patient with the demo invite code', () => {
    const result = joinAsPatientDemo({
      inviteCode: DEMO_INVITE_CODE.toLowerCase(),
      displayName: 'Sam',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.role).toBe('patient');
    expect(result.data.displayName).toBe('Sam');
  });

  it('rejects short invite codes', () => {
    const result = joinAsPatientDemo({ inviteCode: 'AB' });
    expect(result.success).toBe(false);
  });
});
