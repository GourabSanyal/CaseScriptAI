import { handleAppError } from '@/services/recovery/global-error-handler';
import { healOom } from '@/services/recovery/oom-heal';
import { useBootStore } from '@/stores/boot-store';
import { useDeviceStore } from '@/stores/device-store';
import { showToast } from '@/stores/toast-store';

import type { ErrorHandlerDeps } from '@/types/recovery';
import type { Result } from '@/types/result';

export const errorHandlerDeps = (): ErrorHandlerDeps => ({
  healOom: () => {
    const store = useDeviceStore.getState();
    return healOom(store.selection?.tier ?? null, (selection) => {
      store.commitSelection(selection);
    });
  },
  requestRedownload: () => useBootStore.getState().setDestination('download'),
  toast: showToast,
});

export const notifyAppError = (result: Result<unknown>): ReturnType<typeof handleAppError> =>
  handleAppError(result, errorHandlerDeps());
