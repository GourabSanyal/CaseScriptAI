import {
  assessDeviceCapability,
  DEVICE_ASSESSMENT_VERSION,
  type DeviceCapabilityDependencies,
} from '@/services/device/device-capability-service';
import { AppErrorCode } from '@/types/result';

const dependencies = (
  overrides: Partial<DeviceCapabilityDependencies> = {},
): DeviceCapabilityDependencies => ({
  totalRamBytes: () => 6 * 1024 ** 3,
  availableDiskBytes: () => 20 * 1024 ** 3,
  osName: () => 'iOS',
  osVersion: () => '18.0',
  benchmark: () => 6_000,
  now: () => 123,
  ...overrides,
});

describe('DeviceCapabilityService', () => {
  it('maps device facts into versioned capability data', async () => {
    const result = await assessDeviceCapability(dependencies());

    expect(result).toEqual({
      success: true,
      data: {
        totalRamBytes: 6 * 1024 ** 3,
        availableDiskBytes: 20 * 1024 ** 3,
        osName: 'iOS',
        osVersion: '18.0',
        cpuScore: 6_000,
        assessedAt: 123,
        assessmentVersion: DEVICE_ASSESSMENT_VERSION,
      },
    });
  });

  it('allows missing total RAM so the selector can use Lite fallback', async () => {
    const result = await assessDeviceCapability(dependencies({ totalRamBytes: () => null }));

    expect(result.success && result.data.totalRamBytes).toBeNull();
  });

  it('returns a typed storage failure for invalid disk data', async () => {
    const result = await assessDeviceCapability(
      dependencies({ availableDiskBytes: () => Number.NaN }),
    );

    expect(result).toMatchObject({
      success: false,
      errorCode: AppErrorCode.DOWNLOAD_STORAGE,
    });
  });

  it('converts benchmark exceptions and invalid scores to failures', async () => {
    const thrown = await assessDeviceCapability(
      dependencies({
        benchmark: () => {
          throw new Error('benchmark failed');
        },
      }),
    );
    const invalid = await assessDeviceCapability(dependencies({ benchmark: () => -1 }));

    expect(thrown).toEqual({ success: false, error: 'benchmark failed' });
    expect(invalid.success).toBe(false);
  });
});
