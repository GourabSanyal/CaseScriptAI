import { FALLBACK_CHECKSUMS } from '@/constants/fallback-checksums';
import { localPathForUrl, filenameFromUrl } from '@/services/download/executorch-resource';

describe('fallback checksums', () => {
  it('ships non-empty sha256 and size for every asset id', () => {
    const ids = Object.keys(FALLBACK_CHECKSUMS);
    expect(ids.length).toBeGreaterThanOrEqual(11);
    for (const id of ids) {
      const record = FALLBACK_CHECKSUMS[id];
      expect(record.sha256.length).toBe(64);
      expect(record.size).toBeGreaterThan(0);
      expect(record.version).toBe('v0.8.0');
    }
  });
});

describe('executorch-resource paths', () => {
  it('sanitizes URLs the same way ResourceFetcher does', () => {
    expect(filenameFromUrl('https://example.com/a/b.pte')).toBe('example.com_a_b.pte');
    expect(localPathForUrl('https://example.com/a/b.pte')).toContain('react-native-executorch/');
  });
});
