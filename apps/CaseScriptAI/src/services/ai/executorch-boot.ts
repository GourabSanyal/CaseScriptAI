/** Tiny flag so root layout can keep Slot mounted after Continue inits ExecuTorch. */
let ready = false;

export const getExecutorchBootReady = (): boolean => ready;

export const setExecutorchBootReady = (value = true): void => {
  ready = value;
};
