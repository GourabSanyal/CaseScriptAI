import { create } from 'zustand';

import type { ToastInput, ToastItem, ToastStore } from '@/types/toast';

const DEFAULT_DURATION_MS = 4_000;

let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let toastSeq = 0;

const clearDismissTimer = () => {
  if (dismissTimer) clearTimeout(dismissTimer);
  dismissTimer = null;
};

const scheduleDismiss = (id: string, durationMs: number, dismiss: ToastStore['dismiss']) => {
  clearDismissTimer();
  if (durationMs <= 0) return;
  dismissTimer = setTimeout(() => dismiss(id), durationMs);
};

export const useToastStore = create<ToastStore>((set, get) => ({
  current: null,
  show: (input) => {
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
  },
}));

/** Imperative helper for services / non-React call sites. */
export const showToast = (input: ToastInput): string => useToastStore.getState().show(input);

export const dismissToast = (id?: string): void => useToastStore.getState().dismiss(id);
