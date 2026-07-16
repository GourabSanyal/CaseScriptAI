jest.mock('@/services/storage/mmkv', () => ({
  appZustandMMKVStorage: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  },
}));

import { createDeviceStore } from '@/stores/device-store';

import type { DeviceCapability } from '@/types/device';
import type { StateStorage } from 'zustand/middleware';

const capability: DeviceCapability = {
  totalRamBytes: 8 * 1024 ** 3,
  availableDiskBytes: 20 * 1024 ** 3,
  osName: 'iOS',
  osVersion: '18',
  cpuScore: 10_000,
  assessedAt: 1,
  assessmentVersion: 1,
};

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

describe('device-store', () => {
  it('assesses, selects, and downgrades a tier', async () => {
    const store = createDeviceStore(
      async () => ({ success: true, data: capability }),
      createMemoryStorage(),
    );

    expect(await store.getState().assessAndSelect()).toMatchObject({
      success: true,
      data: { tier: 'pro' },
    });
    expect(store.getState()).toMatchObject({ status: 'ready', error: null });
    expect(store.getState().downgradeAfterWarmupFailure()).toMatchObject({
      success: true,
      data: { tier: 'standard' },
    });
  });

  it('moves to failed when assessment fails', async () => {
    const store = createDeviceStore(
      async () => ({ success: false, error: 'device unavailable' }),
      createMemoryStorage(),
    );

    expect((await store.getState().assessAndSelect()).success).toBe(false);
    expect(store.getState()).toMatchObject({
      status: 'failed',
      error: 'device unavailable',
      capability: null,
    });
  });

  it('persists capability and selection but not transient failures', async () => {
    const storage = createMemoryStorage();
    const first = createDeviceStore(async () => ({ success: true, data: capability }), storage);
    await first.getState().assessAndSelect();

    const restored = createDeviceStore(async () => ({ success: false, error: 'unused' }), storage);

    expect(restored.getState()).toMatchObject({
      capability,
      selection: { tier: 'pro' },
      status: 'ready',
      error: null,
      hasHydrated: true,
    });
  });

  it('does not downgrade below Lite or run concurrent assessments', async () => {
    let resolveAssessment: ((value: { success: true; data: DeviceCapability }) => void) | undefined;
    const pending = new Promise<{ success: true; data: DeviceCapability }>((resolve) => {
      resolveAssessment = resolve;
    });
    const store = createDeviceStore(() => pending, createMemoryStorage());
    const first = store.getState().assessAndSelect();

    expect((await store.getState().assessAndSelect()).success).toBe(false);
    resolveAssessment?.({ success: true, data: { ...capability, totalRamBytes: 3 * 1024 ** 3 } });
    await first;
    expect(store.getState().downgradeAfterWarmupFailure().success).toBe(false);
  });
});
