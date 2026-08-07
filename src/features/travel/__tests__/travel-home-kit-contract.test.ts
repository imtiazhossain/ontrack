import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
    travelHomeFixture,
    travelHomeTokenContract,
    travelHomeVisualScenarios,
} from '@/features/travel/fixtures/travel-home';
import {
    TRAVEL_HOME_PLANE_ROTATION_DEG,
    travelHomePlaneRearAxisUnit,
    travelHomePlaneTailMidVb,
    travelHomePlaneTransformPoint,
    travelHomeTrailStartVb,
} from '@/features/travel/travel-home-icons';
import { travelHomeAtmosphereHeight } from '@/features/travel/travel-home-background';
import { travelHomeTokens } from '@/features/travel/travel-home-tokens';

describe('travel home kit contract', () => {
  it('keeps the trip hero ScrollView always mounted (Fabric crash guard)', () => {
    // Conditionally mounting ScrollView / dots as Fabric siblings SIGABRTs on
    // iOS (`unmountChildComponentView` index mismatch on the 362×199 hero).
    const source = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-hero-carousel.tsx'),
      'utf8',
    );
    expect(source).toContain('collapsable={false}');
    expect(source).toContain('heroPageSlots');
    expect(source).toContain('scrollEnabled={scrollInteractive}');
    expect(source).not.toMatch(
      /visibleUris\.length\s*>\s*0\s*\?\s*\(\s*<ScrollView/,
    );
  });

  it('keeps the trip-card stepper slot always mounted (Fabric crash guard)', () => {
    // Conditionally mounting the stepper beside BlurView SIGABRTs on iOS
    // (`unmountChildComponentView` on the meta glass — child y≈-12).
    const card = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-trip-card.tsx'),
      'utf8',
    );
    const stepper = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-carousel-stepper.tsx'),
      'utf8',
    );
    expect(card).toContain('stepperSlotCollapsed');
    expect(card).not.toMatch(/showStepper\s*\?\s*\(\s*<View/);
    expect(stepper).toContain('wrapCollapsed');
    expect(stepper).not.toMatch(/if\s*\(\s*pageCount\s*<=\s*1\s*\)\s*return\s*null/);
  });

  it('keeps the duration chip as a solid brand tint (not glass wash)', () => {
    // Android TravelHomeGlass light tint bleached the pill into a white outlined
    // badge; iOS target is soft filled brandBlueSoft.
    const dateBlock = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-date-block.tsx'),
      'utf8',
    );
    const glass = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-glass.tsx'),
      'utf8',
    );
    expect(dateBlock).toContain('brandBlueSoft');
    expect(dateBlock).not.toContain('TravelHomeGlass');
    expect(glass).toContain('rgba(12, 16, 24, 0.32)');
    expect(glass).not.toContain('rgba(12, 16, 24, 0.68)');
  });

  it('frosts trip-card scoops with a hero-aligned plate on iOS and Android', () => {
    // Scoop must stay pixel-aligned with the hero (no +offset shift). iOS uses
    // sharp underlay + BlurView; Android pre-blurs. LinearGradient milks to paper.
    const glass = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-glass.tsx'),
      'utf8',
    );
    const card = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-trip-card.tsx'),
      'utf8',
    );
    const tokens = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-tokens.ts'),
      'utf8',
    );
    expect(glass).toContain('frost.overlap - frost.heroHeight');
    expect(glass).toContain('LinearGradient');
    expect(glass).toContain('contentPosition={{ top: \'50%\', left: \'50%\' }}');
    expect(glass).toContain('backgroundColor: \'transparent\'');
    expect(glass).not.toContain('overlap + 40');
    expect(glass).not.toContain('bodyFill');
    expect(glass).not.toContain('androidChrome');
    expect(tokens).toMatch(/bodyOverlap:\s*56/);
    expect(card).toContain('frost=');
    expect(card).toContain('heroFrostSource');
    expect(card).not.toContain('Platform.OS === \'android\' &&');
    expect(card).not.toContain('BlurTargetView');
    expect(card).not.toContain('panelFill');
  });

  it('keeps the section search plate as a row (glass children stay flex kids)', () => {
    const header = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-section-header.tsx'),
      'utf8',
    );
    expect(header).toContain('flexDirection: \'row\'');
    expect(header).toContain('styles.search');
    expect(header).toContain('styles.badge');
  });

  it('grounds a solo trip with an atmosphere-tinted bottom shadow', () => {
    const card = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-trip-card.tsx'),
      'utf8',
    );
    const screen = readFileSync(
      join(process.cwd(), 'src/app/(tabs)/travel.tsx'),
      'utf8',
    );
    expect(card).toContain('soloAtmosphereShadow');
    expect(card).toContain('travelHomeSoloTripCardShadow');
    expect(screen).toContain('soloAtmosphereShadow={visibleLauncherPlans.length === 1}');
    expect(screen).toContain('atmosphereAverageColor={atmosphereImage.averageColor}');
  });

  it('keeps atmosphere as a top hero band (not full-page)', () => {
    const windowHeight = 852;
    const topInset = 59;
    const band = travelHomeAtmosphereHeight(windowHeight, topInset);
    expect(band).toBe(Math.round(windowHeight * 0.34) + topInset);
    expect(band).toBeLessThan(windowHeight);
    expect(band / windowHeight).toBeLessThan(0.5);
  });

  it('keeps layout tokens aligned with design/travel', () => {
    expect(travelHomeTokenContract()).toEqual({
      screenHorizontal: 20,
      cardGap: 14,
      tripCardRadius: 28,
      imageHeight: 193,
      editButton: 40,
      avatar: 40,
      avatarOverlap: 12,
      itineraryHeight: 42,
      itineraryRadius: 12,
      activeDot: 7,
      inactiveDot: 5,
      heroCrossfadeMs: 350,
      navy: '#000000',
    });
  });

  it('keeps header flight motif on Material flight + mock gold', () => {
    expect(travelHomeTokens.colors.motifTan).toBe('#D0AE6E');
    expect(TRAVEL_HOME_PLANE_ROTATION_DEG).toBe(-62);
    const kit = readFileSync(
      join(process.cwd(), 'design/travel/assets/icons/travel-route.svg'),
      'utf8',
    );
    const bundled = readFileSync(
      join(process.cwd(), 'assets/images/travel/icons/travel-route.svg'),
      'utf8',
    );
    for (const svg of [kit, bundled]) {
      expect(svg).toContain('M21 16v-2l-8-5V3.5');
      expect(svg).toContain('rotate(-62)');
      expect(svg).toContain('stroke-dasharray');
      expect(svg).not.toContain('M5 25.5L14.5 18.2');
    }
  });

  it('aims the trail at the mid-tail between both stabilizer tips', () => {
    const left = travelHomePlaneTransformPoint(8, 22);
    const right = travelHomePlaneTransformPoint(15, 22);
    const mid = travelHomePlaneTailMidVb();
    expect(mid.x).toBeCloseTo((left.x + right.x) / 2, 5);
    expect(mid.y).toBeCloseTo((left.y + right.y) / 2, 5);
    // Mid sits between tips vertically (not glued to the upper tip).
    const tipYs = [left.y, right.y].sort((a, b) => a - b);
    expect(mid.y).toBeGreaterThan(tipYs[0]!);
    expect(mid.y).toBeLessThan(tipYs[1]!);

    const rotated = travelHomePlaneTailMidVb(-82);
    expect(rotated.y).not.toBeCloseTo(mid.y, 1);
    // Trail leaves mid-tail along the fuselage axis (not a raw +X nudge).
    const axis = travelHomePlaneRearAxisUnit();
    const start = travelHomeTrailStartVb(34);
    expect(start.x).toBeCloseTo(mid.x + axis.x * start.gap, 5);
    expect(start.y).toBeCloseTo(mid.y + axis.y * start.gap, 5);
    expect(start.gap).toBeGreaterThan(0);
  });

  it('exposes deterministic fixture trips without live image URLs', () => {
    expect(travelHomeFixture.trips).toHaveLength(2);
    expect(travelHomeFixture.trips[0]?.destination).toBe('Iceland');
    expect(travelHomeFixture.trips[0]?.id).toBe('trip-travel-home-iceland');
    expect(travelHomeFixture.trips[1]?.destination).toBe('Antigua, Guatemala');
    for (const trip of travelHomeFixture.trips) {
      expect(trip).not.toHaveProperty('imageUrl');
      expect(trip.imageQuery.length).toBeGreaterThan(0);
    }
  });

  it('lists required visual regression scenarios', () => {
    expect(travelHomeVisualScenarios).toEqual([
      'travel-home-two-trips',
      'travel-home-one-trip',
      'travel-home-empty',
      'travel-home-dark',
      'travel-home-long-destination',
      'travel-home-image-loading',
    ]);
  });
});
