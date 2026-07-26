import { formatSessionTimer } from '@/utils/format-session-timer';

describe('formatSessionTimer', () => {
  it('formats hours, minutes, and seconds with padded digits', () => {
    expect(formatSessionTimer(0)).toBe('00 : 00 : 00');
    expect(formatSessionTimer(65_000)).toBe('00 : 01 : 05');
    expect(formatSessionTimer(3_726_000)).toBe('01 : 02 : 06');
  });
});
