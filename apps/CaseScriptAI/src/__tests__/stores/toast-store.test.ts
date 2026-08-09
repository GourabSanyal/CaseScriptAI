import {
  dismissToast,
  showToast,
  useToastStore,
} from '@/stores/toast-store';

describe('toast-store', () => {
  beforeEach(() => {
    useToastStore.setState({ current: null });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows a toast and auto-dismisses after duration', () => {
    const id = showToast({ message: 'Saved', durationMs: 1000 });
    expect(useToastStore.getState().current?.id).toBe(id);
    expect(useToastStore.getState().current?.message).toBe('Saved');

    jest.advanceTimersByTime(1000);
    expect(useToastStore.getState().current).toBeNull();
  });

  it('keeps sticky toasts until dismiss', () => {
    showToast({ id: 'sticky', message: 'Stay', durationMs: 0 });
    jest.advanceTimersByTime(10_000);
    expect(useToastStore.getState().current?.id).toBe('sticky');

    dismissToast('sticky');
    expect(useToastStore.getState().current).toBeNull();
  });

  it('replaces toast with the same id', () => {
    showToast({ id: 'one', message: 'First', durationMs: 0 });
    showToast({ id: 'one', message: 'Second', durationMs: 0 });
    expect(useToastStore.getState().current?.message).toBe('Second');
  });
});
