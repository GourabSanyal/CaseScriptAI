import { createPipelineBackgroundController } from '@/services/ai/pipeline-background';

describe('pipeline-background', () => {
  it('invokes onForeground when AppState becomes active', () => {
    const onForeground = jest.fn();
    let listener: ((status: string) => void) | null = null;
    const controller = createPipelineBackgroundController({
      onForeground,
      subscribe: (fn) => {
        listener = fn;
        return () => {
          listener = null;
        };
      },
    });

    listener?.('background');
    expect(onForeground).not.toHaveBeenCalled();
    listener?.('active');
    expect(onForeground).toHaveBeenCalledTimes(1);

    controller.stop();
    expect(listener).toBeNull();
  });
});
