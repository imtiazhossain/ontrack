import {
    TRAVEL_HOME_HERO_FOCUS_TOP_DEFAULT,
    travelHomeHeroContentPosition,
    travelHomeHeroFocusTopPercent,
} from '@/features/travel/travel-home-hero-focus';

describe('travelHomeHeroFocusTopPercent', () => {
  it('defaults below center so short crops do not empty into sky', () => {
    expect(travelHomeHeroFocusTopPercent()).toBe(
      TRAVEL_HOME_HERO_FOCUS_TOP_DEFAULT,
    );
    expect(TRAVEL_HOME_HERO_FOCUS_TOP_DEFAULT).toBeGreaterThan(50);
  });

  it('pulls the subject up harder on bright / washed plates', () => {
    expect(travelHomeHeroFocusTopPercent('#E8EEF5')).toBe(80);
    expect(travelHomeHeroFocusTopPercent('#C9D6E5')).toBe(80);
  });

  it('keeps more sky on dark night / aurora plates', () => {
    expect(travelHomeHeroFocusTopPercent('#021734')).toBe(48);
    expect(travelHomeHeroFocusTopPercent('#1A2430')).toBe(48);
  });

  it('uses a moderate ground bias for mid-tone plates', () => {
    expect(travelHomeHeroFocusTopPercent('#7FA3C4')).toBe(66);
  });
});

describe('travelHomeHeroContentPosition', () => {
  it('returns an expo-image contentPosition anchored on the focus Y', () => {
    expect(travelHomeHeroContentPosition('#E8EEF5')).toEqual({
      top: '80%',
      left: '50%',
    });
    expect(travelHomeHeroContentPosition()).toEqual({
      top: `${TRAVEL_HOME_HERO_FOCUS_TOP_DEFAULT}%`,
      left: '50%',
    });
  });
});
