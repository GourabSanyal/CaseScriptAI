export type ToastVariant = 'info' | 'warning' | 'error' | 'success';

export type ToastInput = {
  message: string;
  title?: string;
  variant?: ToastVariant;
  /** Omit or 0 → stays until dismiss / replaced. */
  durationMs?: number;
  /** Same id replaces an existing toast. */
  id?: string;
};

export type ToastItem = {
  id: string;
  message: string;
  title?: string;
  variant: ToastVariant;
  durationMs: number;
  createdAt: number;
};

export type ToastStore = {
  current: ToastItem | null;
  show: (input: ToastInput) => string;
  dismiss: (id?: string) => void;
};
