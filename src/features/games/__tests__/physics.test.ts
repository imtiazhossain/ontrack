import { spawnBalloonPositions, stepBalloon, stepBalloons } from '../balloon-pop/physics';
import type { Balloon, FanConfig, StageBounds } from '../balloon-pop/types';

const bounds: StageBounds = { width: 300, height: 500 };

function balloon(partial: Partial<Balloon> = {}): Balloon {
  return {
    id: 'b1',
    colorId: 'red',
    x: 150,
    y: 250,
    vx: 0,
    vy: 0,
    radius: 20,
    ...partial,
  };
}

describe('balloon pop physics', () => {
  it('applies left-fan wind to the right inside the zone', () => {
    const fans: FanConfig[] = [{ side: 'left', strength: 100, zoneDepth: 80 }];
    const next = stepBalloon(balloon({ x: 30, vx: 0 }), fans, bounds, 0.5);
    expect(next.vx).toBeGreaterThan(0);
    expect(next.x).toBeGreaterThan(30);
  });

  it('applies right-fan wind to the left inside the zone', () => {
    const fans: FanConfig[] = [{ side: 'right', strength: 100, zoneDepth: 80 }];
    const next = stepBalloon(balloon({ x: 280, vx: 0 }), fans, bounds, 0.5);
    expect(next.vx).toBeLessThan(0);
  });

  it('bounces off the left edge', () => {
    const next = stepBalloon(
      balloon({ x: 5, vx: -40, radius: 20 }),
      [],
      bounds,
      0.2,
    );
    expect(next.x).toBeGreaterThanOrEqual(20);
    expect(next.vx).toBeGreaterThanOrEqual(0);
  });

  it('steps every balloon in the list', () => {
    const fans: FanConfig[] = [{ side: 'top', strength: 80, zoneDepth: 60 }];
    const list = [
      balloon({ id: 'a', y: 20, vy: 0 }),
      balloon({ id: 'b', y: 250, vy: 0 }),
    ];
    const next = stepBalloons(list, fans, bounds, 0.5);
    expect(next).toHaveLength(2);
    expect(next[0]?.vy).toBeGreaterThan(0);
  });

  it('spawns positions inside the padded bounds', () => {
    const positions = spawnBalloonPositions(5, bounds, 20, 30, () => 0.5);
    expect(positions).toHaveLength(5);
    for (const pos of positions) {
      expect(pos.x).toBeGreaterThanOrEqual(28);
      expect(pos.x).toBeLessThanOrEqual(272);
      expect(pos.y).toBeGreaterThanOrEqual(28);
      expect(pos.y).toBeLessThanOrEqual(472);
    }
  });
});
