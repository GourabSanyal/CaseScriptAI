import { verifyToken } from '@clerk/backend';

export type ClerkClaims = {
  sub: string;
  email?: string;
};

export type VerifyClerkToken = (token: string) => Promise<ClerkClaims>;

type VerifyTokenImpl = (
  token: string,
  options: { secretKey: string },
) => Promise<Record<string, unknown>>;

type CreateVerifierOpts = {
  secretKey: string;
  verifyTokenImpl?: VerifyTokenImpl;
};

const readEmail = (payload: Record<string, unknown>): string | undefined => {
  const email = payload.email;
  if (typeof email === 'string' && email.trim()) return email.trim();
  return undefined;
};

export const createClerkTokenVerifier = (
  opts: CreateVerifierOpts,
): VerifyClerkToken => {
  const impl = opts.verifyTokenImpl ?? verifyToken;

  return async (token: string): Promise<ClerkClaims> => {
    try {
      const payload = await impl(token, { secretKey: opts.secretKey });
      const sub = payload.sub;
      if (typeof sub !== 'string' || !sub) {
        throw new Error('auth_invalid');
      }
      return { sub, email: readEmail(payload) };
    } catch {
      throw new Error('auth_invalid');
    }
  };
};
