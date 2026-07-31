import type { Balloon, FanConfig, StageBounds } from './types';

const FRICTION = 0.998;

function applyFanWind(
  balloon: Balloon,
  fans: readonly FanConfig[],
  bounds: StageBounds,
  dt: number,
): { ax: number; ay: number } {
  let ax = 0;
  let ay = 0;

  for (const fan of fans) {
    const { side, strength, zoneDepth } = fan;
    switch (side) {
      case 'left':
        if (balloon.x - balloon.radius <= zoneDepth) ax += strength;
        break;
      case 'right':
        if (balloon.x + balloon.radius >= bounds.width - zoneDepth) ax -= strength;
        break;
      case 'top':
        if (balloon.y - balloon.radius <= zoneDepth) ay += strength;
        break;
      case 'bottom':
        if (balloon.y + balloon.radius >= bounds.height - zoneDepth) ay -= strength;
        break;
    }
  }

  return { ax: ax * dt, ay: ay * dt };
}

function bounce(balloon: Balloon, bounds: StageBounds): Balloon {
  let { x, y, vx, vy, radius } = balloon;
  const minX = radius;
  const maxX = Math.max(radius, bounds.width - radius);
  const minY = radius;
  const maxY = Math.max(radius, bounds.height - radius);

  if (x < minX) {
    x = minX;
    vx = Math.abs(vx);
  } else if (x > maxX) {
    x = maxX;
    vx = -Math.abs(vx);
  }

  if (y < minY) {
    y = minY;
    vy = Math.abs(vy);
  } else if (y > maxY) {
    y = maxY;
    vy = -Math.abs(vy);
  }

  return { ...balloon, x, y, vx, vy };
}

/** Integrate one balloon for `dt` seconds under fan wind + edge bounce. */
export function stepBalloon(
  balloon: Balloon,
  fans: readonly FanConfig[],
  bounds: StageBounds,
  dt: number,
): Balloon {
  if (bounds.width <= 0 || bounds.height <= 0 || dt <= 0) return balloon;

  const wind = applyFanWind(balloon, fans, bounds, dt);
  let vx = (balloon.vx + wind.ax) * FRICTION;
  let vy = (balloon.vy + wind.ay) * FRICTION;
  const x = balloon.x + vx * dt;
  const y = balloon.y + vy * dt;

  return bounce({ ...balloon, x, y, vx, vy }, bounds);
}

export function stepBalloons(
  balloons: readonly Balloon[],
  fans: readonly FanConfig[],
  bounds: StageBounds,
  dt: number,
): Balloon[] {
  return balloons.map((balloon) => stepBalloon(balloon, fans, bounds, dt));
}

export function spawnBalloonPositions(
  count: number,
  bounds: StageBounds,
  radius: number,
  driftScale: number,
  rng: () => number = Math.random,
): Array<{ x: number; y: number; vx: number; vy: number }> {
  const pad = radius + 8;
  const width = Math.max(pad * 2, bounds.width);
  const height = Math.max(pad * 2, bounds.height);
  const result: Array<{ x: number; y: number; vx: number; vy: number }> = [];

  for (let i = 0; i < count; i += 1) {
    result.push({
      x: pad + rng() * (width - pad * 2),
      y: pad + rng() * (height - pad * 2),
      vx: (rng() - 0.5) * 2 * driftScale,
      vy: (rng() - 0.5) * 2 * driftScale,
    });
  }

  return result;
}
