import * as Device from 'expo-device';
import { Paths } from 'expo-file-system';

import { AppErrorCode } from '@/types/result';

import type { DeviceCapability } from '@/types/device';
import type { Result } from '@/types/result';

export const DEVICE_ASSESSMENT_VERSION = 1;
const BENCHMARK_ITERATIONS = 250_000;

export type DeviceCapabilityDependencies = {
  totalRamBytes: () => number | null;
  availableDiskBytes: () => number;
  osName: () => string | null;
  osVersion: () => string | null;
  benchmark: () => number;
  now: () => number;
};

const runCpuBenchmark = (): number => {
  const startedAt = performance.now();
  let value = 0;

  for (let index = 0; index < BENCHMARK_ITERATIONS; index += 1) {
    value = (value + Math.imul(index, 31)) | 0;
  }

  const elapsedMs = Math.max(performance.now() - startedAt, 0.01);
  // Keep the loop observable so an optimizer cannot remove it.
  if (!Number.isFinite(value)) throw new Error('CPU benchmark failed');
  return BENCHMARK_ITERATIONS / elapsedMs;
};

const defaultDependencies: DeviceCapabilityDependencies = {
  totalRamBytes: () => Device.totalMemory,
  availableDiskBytes: () => Paths.availableDiskSpace,
  osName: () => Device.osName,
  osVersion: () => Device.osVersion,
  benchmark: runCpuBenchmark,
  now: Date.now,
};

export const assessDeviceCapability = async (
  dependencies: DeviceCapabilityDependencies = defaultDependencies,
): Promise<Result<DeviceCapability>> => {
  try {
    const availableDiskBytes = dependencies.availableDiskBytes();
    if (!Number.isFinite(availableDiskBytes) || availableDiskBytes < 0) {
      return {
        success: false,
        error: 'Available disk space could not be determined',
        errorCode: AppErrorCode.DOWNLOAD_STORAGE,
      };
    }

    const cpuScore = dependencies.benchmark();
    if (!Number.isFinite(cpuScore) || cpuScore < 0) {
      return { success: false, error: 'CPU benchmark returned an invalid score' };
    }

    return {
      success: true,
      data: {
        totalRamBytes: dependencies.totalRamBytes(),
        availableDiskBytes,
        osName: dependencies.osName(),
        osVersion: dependencies.osVersion(),
        cpuScore,
        assessedAt: dependencies.now(),
        assessmentVersion: DEVICE_ASSESSMENT_VERSION,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Device assessment failed',
    };
  }
};
