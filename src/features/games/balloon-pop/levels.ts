import type { BalloonColorId, FanConfig, FanSide, LevelConfig } from './types';

const ALL_COLORS: readonly BalloonColorId[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
];

function fansForLevel(level: number, strength: number, zoneDepth: number): FanConfig[] {
  const fans: FanConfig[] = [];
  const add = (side: FanSide) => {
    fans.push({ side, strength, zoneDepth });
  };

  if (level >= 2) add('left');
  if (level >= 3) add('right');
  if (level >= 4) add('top');
  if (level >= 5) add('bottom');
  return fans;
}

function colorPoolForLevel(level: number): BalloonColorId[] {
  if (level <= 1) return ['red', 'blue', 'green'];
  if (level === 2) return ['red', 'blue', 'green', 'yellow'];
  return [...ALL_COLORS];
}

/** Deterministic-ish target rotation so each level feels distinct. */
function targetForLevel(level: number, pool: readonly BalloonColorId[]): BalloonColorId {
  return pool[(level - 1) % pool.length] ?? 'red';
}

export function getLevelConfig(level: number): LevelConfig {
  const clamped = Math.max(1, Math.floor(level));
  const colorPool = colorPoolForLevel(clamped);
  const targetColorId = targetForLevel(clamped, colorPool);
  const windStrength = 40 + clamped * 18;
  const zoneDepth = 56 + Math.min(clamped, 6) * 4;

  return {
    level: clamped,
    durationSec: Math.max(18, 32 - clamped * 2),
    wrongPopPenaltySec: clamped <= 2 ? 2 : clamped <= 4 ? 3 : 4,
    targetColorId,
    targetCount: Math.min(12, 4 + clamped),
    distractorCount: Math.min(14, 3 + clamped * 2),
    colorPool,
    fans: fansForLevel(clamped, windStrength, zoneDepth),
    driftScale: 28 + clamped * 6,
  };
}

export function applyTimePenalty(remainingSec: number, penaltySec: number): number {
  return Math.max(0, remainingSec - penaltySec);
}
