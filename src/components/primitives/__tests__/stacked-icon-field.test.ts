import { fieldLeadingIconPlateSize } from '../field-leading-icon-style';
import {
  stackedIconFieldLayout,
  stackedIconFieldPlateSize,
  stackedIconFieldShouldExpand,
} from '../stacked-icon-field';

describe('stacked icon field layout', () => {
  it('keeps icon-plate pinning enabled for compact rows', () => {
    expect(stackedIconFieldLayout.pinValueToIconBottom).toBe(true);
    expect(stackedIconFieldLayout.copyGap).toBe(2);
  });

  it('keeps empty multiline Notes pinned (expand only after growth)', () => {
    expect(
      stackedIconFieldShouldExpand({
        multiline: true,
        value: '',
        styleMinHeight: 36,
        oneLineHeight: 22,
      }),
    ).toBe(false);
    expect(
      stackedIconFieldShouldExpand({
        multiline: true,
        value: 'Packing list\nGifts',
        oneLineHeight: 22,
      }),
    ).toBe(true);
    expect(
      stackedIconFieldShouldExpand({
        multiline: true,
        value: 'Short note',
        styleMinHeight: 64,
        oneLineHeight: 22,
      }),
    ).toBe(true);
  });

  it('sizes tinted plates consistently with FieldLeadingIcon', () => {
    const s = (n: number) => n;
    expect(
      fieldLeadingIconPlateSize({ iconSize: 18, s, withPlate: true }),
    ).toBe(32);
    expect(
      fieldLeadingIconPlateSize({ iconSize: 24, s, withPlate: true }),
    ).toBe(34);
    expect(
      fieldLeadingIconPlateSize({ iconSize: 18, s, withPlate: false }),
    ).toBe(18);
  });

  it('grows the plate to fit caption + body so placeholders pin to the bottom', () => {
    const s = (n: number) => n;
    expect(
      stackedIconFieldPlateSize({
        iconSize: 16,
        s,
        withPlate: true,
        labelLineHeight: 17,
        valueLineHeight: 22,
        fontScale: 1,
      }),
    ).toBe(39);
  });
});
