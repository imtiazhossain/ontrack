import { fieldLeadingIconRowStyle } from '@/components/primitives/field-leading-icon-style';

describe('fieldLeadingIconRowStyle', () => {
  it('always centers icons vertically in the field row', () => {
    expect(fieldLeadingIconRowStyle()).toEqual({
      flexDirection: 'row',
      alignItems: 'center',
    });
  });

  it('merges sizing overrides without losing icon centering', () => {
    const style = fieldLeadingIconRowStyle({
      minHeight: 60,
      gap: 8,
      paddingVertical: 8,
    });

    expect(style).toEqual({
      minHeight: 60,
      gap: 8,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
    });
  });

  it('wins over alignItems / flexDirection when forced through', () => {
    const style = fieldLeadingIconRowStyle({
      minHeight: 60,
      ...( {
        alignItems: 'flex-start',
        flexDirection: 'column',
      } as object),
    });

    expect(style.alignItems).toBe('center');
    expect(style.flexDirection).toBe('row');
  });
});
