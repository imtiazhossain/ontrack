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
    // Page ticks bind to this carousel’s visibleUris (not a lagged parent count).
    expect(source).toContain('TravelHomeCarouselStepper');
    expect(source).toContain('count={visibleUris.length}');
    expect(source).not.toMatch(
      /visibleUris\.length\s*>\s*0\s*\?\s*\(\s*<ScrollView/,
    );
  });

  it('keeps the trip-card stepper shell always mounted (Fabric crash guard)', () => {
    // Conditionally returning null from the stepper SIGABRTs when remounting
    // near hero / frost BlurView siblings — collapse via height/opacity instead.
    const stepper = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-carousel-stepper.tsx'),
      'utf8',
    );
    expect(stepper).toContain('wrapCollapsed');
    expect(stepper).not.toMatch(/if\s*\(\s*pageCount\s*<=\s*1\s*\)\s*return\s*null/);
  });

  it('shows only the date range in the trip-card footer dates slot', () => {
    const dateBlock = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-date-block.tsx'),
      'utf8',
    );
    const card = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-trip-card.tsx'),
      'utf8',
    );
    expect(dateBlock).toContain('formatTripDateRangeLabel');
    expect(dateBlock).not.toContain('DATES');
    expect(dateBlock).not.toContain('brandBlueSoft');
    expect(dateBlock).not.toMatch(/styles\.pill/);
    expect(dateBlock).not.toContain('TravelHomeGlass');
    // Light View Itinerary = solid ink black (not translucent glass grey).
    expect(card).toContain('travelHomeTokens.colors.ink');
    expect(card).not.toContain('TravelHomeGlass');
  });

  it('frosts trip-card scoops with BlurView over the live hero', () => {
    // Photo→paper blend: light BlurView softener + full-height LinearGradient.
    // No frosted-glass plate / hairline (those read as a separate band).
    const scoop = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-trip-frost-scoop.tsx'),
      'utf8',
    );
    const card = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-trip-card.tsx'),
      'utf8',
    );
    const glass = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-glass.tsx'),
      'utf8',
    );
    const tokens = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-tokens.ts'),
      'utf8',
    );
    const stepper = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-carousel-stepper.tsx'),
      'utf8',
    );
    expect(scoop).toContain("tint={dark ? 'dark' : 'light'}");
    expect(scoop).toContain('<BlurView');
    expect(scoop).toContain('blurKey');
    expect(scoop).toContain('LinearGradient');
    expect(scoop).toContain('fadeBleed');
    expect(scoop).toContain('paperColor');
    expect(scoop).toContain('blurEndInset');
    expect(scoop).toContain('hexToRgba');
    expect(scoop).toContain('fadeHeight = totalHeight');
    expect(scoop).toContain('borderWidth: 0');
    // Bleed sealed solid under the ramp.
    expect(scoop).toContain('backgroundColor: paperColor');
    // Scoop shell itself must stay overflow-visible for UIVisualEffect.
    expect(scoop).toMatch(/scoop:\s*\{[^}]*backgroundColor:\s*'transparent'/);
    expect(scoop).not.toMatch(/scoop:\s*\{[^}]*overflow:\s*'hidden'/);
    expect(card).toContain('TravelHomeTripFrostScoop');
    expect(card).toContain('frostFadeBleed');
    expect(card).toContain('styles.frostBand');
    expect(card).toContain('styles.heroMedia');
    expect(card).toContain('blurKey=');
    expect(card).toContain('heroFrostSource');
    expect(card).not.toContain('styles.clip');
    expect(card).not.toContain('frost=');
    expect(card).not.toContain('BlurTargetView');
    expect(glass).not.toContain('frost?:');
    expect(glass).not.toContain('TravelHomeGlassFrost');
    expect(tokens).toMatch(/bodyOverlap:\s*78/);
    expect(card).toContain('locationRow');
    expect(card).toContain('titleCluster');
    // Ticks mount inside the hero carousel (visibleUris) with a dark plate so
    // they read on pale sky without waiting for a swipe.
    expect(stepper).toContain('wrapCollapsed');
    expect(stepper).toContain('styles.plate');
    expect(stepper).toContain("rgba(0,0,0,0.42)");
  });

  it('keeps the section search plate as a row (glass children stay flex kids)', () => {
    const header = readFileSync(
      join(process.cwd(), 'src/features/travel/travel-home-section-header.tsx'),
      'utf8',
    );
    expect(header).toContain('flexDirection: \'row\'');
    expect(header).toContain('styles.search');
    expect(header).toContain('styles.badge');
    // Outer counter plate: black glass in light, white glass in dark.
    expect(header).toMatch(/<TravelHomeGlass\s+inverted/);
    // Count sits at the far right inside the search scoop.
    expect(header).toMatch(/\{countBadge\}\s*<\/TravelHomeGlass>/);
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
