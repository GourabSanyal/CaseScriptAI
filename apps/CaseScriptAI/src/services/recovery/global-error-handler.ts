import { AppErrorCode } from '@/types/result';

import type { ErrorHandlerDeps, RecoveryAction } from '@/types/recovery';
import type { Result } from '@/types/result';

export const GENERIC_TOAST = 'Something went wrong. Try again.';

const TOAST: Record<string, string> = {
  [AppErrorCode.DOWNLOAD_STORAGE]: 'Not enough storage to download models.',
  [AppErrorCode.AUDIO_PERMISSION]: 'Microphone permission is required.',
  [AppErrorCode.AUDIO_SESSION_BUSY]: 'The microphone is busy. Try again shortly.',
  [AppErrorCode.AUDIO_BUFFER_OVERFLOW]: 'Recording hit a buffer limit. The session was saved.',
  [AppErrorCode.LLM_GENERATION_FAILED]: 'Could not generate the note. Try again from Records.',
};

export const classifyError = (errorCode?: AppErrorCode): RecoveryAction => {
  switch (errorCode) {
    case AppErrorCode.MODEL_OOM:
      return { kind: 'oom-heal' };
    case AppErrorCode.MODEL_CORRUPT:
    case AppErrorCode.DOWNLOAD_CHECKSUM:
      return { kind: 'redownload', reason: 'corrupt' };
    case AppErrorCode.MODEL_MISSING:
      return { kind: 'redownload', reason: 'missing' };
    case AppErrorCode.DOWNLOAD_NETWORK:
      return { kind: 'retry-when-online' };
    case AppErrorCode.SESSION_ORPHANED:
      return { kind: 'session-recover' };
    case AppErrorCode.DOWNLOAD_STORAGE:
    case AppErrorCode.AUDIO_PERMISSION:
    case AppErrorCode.AUDIO_SESSION_BUSY:
    case AppErrorCode.AUDIO_BUFFER_OVERFLOW:
    case AppErrorCode.LLM_GENERATION_FAILED:
      return { kind: 'toast', message: TOAST[errorCode], variant: 'error' };
    default:
      return { kind: 'toast', message: GENERIC_TOAST, variant: 'error' };
  }
};

export const handleAppError = (
  result: Result<unknown>,
  deps: ErrorHandlerDeps,
): Result<RecoveryAction> => {
  if (result.success) return { success: true, data: { kind: 'none' } };

  const action = classifyError(result.errorCode);
  switch (action.kind) {
    case 'oom-heal': {
      const healed = deps.healOom();
      if (!healed.success) {
        deps.toast({ message: GENERIC_TOAST, variant: 'error' });
        return { success: false, error: healed.error };
      }
      if (healed.data.healed) {
        deps.toast({
          message: 'Memory ran low. Switching to a smaller on-device model.',
          variant: 'warning',
        });
        deps.requestRedownload();
      } else {
        deps.toast({
          message: 'This device is already on the smallest model. The session needs attention.',
          variant: 'warning',
        });
      }
      break;
    }
    case 'redownload':
      deps.toast({
        message: 'A model file is missing or damaged. Re-download required.',
        variant: 'warning',
      });
      deps.requestRedownload();
      break;
    case 'retry-when-online':
      deps.toast({
        message: 'Waiting for a connection to finish downloading.',
        variant: 'info',
      });
      break;
    case 'session-recover':
      break;
    case 'toast':
      deps.toast({ message: action.message, variant: action.variant });
      break;
    case 'none':
      break;
  }

  return { success: true, data: action };
};
