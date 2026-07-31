import { ART_VIEWBOX } from './anatomy-art';
import type { BodyView, MuscleKey } from './muscle-data';

export interface MuscleHitBox {
  /** Stable React key. */
  id: string;
  key: MuscleKey;
  /** Pre-rendered highlight JPG id in `muscle-highlight-images`. */
  highlightId: string;
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
  /** Higher wins when boxes overlap (and when sorting Pressables). */
  priority: number;
}

/** Same coordinate space as the anatomy plate (100 × 174.21). */
export const BODY_VIEWBOX = ART_VIEWBOX;

/**
 * Invisible tap targets over the highlight JPG.
 * Coordinates were fit to finished 640×1114 plates (orange highlight bounds).
 * `left`/`width` are % of plate width; `top`/`height` are ART_VIEWBOX units.
 */
export const MUSCLE_HIT_BOXES: Record<BodyView, MuscleHitBox[]> = {
  front: [
    // Outer deltoid caps — kept outside the pec belly so chest wins center taps.
    {
      id: 'front-shoulder-l',
      key: 'shoulders',
      highlightId: 'anterior-deltoid',
      label: 'Left anterior deltoid',
      left: 27,
      top: 38,
      width: 12,
      height: 16,
      priority: 6,
    },
    {
      id: 'front-shoulder-r',
      key: 'shoulders',
      highlightId: 'anterior-deltoid',
      label: 'Right anterior deltoid',
      left: 61,
      top: 38,
      width: 12,
      height: 16,
      priority: 6,
    },
    {
      id: 'front-chest',
      key: 'chest',
      highlightId: 'pectoralis-major',
      label: 'Pectoralis major',
      left: 35,
      top: 39,
      width: 30,
      height: 16,
      priority: 5,
    },
    {
      id: 'front-biceps-l',
      key: 'biceps',
      highlightId: 'biceps-brachii',
      label: 'Left biceps',
      left: 25,
      top: 48,
      width: 12,
      height: 22,
      priority: 4,
    },
    {
      id: 'front-biceps-r',
      key: 'biceps',
      highlightId: 'biceps-brachii',
      label: 'Right biceps',
      left: 63,
      top: 48,
      width: 12,
      height: 22,
      priority: 4,
    },
    {
      id: 'front-core',
      key: 'core',
      highlightId: 'rectus-abdominis',
      label: 'Rectus abdominis',
      left: 41,
      top: 54,
      width: 18,
      height: 28,
      priority: 4,
    },
    {
      id: 'front-quads-l',
      key: 'quadriceps',
      highlightId: 'rectus-femoris',
      label: 'Left quadriceps',
      left: 33,
      top: 96,
      width: 14,
      height: 22,
      priority: 3,
    },
    {
      id: 'front-quads-r',
      key: 'quadriceps',
      highlightId: 'rectus-femoris',
      label: 'Right quadriceps',
      left: 53,
      top: 96,
      width: 14,
      height: 22,
      priority: 3,
    },
    {
      id: 'front-calves-l',
      key: 'calves',
      highlightId: 'gastrocnemius',
      label: 'Left calves',
      left: 32,
      top: 120,
      width: 14,
      height: 28,
      priority: 3,
    },
    {
      id: 'front-calves-r',
      key: 'calves',
      highlightId: 'gastrocnemius',
      label: 'Right calves',
      left: 54,
      top: 120,
      width: 14,
      height: 28,
      priority: 3,
    },
  ],
  back: [
    {
      id: 'back-traps',
      key: 'upper-back',
      highlightId: 'trapezius',
      label: 'Trapezius',
      left: 35,
      top: 32,
      width: 30,
      height: 24,
      priority: 4,
    },
    {
      id: 'back-rear-delt-l',
      key: 'upper-back',
      highlightId: 'posterior-deltoid',
      label: 'Left posterior deltoid',
      left: 28,
      top: 40,
      width: 14,
      height: 14,
      priority: 6,
    },
    {
      id: 'back-rear-delt-r',
      key: 'upper-back',
      highlightId: 'posterior-deltoid',
      label: 'Right posterior deltoid',
      left: 58,
      top: 40,
      width: 14,
      height: 14,
      priority: 6,
    },
    {
      id: 'back-triceps-l',
      key: 'triceps',
      highlightId: 'triceps-long-head',
      label: 'Left triceps',
      left: 26,
      top: 48,
      width: 12,
      height: 22,
      priority: 5,
    },
    {
      id: 'back-triceps-r',
      key: 'triceps',
      highlightId: 'triceps-long-head',
      label: 'Right triceps',
      left: 62,
      top: 48,
      width: 12,
      height: 22,
      priority: 5,
    },
    {
      id: 'back-lats',
      key: 'lats',
      highlightId: 'latissimus-dorsi',
      label: 'Latissimus dorsi',
      left: 33,
      top: 48,
      width: 34,
      height: 24,
      priority: 3,
    },
    {
      id: 'back-lower',
      key: 'lower-back',
      highlightId: 'erector-spinae',
      label: 'Erector spinae',
      left: 42,
      top: 66,
      width: 16,
      height: 16,
      priority: 4,
    },
    {
      id: 'back-glutes',
      key: 'glutes',
      highlightId: 'gluteus-maximus',
      label: 'Gluteus maximus',
      left: 36,
      top: 74,
      width: 28,
      height: 20,
      priority: 4,
    },
    {
      id: 'back-hams-l',
      key: 'hamstrings',
      highlightId: 'biceps-femoris',
      label: 'Left hamstrings',
      left: 34,
      top: 96,
      width: 14,
      height: 22,
      priority: 3,
    },
    {
      id: 'back-hams-r',
      key: 'hamstrings',
      highlightId: 'biceps-femoris',
      label: 'Right hamstrings',
      left: 52,
      top: 96,
      width: 14,
      height: 22,
      priority: 3,
    },
    {
      id: 'back-calves-l',
      key: 'calves',
      highlightId: 'gastrocnemius',
      label: 'Left calves',
      left: 31,
      top: 118,
      width: 15,
      height: 28,
      priority: 3,
    },
    {
      id: 'back-calves-r',
      key: 'calves',
      highlightId: 'gastrocnemius',
      label: 'Right calves',
      left: 54,
      top: 118,
      width: 15,
      height: 28,
      priority: 3,
    },
  ],
  // Profile silhouette facing right — one side plate (body treated as symmetrical).
  side: [
    {
      id: 'side-shoulder',
      key: 'shoulders',
      highlightId: 'lateral-deltoid',
      label: 'Deltoid',
      left: 36,
      top: 33,
      width: 18,
      height: 18,
      priority: 5,
    },
    {
      id: 'side-chest',
      key: 'chest',
      highlightId: 'pectoralis-major',
      label: 'Chest',
      left: 50,
      top: 36,
      width: 12,
      height: 18,
      priority: 6,
    },
    {
      id: 'side-biceps',
      key: 'biceps',
      highlightId: 'biceps-brachii',
      label: 'Biceps',
      left: 44,
      top: 48,
      width: 10,
      height: 18,
      priority: 4,
    },
    {
      id: 'side-triceps',
      key: 'triceps',
      highlightId: 'triceps-long-head',
      label: 'Triceps',
      left: 36,
      top: 48,
      width: 10,
      height: 20,
      priority: 4,
    },
    {
      id: 'side-core',
      key: 'core',
      highlightId: 'obliques',
      label: 'Core / obliques',
      left: 44,
      top: 58,
      width: 14,
      height: 22,
      priority: 3,
    },
    {
      id: 'side-glutes',
      key: 'glutes',
      highlightId: 'gluteus-maximus',
      label: 'Glutes',
      left: 36,
      top: 72,
      width: 12,
      height: 20,
      priority: 5,
    },
    {
      id: 'side-quads',
      key: 'quadriceps',
      highlightId: 'rectus-femoris',
      label: 'Quadriceps',
      left: 46,
      top: 96,
      width: 12,
      height: 22,
      priority: 4,
    },
    {
      id: 'side-hams',
      key: 'hamstrings',
      highlightId: 'biceps-femoris',
      label: 'Hamstrings',
      left: 39,
      top: 96,
      width: 10,
      height: 24,
      priority: 3,
    },
    {
      id: 'side-calves',
      key: 'calves',
      highlightId: 'gastrocnemius',
      label: 'Calves',
      left: 38,
      top: 122,
      width: 14,
      height: 26,
      priority: 3,
    },
  ],
};

