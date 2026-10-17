import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RATE_LIMIT_GLOBAL_DAY,
  RATE_LIMIT_PER_IP_HOUR,
  checkDemoRateLimit,
  evaluateRateLimit,
  type RateLimitStore,
} from '../http/rate-limit.js';

describe('evaluateRateLimit', () => {
  it('allows under caps', () => {
    assert.equal(
      evaluateRateLimit({ perIpHour: 2, globalDay: 10 }),
      'ok',
    );
  });

  it('blocks at per-IP hour cap', () => {
    assert.equal(
      evaluateRateLimit({
        perIpHour: RATE_LIMIT_PER_IP_HOUR,
        globalDay: 0,
      }),
      'rate_limited',
    );
  });

  it('blocks at global day cap', () => {
    assert.equal(
      evaluateRateLimit({
        perIpHour: 0,
        globalDay: RATE_LIMIT_GLOBAL_DAY,
      }),
      'rate_limited',
    );
  });
});

describe('checkDemoRateLimit', () => {
  it('returns rate_limited when store reports N at cap', async () => {
    const store: RateLimitStore = {
      countStartsByIpHash: async () => RATE_LIMIT_PER_IP_HOUR,
      countStartsGlobal: async () => 1,
    };
    assert.equal(await checkDemoRateLimit(store, 'abc'), 'rate_limited');
  });

  it('returns ok under limits', async () => {
    const store: RateLimitStore = {
      countStartsByIpHash: async () => 0,
      countStartsGlobal: async () => 0,
    };
    assert.equal(await checkDemoRateLimit(store, 'abc'), 'ok');
  });
});
