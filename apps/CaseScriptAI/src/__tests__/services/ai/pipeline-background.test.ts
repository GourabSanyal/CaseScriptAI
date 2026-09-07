import {
  createPipelineBackgroundController,
  type AppStateStatus,
} from '@/services/ai/pipeline-background';

describe('pipeline-background', () => {
  it('invokes onForeground when AppState becomes active', () => {
    const onForeground = jest.fn();
    let listener: ((status: AppStateStatus) => void) | null = null;
    const controller = createPipelineBackgroundController({
      onForeground,
      subscribe: (fn) => {
        listener = fn;
        return () => {
          listener = null;
        };
      },
    });

    if (listener) (listener as (status: AppStateStatus) => void)('background');
    expect(onForeground).not.toHaveBeenCalled();
    if (listener) (listener as (status: AppStateStatus) => void)('active');
    expect(onForeground).toHaveBeenCalledTimes(1);

    controller.stop();
    expect(listener).toBeNull();
  });
});
