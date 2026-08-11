import {
  GENERIC_TOAST,
  classifyError,
  handleAppError,
} from '@/services/recovery/global-error-handler';
import { AppErrorCode } from '@/types/result';

import type { ErrorHandlerDeps } from '@/types/recovery';

const deps = (): ErrorHandlerDeps & {
  toasts: string[];
  redownloads: number;
  heal: jest.Mock;
} => {
  const toasts: string[] = [];
  const ports = {
    toasts,
    redownloads: 0,
    heal: jest.fn(() => ({
      success: true as const,
      data: { healed: true, tier: 'lite' as const },
    })),
    healOom: () => ports.heal(),
    requestRedownload: () => {
      ports.redownloads += 1;
    },
    toast: ({ message }: { message: string }) => {
      toasts.push(message);
    },
  };
  return ports;
};

describe('global-error-handler', () => {
  it('classifies each AppErrorCode', () => {
    expect(classifyError(AppErrorCode.MODEL_OOM)).toEqual({ kind: 'oom-heal' });
    expect(classifyError(AppErrorCode.MODEL_CORRUPT)).toEqual({
      kind: 'redownload',
      reason: 'corrupt',
    });
    expect(classifyError(AppErrorCode.DOWNLOAD_CHECKSUM)).toEqual({
      kind: 'redownload',
      reason: 'corrupt',
    });
    expect(classifyError(AppErrorCode.MODEL_MISSING)).toEqual({
      kind: 'redownload',
      reason: 'missing',
    });
    expect(classifyError(AppErrorCode.DOWNLOAD_NETWORK)).toEqual({ kind: 'retry-when-online' });
    expect(classifyError(AppErrorCode.SESSION_ORPHANED)).toEqual({ kind: 'session-recover' });
    expect(classifyError(AppErrorCode.LLM_GENERATION_FAILED).kind).toBe('toast');
    expect(classifyError(undefined)).toEqual({
      kind: 'toast',
      message: GENERIC_TOAST,
      variant: 'error',
    });
  });

  it('never echoes raw error text into a toast', () => {
    const ports = deps();
    handleAppError(
      {
        success: false,
        error: 'SOAP note for Jane Doe: chest pain',
      },
      ports,
    );
    expect(ports.toasts).toEqual([GENERIC_TOAST]);
    expect(ports.toasts.join(' ')).not.toMatch(/Jane|SOAP|chest/i);
  });

  it('OOM heal requests re-download when a lower tier exists', () => {
    const ports = deps();
    const result = handleAppError(
      { success: false, error: 'oom', errorCode: AppErrorCode.MODEL_OOM },
      ports,
    );
    expect(result).toMatchObject({ success: true, data: { kind: 'oom-heal' } });
    expect(ports.redownloads).toBe(1);
    expect(ports.toasts[0]).toMatch(/smaller on-device model/i);
  });

  it('OOM on Lite toasts without re-download', () => {
    const ports = deps();
    ports.heal.mockReturnValue({ success: true, data: { healed: false, tier: 'lite' } });
    handleAppError(
      { success: false, error: 'oom', errorCode: AppErrorCode.MODEL_OOM },
      ports,
    );
    expect(ports.redownloads).toBe(0);
    expect(ports.toasts[0]).toMatch(/smallest model/i);
  });

  it('corrupt models route to re-download', () => {
    const ports = deps();
    handleAppError(
      { success: false, error: 'bad', errorCode: AppErrorCode.MODEL_CORRUPT },
      ports,
    );
    expect(ports.redownloads).toBe(1);
  });

  it('ignores successful results', () => {
    const ports = deps();
    expect(handleAppError({ success: true, data: 1 }, ports)).toEqual({
      success: true,
      data: { kind: 'none' },
    });
    expect(ports.redownloads).toBe(0);
    expect(ports.toasts).toEqual([]);
  });
});
