import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createClerkTokenVerifier } from '../auth/verify-clerk-token.js';

describe('createClerkTokenVerifier', () => {
  it('maps verified claims to sub + optional email', async () => {
    const verify = createClerkTokenVerifier({
      secretKey: 'sk_test',
      verifyTokenImpl: async (token, opts) => {
        assert.equal(token, 'good');
        assert.equal(opts.secretKey, 'sk_test');
        return { sub: 'user_abc', email: 'ada@clinic.com' };
      },
    });
    const claims = await verify('good');
    assert.deepEqual(claims, { sub: 'user_abc', email: 'ada@clinic.com' });
  });

  it('rejects missing sub without echoing token', async () => {
    const verify = createClerkTokenVerifier({
      secretKey: 'sk_test',
      verifyTokenImpl: async () => ({ email: 'x@y.com' }),
    });
    await assert.rejects(() => verify('tok-secret'), /auth_invalid/);
  });

  it('maps provider failures to auth_invalid', async () => {
    const verify = createClerkTokenVerifier({
      secretKey: 'sk_test',
      verifyTokenImpl: async () => {
        throw new Error('jwt expired detail');
      },
    });
    await assert.rejects(() => verify('bad'), (err: Error) => {
      assert.equal(err.message, 'auth_invalid');
      assert.equal(err.message.includes('jwt'), false);
      return true;
    });
  });
});
