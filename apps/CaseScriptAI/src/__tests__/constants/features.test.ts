import { LOCAL_ON_DEVICE_AI_ENABLED } from '@/constants/features';

describe('features', () => {
  it('keeps on-device model download off for external API builds', () => {
    expect(LOCAL_ON_DEVICE_AI_ENABLED).toBe(false);
  });
});
