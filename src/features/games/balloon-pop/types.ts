export type BalloonColorId = 'red' | 'blue' | 'green' | 'yellow' | 'purple';

export type FanSide = 'left' | 'right' | 'top' | 'bottom';

export type GamePhase = 'ready' | 'playing' | 'won' | 'lost';

export interface BalloonColorDef {
  id: BalloonColorId;
  label: string;
  /** Light-mode fill from category jewel tones. */
  light: string;
  /** Dark-mode fill from category jewel tones. */
  dark: string;
}

export interface Balloon {
  id: string;
  colorId: BalloonColorId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface FanConfig {
  side: FanSide;
  /** Acceleration applied while a balloon is inside the wind strip (px/s²). */
  strength: number;
  /** Depth of the wind strip from the edge (px). */
  zoneDepth: number;
}

export interface LevelConfig {
  level: number;
  durationSec: number;
  /** Seconds subtracted for popping a non-target balloon. */
  wrongPopPenaltySec: number;
  targetColorId: BalloonColorId;
  targetCount: number;
  distractorCount: number;
  /** Colors available for distractors (and pool when picking). */
  colorPool: readonly BalloonColorId[];
  fans: readonly FanConfig[];
  /** Base drift speed scale for initial velocities. */
  driftScale: number;
}

export interface StageBounds {
  width: number;
  height: number;
}
