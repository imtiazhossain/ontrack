import type { MuscleKey } from './muscle-data';

/** Muscle atlas for the Muscle Explorer dropdowns — only muscles with body-plate art. */

export type MuscleAtlasVisibility = 'front' | 'back' | 'deep';

export type MuscleAtlasCategoryId =
  | 'shoulder'
  | 'arm'
  | 'forearm'
  | 'chest'
  | 'core'
  | 'back'
  | 'hips'
  | 'thighs'
  | 'calves-shins'
;

export interface MuscleAtlasCategory {
  id: MuscleAtlasCategoryId;
  label: string;
  summary: string;
}

export interface MuscleAtlasEntry {
  id: string;
  name: string;
  categoryId: MuscleAtlasCategoryId;
  visibility: MuscleAtlasVisibility;
  /** What this muscle does. */
  function: string;
  /** Anatomy-art highlight key (required — only visible muscles are listed). */
  highlightId: string;
  /** Optional workout group used for exercise suggestions. */
  workoutGroup?: MuscleKey;
}

export const MUSCLE_ATLAS_CATEGORIES: MuscleAtlasCategory[] = [
  { id: 'shoulder', label: "Shoulders", summary: "Arm position, scapular control, and rotator cuff." },
  { id: 'arm', label: "Upper Arms", summary: "Elbow flexion and extension." },
  { id: 'forearm', label: "Forearms", summary: "Wrist, grip, and forearm rotation." },
  { id: 'chest', label: "Chest", summary: "Pressing power and scapular assist." },
  { id: 'core', label: "Core & Abs", summary: "Trunk flexion, rotation, and bracing." },
  { id: 'back', label: "Back", summary: "Pulling strength and spinal support." },
  { id: 'hips', label: "Hips & Glutes", summary: "Hip drive, pelvic stability, and gait." },
  { id: 'thighs', label: "Thighs", summary: "Knee extension, flexion, and hip linkage." },
  { id: 'calves-shins', label: "Calves & Shins", summary: "Ankle propulsion and foot clearance." },
];

