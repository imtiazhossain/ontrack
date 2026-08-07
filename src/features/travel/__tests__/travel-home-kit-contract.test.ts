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
import { travelHomeTokens } from '@/features/travel/travel-home-tokens';

describe('travel home kit contract', () => {
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
      navy: '#16255B',
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
