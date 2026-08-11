import { create } from 'zustand';

import type { ToastInput, ToastItem, ToastStore } from '@/types/toast';

const DEFAULT_DURATION_MS = 4_000;

let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 0;
/** Splash / boot holds toasts until the first real screen is up. Tests start ready. */
let uiReady = process.env.NODE_ENV === 'test';
const pending: ToastInput[] = [];

const clearDismissTimer = () => {
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = null;
};

const scheduleDismiss = (id: string, durationMs: number, dismiss: ToastStore['dismiss']) => {
  clearDismissTimer();
  if (durationMs <= 0) return;
  dismissTimer = setTimeout(() => dismiss(id), durationMs);
};

const flushNext = (show: ToastStore['show']): void => {
  while (pending.length > 0) {
    const next = pending.shift();
    if (next?.message.trim()) {
      show(next);
      return;
    }
  }
};

export const useToastStore = create<ToastStore>((set, get) => ({
  current: null,
  show: (input) => {
    if (!uiReady) {
      pending.push(input);
      return input.id ?? `toast-pending-${pending.length}`;
    }
    const id = input.id ?? `toast-${++toastSeq}`;
    const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
    const item: ToastItem = {
      id,
      message: input.message.trim(),
      title: input.title?.trim() || undefined,
      variant: input.variant ?? 'info',
      durationMs,
      createdAt: Date.now(),
    };
    if (!item.message) return id;
    set({ current: item });
    scheduleDismiss(id, durationMs, get().dismiss);
    return id;
  },
  dismiss: (id) => {
    const current = get().current;
    if (!current) return;
    if (id && current.id !== id) return;
    clearDismissTimer();
    set({ current: null });
    if (uiReady) flushNext(get().show);
  },
}));

/** Call once splash is gone so held toasts appear on Home / Download. */
export const setToastsReady = (ready: boolean): void => {
  uiReady = ready;
  if (!ready) {
    pending.length = 0;
    return;
  }
  if (!useToastStore.getState().current) {
    flushNext(useToastStore.getState().show);
  }
};

/** Imperative helper for services / non-React call sites. */
export const showToast = (input: ToastInput): string => useToastStore.getState().show(input);

export const dismissToast = (id?: string): void => useToastStore.getState().dismiss(id);
