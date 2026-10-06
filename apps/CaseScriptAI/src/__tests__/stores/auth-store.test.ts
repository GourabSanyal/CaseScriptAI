import { createAuthStore } from '@/stores/auth-store';

import type { StateStorage } from 'zustand/middleware';

const createMemoryStorage = (): StateStorage => {
  const values = new Map<string, string>();
  return {
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => {
      values.set(name, value);
    },
    removeItem: (name) => {
      values.delete(name);
    },
  };
};

describe('auth-store', () => {
  it('stores therapist session and signs out', () => {
    const store = createAuthStore(createMemoryStorage());
    const result = store.getState().signInTherapist({
      email: 'doc@clinic.com',
      password: 'secret1',
    });
    expect(result.success).toBe(true);
    expect(store.getState().session?.role).toBe('therapist');

    store.getState().signOut();
    expect(store.getState().session).toBeNull();
  });

  it('stores patient session from invite join', () => {
    const store = createAuthStore(createMemoryStorage());
    const result = store.getState().joinPatient({ inviteCode: 'JOIN-DEMO' });
    expect(result.success).toBe(true);
    expect(store.getState().session?.role).toBe('patient');
  });

  it('keeps lastError on invalid therapist login', () => {
    const store = createAuthStore(createMemoryStorage());
    store.getState().signInTherapist({ email: 'bad', password: 'x' });
    expect(store.getState().session).toBeNull();
    expect(store.getState().lastError).toBeTruthy();
  });
});