export const MUSCLE_ATLAS: MuscleAtlasEntry[] = [
  { id: 'anterior-deltoid', name: "Anterior deltoid", categoryId: 'shoulder', visibility: 'front', function: "Flexes and internally rotates the shoulder for front raises and presses.", highlightId: 'anterior-deltoid', workoutGroup: 'shoulders' },
  { id: 'lateral-deltoid', name: "Lateral deltoid", categoryId: 'shoulder', visibility: 'front', function: "Abducts the arm out to the side.", highlightId: 'lateral-deltoid', workoutGroup: 'shoulders' },
  { id: 'posterior-deltoid', name: "Posterior deltoid", categoryId: 'shoulder', visibility: 'back', function: "Extends and externally rotates the shoulder for reverse flies and rows.", highlightId: 'posterior-deltoid', workoutGroup: 'upper-back' },
  { id: 'teres-major', name: "Teres major", categoryId: 'shoulder', visibility: 'back', function: "Internally rotates, adducts, and extends the arm.", highlightId: 'teres-major', workoutGroup: 'lats' },
  { id: 'serratus-anterior', name: "Serratus anterior", categoryId: 'shoulder', visibility: 'front', function: "Protracts and upwardly rotates the scapula so the arm can reach overhead.", highlightId: 'serratus-anterior', workoutGroup: 'chest' },
  { id: 'trapezius', name: "Trapezius", categoryId: 'shoulder', visibility: 'back', function: "Elevates, retracts, and rotates the scapula across upper, middle, and lower fibers.", highlightId: 'trapezius', workoutGroup: 'upper-back' },
  { id: 'rhomboid-major', name: "Rhomboid major", categoryId: 'shoulder', visibility: 'deep', function: "Retracts and downwardly rotates the scapula.", highlightId: 'rhomboids', workoutGroup: 'upper-back' },
  { id: 'rhomboid-minor', name: "Rhomboid minor", categoryId: 'shoulder', visibility: 'deep', function: "Retracts the upper scapula toward the spine.", highlightId: 'rhomboids', workoutGroup: 'upper-back' },
  { id: 'pectoralis-minor', name: "Pectoralis minor", categoryId: 'shoulder', visibility: 'deep', function: "Depresses and protracts the scapula; can limit overhead mobility if tight.", highlightId: 'pectoralis-minor', workoutGroup: 'chest' },
  { id: 'biceps-brachii', name: "Biceps brachii", categoryId: 'arm', visibility: 'front', function: "Flexes the elbow and turns the palm up (supination).", highlightId: 'biceps-brachii', workoutGroup: 'biceps' },
  { id: 'brachialis', name: "Brachialis", categoryId: 'arm', visibility: 'front', function: "Primary elbow flexor beneath the biceps; builds arm thickness.", highlightId: 'brachialis', workoutGroup: 'biceps' },
  { id: 'triceps-long-head', name: "Triceps long head", categoryId: 'arm', visibility: 'back', function: "Extends the elbow and assists shoulder extension.", highlightId: 'triceps-long-head', workoutGroup: 'triceps' },
  { id: 'triceps-lateral-head', name: "Triceps lateral head", categoryId: 'arm', visibility: 'back', function: "Powerfully extends the elbow under load.", highlightId: 'triceps-lateral-head', workoutGroup: 'triceps' },
  { id: 'triceps-medial-head', name: "Triceps medial head", categoryId: 'arm', visibility: 'deep', function: "Extends the elbow through all ranges; finishes lockout.", highlightId: 'triceps-medial-head', workoutGroup: 'triceps' },
  { id: 'brachioradialis', name: "Brachioradialis", categoryId: 'forearm', visibility: 'front', function: "Flexes the elbow hardest in a neutral hammer grip.", highlightId: 'brachioradialis', workoutGroup: 'biceps' },
  { id: 'pectoralis-major', name: "Pectoralis major", categoryId: 'chest', visibility: 'front', function: "Brings the arm across the body; primary muscle for presses and flyes.", highlightId: 'pectoralis-major', workoutGroup: 'chest' },
  { id: 'pectoralis-minor-chest', name: "Pectoralis minor", categoryId: 'chest', visibility: 'deep', function: "Stabilizes and depresses the scapula during pressing.", highlightId: 'pectoralis-minor', workoutGroup: 'chest' },
  { id: 'rectus-abdominis', name: "Rectus abdominis", categoryId: 'core', visibility: 'front', function: "Flexes the trunk and controls pelvic tilt.", highlightId: 'rectus-abdominis', workoutGroup: 'core' },
  { id: 'external-oblique', name: "External oblique", categoryId: 'core', visibility: 'front', function: "Rotates and side-bends the trunk; assists bracing.", highlightId: 'obliques', workoutGroup: 'core' },
  { id: 'internal-oblique', name: "Internal oblique", categoryId: 'core', visibility: 'deep', function: "Rotates the trunk and stiffens the waist.", highlightId: 'obliques', workoutGroup: 'core' },
  { id: 'transverse-abdominis', name: "Transverse abdominis", categoryId: 'core', visibility: 'deep', function: "Draws the belly inward like a corset for deep core stiffness.", highlightId: 'transverse-abdominis', workoutGroup: 'core' },
  { id: 'quadratus-lumborum', name: "Quadratus lumborum", categoryId: 'core', visibility: 'deep', function: "Side-bends the low back and steadies the pelvis.", highlightId: 'quadratus-lumborum', workoutGroup: 'lower-back' },
  { id: 'latissimus-dorsi', name: "Latissimus dorsi", categoryId: 'back', visibility: 'back', function: "Pulls the arm down and back; main engine of pulldowns and pull-ups.", highlightId: 'latissimus-dorsi', workoutGroup: 'lats' },
  { id: 'erector-spinae', name: "Erector spinae", categoryId: 'back', visibility: 'back', function: "Extends the spine and resists folding forward under load.", highlightId: 'erector-spinae', workoutGroup: 'lower-back' },
  { id: 'multifidus', name: "Multifidus", categoryId: 'back', visibility: 'deep', function: "Fine-tunes and stabilizes individual vertebrae.", highlightId: 'multifidus', workoutGroup: 'lower-back' },
  { id: 'gluteus-maximus', name: "Gluteus maximus", categoryId: 'hips', visibility: 'back', function: "Powerfully extends the hip for thrusts, squats, and sprinting.", highlightId: 'gluteus-maximus', workoutGroup: 'glutes' },
  { id: 'gluteus-medius', name: "Gluteus medius", categoryId: 'hips', visibility: 'back', function: "Abducts the hip and keeps the pelvis level on one leg.", highlightId: 'gluteus-medius', workoutGroup: 'glutes' },
  { id: 'gluteus-minimus', name: "Gluteus minimus", categoryId: 'hips', visibility: 'deep', function: "Deep hip abductor and stabilizer.", highlightId: 'gluteus-minimus', workoutGroup: 'glutes' },
  { id: 'rectus-femoris', name: "Rectus femoris", categoryId: 'thighs', visibility: 'front', function: "Extends the knee and flexes the hip.", highlightId: 'rectus-femoris', workoutGroup: 'quadriceps' },
  { id: 'vastus-lateralis', name: "Vastus lateralis", categoryId: 'thighs', visibility: 'front', function: "Extends the knee from the outer thigh.", highlightId: 'vastus-lateralis', workoutGroup: 'quadriceps' },
  { id: 'vastus-medialis', name: "Vastus medialis", categoryId: 'thighs', visibility: 'front', function: "Extends the knee and guides the kneecap near lockout.", highlightId: 'vastus-medialis', workoutGroup: 'quadriceps' },
  { id: 'biceps-femoris', name: "Biceps femoris", categoryId: 'thighs', visibility: 'back', function: "Flexes the knee and extends the hip (outer hamstring).", highlightId: 'biceps-femoris', workoutGroup: 'hamstrings' },
  { id: 'semitendinosus', name: "Semitendinosus", categoryId: 'thighs', visibility: 'back', function: "Flexes the knee and extends the hip (medial superficial hamstring).", highlightId: 'semitendinosus', workoutGroup: 'hamstrings' },
  { id: 'semimembranosus', name: "Semimembranosus", categoryId: 'thighs', visibility: 'back', function: "Flexes the knee and extends the hip (deep medial hamstring).", highlightId: 'semimembranosus', workoutGroup: 'hamstrings' },
  { id: 'gastrocnemius', name: "Gastrocnemius", categoryId: 'calves-shins', visibility: 'back', function: "Points the foot down and assists knee flexion; strongest with a straight knee.", highlightId: 'gastrocnemius', workoutGroup: 'calves' },
  { id: 'soleus', name: "Soleus", categoryId: 'calves-shins', visibility: 'back', function: "Points the foot down with a bent knee; key standing posture muscle.", highlightId: 'soleus', workoutGroup: 'calves' },
];

export const MUSCLE_ATLAS_BY_ID = Object.fromEntries(
  MUSCLE_ATLAS.map((m) => [m.id, m]),
) as Record<string, MuscleAtlasEntry>;

export const MUSCLE_ATLAS_CATEGORY_BY_ID = Object.fromEntries(
  MUSCLE_ATLAS_CATEGORIES.map((c) => [c.id, c]),
) as Record<MuscleAtlasCategoryId, MuscleAtlasCategory>;

export function musclesInCategory(categoryId: MuscleAtlasCategoryId): MuscleAtlasEntry[] {
  return MUSCLE_ATLAS.filter((m) => m.categoryId === categoryId);
}
