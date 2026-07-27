import type { BodyView, MuscleKey } from './muscle-data';

interface MuscleTouchZone {
  key: MuscleKey;
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Coordinate system used by the portrait anatomy artwork. */
export const BODY_VIEWBOX = {
  width: 220,
  height: 360,
} as const;

/**
 * Generous normalized touch zones make the detailed artwork easy to use on a
 * phone. When zones overlap, muscleAtPoint prefers the smallest target.
 */
const MUSCLE_TOUCH_ZONES: Record<BodyView, MuscleTouchZone[]> = {
  front: [
    { key: 'shoulders', left: 48, top: 56, width: 124, height: 46 },
    { key: 'chest', left: 76, top: 82, width: 68, height: 48 },
    { key: 'biceps', left: 42, top: 110, width: 136, height: 54 },
    { key: 'core', left: 82, top: 130, width: 56, height: 62 },
    { key: 'quadriceps', left: 72, top: 200, width: 76, height: 82 },
  ],
  back: [
    { key: 'upper-back', left: 72, top: 64, width: 76, height: 56 },
    { key: 'triceps', left: 40, top: 108, width: 140, height: 58 },
    { key: 'lats', left: 70, top: 112, width: 80, height: 58 },
    { key: 'lower-back', left: 82, top: 154, width: 56, height: 48 },
    { key: 'glutes', left: 72, top: 184, width: 76, height: 52 },
    { key: 'hamstrings', left: 70, top: 225, width: 80, height: 70 },
    { key: 'calves', left: 70, top: 290, width: 80, height: 62 },
  ],
};

/** Resolve a tap in the anatomy artwork's normalized coordinate space. */
export function muscleAtPoint(
  bodyView: BodyView,
  locationX: number,
  locationY: number,
): MuscleKey | undefined {
  return MUSCLE_TOUCH_ZONES[bodyView]
    .filter(
      (zone) =>
        locationX >= zone.left &&
        locationX <= zone.left + zone.width &&
        locationY >= zone.top &&
        locationY <= zone.top + zone.height,
    )
    .sort((a, b) => a.width * a.height - b.width * b.height)[0]?.key;
}
