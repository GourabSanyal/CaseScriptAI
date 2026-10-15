import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VerifyClerkToken } from '../auth/verify-clerk-token.js';
import type { UpsertUserInput, AppUser } from '../db/user-repository.js';

export type MeRouteDeps = {
  verifyClerkToken: VerifyClerkToken;
  upsertUserByClerkId: (input: UpsertUserInput) => Promise<AppUser>;
  sendJson: (res: ServerResponse, status: number, body: unknown) => void;
};

const bearerToken = (req: IncomingMessage): string | null => {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
};

export const handleGetMe = async (
  req: IncomingMessage,
  res: ServerResponse,
  deps: MeRouteDeps,
): Promise<void> => {
  const token = bearerToken(req);
  if (!token) {
    deps.sendJson(res, 401, { ok: false, error: 'auth_missing' });
    return;
  }

  let claims: { sub: string; email?: string };
  try {
    claims = await deps.verifyClerkToken(token);
  } catch {
    deps.sendJson(res, 401, { ok: false, error: 'auth_invalid' });
    return;
  }

  const user = await deps.upsertUserByClerkId({
    clerkUserId: claims.sub,
    email: claims.email ?? null,
  });

  deps.sendJson(res, 200, {
    id: user.id,
    email: user.email,
    role: user.role,
  });
};
