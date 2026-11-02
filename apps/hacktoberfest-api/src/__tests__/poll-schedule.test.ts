import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  NETWORK_FAIL_LIMIT,
  POLL_MAX_WAIT_MS,
  WAKE_TIMEOUT_MS,
  isPollTimedOut,
  nextPollDelayMs,
} from '../demo-ui/poll-schedule.js';

describe('nextPollDelayMs', () => {
  it('uses 1s for the first 5 completed polls, then 2s × 10, then 5s', () => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal(nextPollDelayMs(i), 1_000, `poll ${i}`);
    }
    for (let i = 5; i < 15; i += 1) {
      assert.equal(nextPollDelayMs(i), 2_000, `poll ${i}`);
    }
    assert.equal(nextPollDelayMs(15), 5_000);
    assert.equal(nextPollDelayMs(100), 5_000);
  });
});

describe('poll / wake limits', () => {
  it('caps poll wait at 3 minutes and wake at 90s', () => {
    assert.equal(POLL_MAX_WAIT_MS, 180_000);
    assert.equal(WAKE_TIMEOUT_MS, 90_000);
    assert.equal(NETWORK_FAIL_LIMIT, 3);
    assert.equal(isPollTimedOut(179_999), false);
    assert.equal(isPollTimedOut(180_000), true);
  });
});
