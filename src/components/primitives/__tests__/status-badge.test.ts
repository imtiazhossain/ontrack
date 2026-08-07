import { lightTheme } from '@/design-system/themes';

import { statusBadgeToneColor } from '../status-badge';

describe('statusBadgeToneColor', () => {
  it('maps tones to theme semantic colors', () => {
    expect(statusBadgeToneColor('success', lightTheme)).toBe(lightTheme.success);
    expect(statusBadgeToneColor('warning', lightTheme)).toBe(lightTheme.warning);
    expect(statusBadgeToneColor('danger', lightTheme)).toBe(lightTheme.danger);
    expect(statusBadgeToneColor('neutral', lightTheme)).toBe(lightTheme.accentPrimary);
  });
});
