import { fetchExecutorchResource } from '@/services/download/executorch-resource-fetch';

describe('executorch-resource fetch', () => {
  it('returns a local path after ResourceFetcher completes', async () => {
    const progress: number[] = [];
    const result = await fetchExecutorchResource(
      'https://example.com/model.pte',
      100,
      (bytes) => progress.push(bytes),
    );
    expect(result).toMatchObject({ success: true });
    if (result.success) expect(result.data).toContain('example.com');
  });
});
