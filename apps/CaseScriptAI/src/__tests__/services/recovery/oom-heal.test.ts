import { healOom } from '@/services/recovery/oom-heal';

import type { TierSelection } from '@/types/device';

describe('oom-heal', () => {
  it('downgrades pro → standard and persists', () => {
    const persisted: TierSelection[] = [];
    const result = healOom('pro', (selection) => persisted.push(selection));
    expect(result).toEqual({
      success: true,
      data: { healed: true, tier: 'standard' },
    });
    expect(persisted[0]).toMatchObject({
      tier: 'standard',
      modelId: 'qwen3-1.7b-quantized',
      reason: 'compute-downgrade',
    });
  });

  it('downgrades standard → lite', () => {
    expect(healOom('standard', () => undefined)).toEqual({
      success: true,
      data: { healed: true, tier: 'lite' },
    });
  });

  it('does not swap when already lite', () => {
    const persist = jest.fn();
    expect(healOom('lite', persist)).toEqual({
      success: true,
      data: { healed: false, tier: 'lite' },
    });
    expect(persist).not.toHaveBeenCalled();
  });

  it('fails when no tier is selected', () => {
    expect(healOom(null, () => undefined).success).toBe(false);
  });
});
