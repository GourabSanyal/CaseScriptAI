import { resolveMotionBudget } from '@/utils/motion-budget';

describe('resolveMotionBudget', () => {
  it('returns none when reduce motion is enabled', () => {
    expect(resolveMotionBudget(true, 'pro')).toBe('none');
  });

  it('returns essential for lite or unknown tier', () => {
    expect(resolveMotionBudget(false, 'lite')).toBe('essential');
    expect(resolveMotionBudget(false, null)).toBe('essential');
  });

  it('returns full for standard and pro', () => {
    expect(resolveMotionBudget(false, 'standard')).toBe('full');
    expect(resolveMotionBudget(false, 'pro')).toBe('full');
  });
});