/** Layout style fractions for an invisible hit box over the plate. */
export function hitBoxStyle(box: MuscleHitBox) {
  return {
    left: `${box.left}%`,
    top: `${(box.top / BODY_VIEWBOX.height) * 100}%`,
    width: `${box.width}%`,
    height: `${(box.height / BODY_VIEWBOX.height) * 100}%`,
  } as const;
}

/** Hit boxes drawn low→high priority so overlaps prefer the higher priority target. */
export function orderedHitBoxes(bodyView: BodyView): MuscleHitBox[] {
  return [...MUSCLE_HIT_BOXES[bodyView]].sort((a, b) => a.priority - b.priority);
}

/** Resolve a tap in ART_VIEWBOX space (used by tests + fallback). */
export function muscleAtPoint(
  bodyView: BodyView,
  locationX: number,
  locationY: number,
): MuscleKey | undefined {
  return hitBoxAtPoint(bodyView, locationX, locationY)?.key;
}

/** Resolve the full hit box for a point in ART_VIEWBOX space. */
export function hitBoxAtPoint(
  bodyView: BodyView,
  locationX: number,
  locationY: number,
): MuscleHitBox | undefined {
  const hits = MUSCLE_HIT_BOXES[bodyView].filter(
    (zone) =>
      locationX >= zone.left &&
      locationX <= zone.left + zone.width &&
      locationY >= zone.top &&
      locationY <= zone.top + zone.height,
  );
  if (hits.length === 0) return undefined;

  hits.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.width * a.height - b.width * b.height;
  });
  return hits[0];
}
