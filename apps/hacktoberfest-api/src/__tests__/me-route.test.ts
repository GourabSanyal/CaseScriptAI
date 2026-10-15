import assert from 'node:assert/strict';
import http from 'node:http';
import { describe, it } from 'node:test';
import { createServer } from '../create-server.js';
import type { AppUser } from '../db/user-repository.js';

async function withServer(
  server: http.Server,
  run: (base: string) => Promise<void>,
): Promise<void> {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe('GET /me', () => {
  const user: AppUser = {
    id: '11111111-1111-1111-1111-111111111111',
    clerkUserId: 'user_abc',
    email: 'ada@clinic.com',
    role: 'therapist',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastSeenAt: new Date('2026-01-02T00:00:00Z'),
  };

  it('returns 401 auth_missing without Authorization', async () => {
    const server = createServer({
      verifyClerkToken: async () => ({ sub: 'x' }),
      upsertUserByClerkId: async () => user,
    });
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/me`);
      const body = await res.json();
      assert.equal(res.status, 401);
      assert.deepEqual(body, { ok: false, error: 'auth_missing' });
    });
  });

  it('returns 401 auth_invalid for bad token', async () => {
    const server = createServer({
      verifyClerkToken: async () => {
        throw new Error('auth_invalid');
      },
      upsertUserByClerkId: async () => user,
    });
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/me`, {
        headers: { Authorization: 'Bearer bad' },
      });
      const body = await res.json();
      assert.equal(res.status, 401);
      assert.deepEqual(body, { ok: false, error: 'auth_invalid' });
    });
  });

  it('upserts and returns id, email, role from DB', async () => {
    let sawClerkId = '';
    let sawEmail: string | null | undefined;
    const server = createServer({
      verifyClerkToken: async (token) => {
        assert.equal(token, 'good-jwt');
        return { sub: 'user_abc', email: 'ada@clinic.com' };
      },
      upsertUserByClerkId: async (input) => {
        sawClerkId = input.clerkUserId;
        sawEmail = input.email;
        return user;
      },
    });

    await withServer(server, async (base) => {
      const res = await fetch(`${base}/me`, {
        headers: { Authorization: 'Bearer good-jwt' },
      });
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.deepEqual(body, {
        id: user.id,
        email: 'ada@clinic.com',
        role: 'therapist',
      });
      assert.equal(sawClerkId, 'user_abc');
      assert.equal(sawEmail, 'ada@clinic.com');
    });
  });

  it('returns 503 when auth deps are missing', async () => {
    const server = createServer();
    await withServer(server, async (base) => {
      const res = await fetch(`${base}/me`, {
        headers: { Authorization: 'Bearer x' },
      });
      const body = await res.json();
      assert.equal(res.status, 503);
      assert.deepEqual(body, { ok: false, error: 'auth_unavailable' });
    });
  });
});
