import type { SymbolViewProps } from 'expo-symbols';

export type BodyView = 'front' | 'back';

export type MuscleKey =
  | 'shoulders'
  | 'chest'
  | 'biceps'
  | 'core'
  | 'quadriceps'
  | 'upper-back'
  | 'lats'
  | 'triceps'
  | 'lower-back'
  | 'glutes'
  | 'hamstrings'
  | 'calves';

export interface ExerciseTemplate {
  id: string;
  name: string;
  icon: Extract<SymbolViewProps['name'], string>;
  equipment: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface MuscleGroup {
  key: MuscleKey;
  label: string;
  view: BodyView;
  muscles: string[];
  cue: string;
  exercises: ExerciseTemplate[];
}

export interface MuscleHighlightArea {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation?: number;
}

export interface MuscleTarget {
  id: string;
  label: string;
  description: string;
  cue: string;
  highlightAreas: MuscleHighlightArea[];
  exercises: ExerciseTemplate[];
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  {
    key: 'shoulders',
    label: 'Shoulders',
    view: 'front',
    muscles: ['Anterior deltoid', 'Lateral deltoid'],
    cue: 'Press and raise with control; keep your ribs stacked over your hips.',
    exercises: [
      { id: 'overhead-press', name: 'Overhead Press', icon: 'figure.strengthtraining.traditional', equipment: 'Dumbbells', sets: 3, reps: 8, restSeconds: 90 },
      { id: 'lateral-raise', name: 'Lateral Raise', icon: 'dumbbell.fill', equipment: 'Dumbbells', sets: 3, reps: 12, restSeconds: 60 },
      { id: 'pike-push-up', name: 'Pike Push-Up', icon: 'figure.strengthtraining.functional', equipment: 'Bodyweight', sets: 3, reps: 10, restSeconds: 75 },
    ],
  },
  {
    key: 'chest',
    label: 'Chest',
    view: 'front',
    muscles: ['Pectoralis major', 'Pectoralis minor', 'Serratus anterior'],
    cue: 'Let the shoulder blades move naturally and finish each rep without shrugging.',
    exercises: [
      { id: 'bench-press', name: 'Bench Press', icon: 'dumbbell.fill', equipment: 'Barbell', sets: 3, reps: 8, restSeconds: 120 },
      { id: 'push-up', name: 'Push-Up', icon: 'figure.strengthtraining.functional', equipment: 'Bodyweight', sets: 3, reps: 12, restSeconds: 75 },
      { id: 'cable-fly', name: 'Cable Fly', icon: 'figure.strengthtraining.traditional', equipment: 'Cable', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    key: 'biceps',
    label: 'Biceps',
    view: 'front',
    muscles: ['Biceps brachii', 'Brachialis', 'Brachioradialis'],
    cue: 'Keep your upper arm quiet and use the full elbow range you can control.',
    exercises: [
      { id: 'incline-curl', name: 'Incline Curl', icon: 'dumbbell.fill', equipment: 'Dumbbells', sets: 3, reps: 10, restSeconds: 60 },
      { id: 'chin-up', name: 'Chin-Up', icon: 'figure.strengthtraining.functional', equipment: 'Pull-up bar', sets: 3, reps: 6, restSeconds: 120 },
      { id: 'hammer-curl', name: 'Hammer Curl', icon: 'dumbbell.fill', equipment: 'Dumbbells', sets: 3, reps: 10, restSeconds: 60 },
    ],
  },
  {
    key: 'core',
    label: 'Core',
    view: 'front',
    muscles: ['Rectus abdominis', 'Internal and external obliques', 'Transverse abdominis'],
    cue: 'Exhale, brace, and keep your pelvis and rib cage connected through the rep.',
    exercises: [
      { id: 'dead-bug', name: 'Dead Bug', icon: 'figure.core.training', equipment: 'Bodyweight', sets: 3, reps: 10, restSeconds: 45 },
      { id: 'front-plank', name: 'Front Plank', icon: 'figure.core.training', equipment: 'Bodyweight', sets: 3, reps: 30, restSeconds: 45 },
      { id: 'cable-chop', name: 'Cable Chop', icon: 'figure.strengthtraining.functional', equipment: 'Cable', sets: 3, reps: 10, restSeconds: 60 },
    ],
  },
  {
    key: 'quadriceps',
    label: 'Quadriceps',
    view: 'front',
    muscles: ['Rectus femoris', 'Vastus lateralis', 'Vastus medialis'],
    cue: 'Track the knees with the toes and use a depth you can own without pain.',
    exercises: [
      { id: 'goblet-squat', name: 'Goblet Squat', icon: 'figure.strengthtraining.functional', equipment: 'Dumbbell', sets: 3, reps: 10, restSeconds: 90 },
      { id: 'split-squat', name: 'Split Squat', icon: 'figure.strengthtraining.functional', equipment: 'Bodyweight', sets: 3, reps: 8, restSeconds: 75 },
      { id: 'leg-extension', name: 'Leg Extension', icon: 'figure.strengthtraining.traditional', equipment: 'Machine', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    key: 'upper-back',
    label: 'Upper back',
    view: 'back',
    muscles: ['Trapezius', 'Rhomboids', 'Posterior deltoid'],
    cue: 'Lead with the elbows and finish with the shoulder blades, not the neck.',
    exercises: [
      { id: 'chest-supported-row', name: 'Chest-Supported Row', icon: 'dumbbell.fill', equipment: 'Dumbbells', sets: 3, reps: 10, restSeconds: 90 },
      { id: 'face-pull', name: 'Face Pull', icon: 'figure.strengthtraining.traditional', equipment: 'Cable', sets: 3, reps: 12, restSeconds: 60 },
      { id: 'reverse-fly', name: 'Reverse Fly', icon: 'dumbbell.fill', equipment: 'Dumbbells', sets: 3, reps: 12, restSeconds: 60 },
    ],
  },
  {
    key: 'lats',
    label: 'Lats',
    view: 'back',
    muscles: ['Latissimus dorsi', 'Teres major'],
    cue: 'Drive the elbows toward your pockets while keeping the shoulders away from your ears.',
    exercises: [
      { id: 'lat-pulldown', name: 'Lat Pulldown', icon: 'figure.strengthtraining.traditional', equipment: 'Cable', sets: 3, reps: 10, restSeconds: 90 },
      { id: 'pull-up', name: 'Pull-Up', icon: 'figure.strengthtraining.functional', equipment: 'Pull-up bar', sets: 3, reps: 6, restSeconds: 120 },
      { id: 'one-arm-row', name: 'One-Arm Row', icon: 'dumbbell.fill', equipment: 'Dumbbell', sets: 3, reps: 10, restSeconds: 75 },
    ],
  },
  {
    key: 'triceps',
    label: 'Triceps',
    view: 'back',
    muscles: ['Triceps brachii: long, lateral, and medial heads'],
    cue: 'Keep the elbows steady and fully straighten without forcing the joint.',
    exercises: [
      { id: 'cable-pushdown', name: 'Cable Pushdown', icon: 'figure.strengthtraining.traditional', equipment: 'Cable', sets: 3, reps: 12, restSeconds: 60 },
      { id: 'close-grip-push-up', name: 'Close-Grip Push-Up', icon: 'figure.strengthtraining.functional', equipment: 'Bodyweight', sets: 3, reps: 10, restSeconds: 75 },
      { id: 'overhead-extension', name: 'Overhead Extension', icon: 'dumbbell.fill', equipment: 'Dumbbell', sets: 3, reps: 10, restSeconds: 60 },
    ],
  },
  {
    key: 'lower-back',
    label: 'Lower back',
    view: 'back',
    muscles: ['Erector spinae', 'Multifidus', 'Quadratus lumborum'],
    cue: 'Create tension through the whole trunk and move at the hips instead of overextending.',
    exercises: [
      { id: 'back-extension', name: 'Back Extension', icon: 'figure.strengthtraining.functional', equipment: 'Roman chair', sets: 3, reps: 10, restSeconds: 75 },
      { id: 'bird-dog', name: 'Bird Dog', icon: 'figure.core.training', equipment: 'Bodyweight', sets: 3, reps: 10, restSeconds: 45 },
      { id: 'good-morning', name: 'Good Morning', icon: 'figure.strengthtraining.traditional', equipment: 'Barbell', sets: 3, reps: 8, restSeconds: 90 },
    ],
  },
  {
    key: 'glutes',
    label: 'Glutes',
    view: 'back',
    muscles: ['Gluteus maximus', 'Gluteus medius', 'Gluteus minimus'],
    cue: 'Keep the pelvis level and finish through the hip without arching the low back.',
    exercises: [
      { id: 'hip-thrust', name: 'Hip Thrust', icon: 'figure.strengthtraining.traditional', equipment: 'Barbell', sets: 3, reps: 10, restSeconds: 90 },
      { id: 'step-up', name: 'Step-Up', icon: 'figure.stairs', equipment: 'Bench', sets: 3, reps: 8, restSeconds: 75 },
      { id: 'band-abduction', name: 'Band Abduction', icon: 'figure.strengthtraining.functional', equipment: 'Resistance band', sets: 3, reps: 15, restSeconds: 45 },
    ],
  },
  {
    key: 'hamstrings',
    label: 'Hamstrings',
    view: 'back',
    muscles: ['Biceps femoris', 'Semitendinosus', 'Semimembranosus'],
    cue: 'Hinge from the hips and stop before the low back begins to round.',
    exercises: [
      { id: 'romanian-deadlift', name: 'Romanian Deadlift', icon: 'figure.strengthtraining.traditional', equipment: 'Barbell', sets: 3, reps: 8, restSeconds: 120 },
      { id: 'leg-curl', name: 'Leg Curl', icon: 'figure.strengthtraining.traditional', equipment: 'Machine', sets: 3, reps: 12, restSeconds: 75 },
      { id: 'single-leg-hinge', name: 'Single-Leg Hinge', icon: 'figure.strengthtraining.functional', equipment: 'Dumbbell', sets: 3, reps: 8, restSeconds: 75 },
    ],
  },
  {
    key: 'calves',
    label: 'Calves',
    view: 'back',
    muscles: ['Gastrocnemius', 'Soleus'],
    cue: 'Pause at the top and lower slowly through a comfortable range.',
    exercises: [
      { id: 'standing-calf-raise', name: 'Standing Calf Raise', icon: 'figure.strengthtraining.functional', equipment: 'Bodyweight', sets: 3, reps: 15, restSeconds: 45 },
      { id: 'seated-calf-raise', name: 'Seated Calf Raise', icon: 'figure.strengthtraining.traditional', equipment: 'Machine', sets: 3, reps: 15, restSeconds: 45 },
      { id: 'single-leg-calf-raise', name: 'Single-Leg Calf Raise', icon: 'figure.strengthtraining.functional', equipment: 'Bodyweight', sets: 3, reps: 12, restSeconds: 45 },
    ],
  },
];

export const MUSCLE_GROUPS_BY_KEY = Object.fromEntries(
  MUSCLE_GROUPS.map((group) => [group.key, group]),
) as Record<MuscleKey, MuscleGroup>;

function movement(
  id: string,
  name: string,
  equipment: string,
  reps = 12,
  restSeconds = 60,
  icon: ExerciseTemplate['icon'] = 'dumbbell.fill',
): ExerciseTemplate {
  return { id, name, icon, equipment, sets: 3, reps, restSeconds };
}

const TARGET_ONLY_EXERCISES: ExerciseTemplate[] = [
  movement('front-raise', 'Front Raise', 'Dumbbells', 12, 60),
  movement('arnold-press', 'Arnold Press', 'Dumbbells', 10, 75),
  movement('cable-lateral-raise', 'Cable Lateral Raise', 'Cable', 12, 60),
  movement('upright-row', 'Wide-Grip Upright Row', 'Cable', 10, 75),
  movement('assisted-dip', 'Assisted Dip', 'Dip station', 8, 90, 'figure.strengthtraining.functional'),
  movement('dumbbell-pullover', 'Dumbbell Pullover', 'Dumbbell', 10, 75),
  movement('scapular-push-up', 'Scapular Push-Up', 'Bodyweight', 12, 45, 'figure.strengthtraining.functional'),
  movement('push-up-plus', 'Push-Up Plus', 'Bodyweight', 12, 45, 'figure.strengthtraining.functional'),
  movement('wall-slide', 'Serratus Wall Slide', 'Resistance band', 12, 45, 'figure.strengthtraining.functional'),
  movement('landmine-press', 'Single-Arm Landmine Press', 'Landmine', 10, 75, 'figure.strengthtraining.traditional'),
  movement('barbell-curl', 'Barbell Curl', 'Barbell', 10, 75),
  movement('reverse-curl', 'Reverse Curl', 'EZ bar', 12, 60),
  movement('preacher-curl', 'Preacher Curl', 'EZ bar', 10, 60),
  movement('zottman-curl', 'Zottman Curl', 'Dumbbells', 10, 60),
  movement('cable-crunch', 'Cable Crunch', 'Cable', 12, 60, 'figure.core.training'),
  movement('hanging-knee-raise', 'Hanging Knee Raise', 'Pull-up bar', 10, 60, 'figure.core.training'),
  movement('side-plank', 'Side Plank', 'Bodyweight', 30, 45, 'figure.core.training'),
  movement('suitcase-carry', 'Suitcase Carry', 'Dumbbell', 30, 60, 'figure.strengthtraining.functional'),
  movement('hollow-hold', 'Hollow-Body Hold', 'Bodyweight', 30, 45, 'figure.core.training'),
  movement('reverse-nordic', 'Reverse Nordic', 'Bodyweight', 8, 75, 'figure.strengthtraining.functional'),
  movement('narrow-leg-press', 'Narrow-Stance Leg Press', 'Machine', 10, 90, 'figure.strengthtraining.traditional'),
  movement('hack-squat', 'Hack Squat', 'Machine', 10, 90, 'figure.strengthtraining.traditional'),
  movement('step-down', 'Controlled Step-Down', 'Step', 10, 60, 'figure.stairs'),
  movement('heel-elevated-squat', 'Heel-Elevated Squat', 'Dumbbell', 10, 75, 'figure.strengthtraining.functional'),
  movement('terminal-knee-extension', 'Terminal Knee Extension', 'Resistance band', 15, 45, 'figure.strengthtraining.functional'),
  movement('farmer-carry', 'Farmer Carry', 'Dumbbells', 30, 75, 'figure.strengthtraining.functional'),
  movement('dumbbell-shrug', 'Dumbbell Shrug', 'Dumbbells', 12, 60),
  movement('seated-cable-row', 'Seated Cable Row', 'Cable', 10, 75, 'figure.strengthtraining.traditional'),
  movement('band-pull-apart', 'Band Pull-Apart', 'Resistance band', 15, 45, 'figure.strengthtraining.functional'),
  movement('rear-delt-row', 'Rear-Delt Row', 'Dumbbells', 12, 60),
  movement('straight-arm-pulldown', 'Straight-Arm Pulldown', 'Cable', 12, 60, 'figure.strengthtraining.traditional'),
  movement('neutral-pulldown', 'Neutral-Grip Pulldown', 'Cable', 10, 75, 'figure.strengthtraining.traditional'),
  movement('skull-crusher', 'Skull Crusher', 'EZ bar', 10, 75),
  movement('incline-cable-extension', 'Incline Cable Extension', 'Cable', 12, 60, 'figure.strengthtraining.traditional'),
  movement('close-grip-bench', 'Close-Grip Bench Press', 'Barbell', 8, 90),
  movement('reverse-grip-pushdown', 'Reverse-Grip Pushdown', 'Cable', 12, 60, 'figure.strengthtraining.traditional'),
  movement('diamond-push-up', 'Diamond Push-Up', 'Bodyweight', 10, 60, 'figure.strengthtraining.functional'),
  movement('single-arm-pushdown', 'Single-Arm Pushdown', 'Cable', 12, 45, 'figure.strengthtraining.traditional'),
  movement('pallof-press', 'Pallof Press', 'Cable', 10, 60, 'figure.core.training'),
  movement('hip-hike', 'Standing Hip Hike', 'Step', 12, 45, 'figure.stairs'),
  movement('lateral-step-up', 'Lateral Step-Up', 'Step', 10, 60, 'figure.stairs'),
  movement('clamshell', 'Banded Clamshell', 'Resistance band', 15, 45, 'figure.strengthtraining.functional'),
  movement('side-lying-abduction', 'Side-Lying Hip Abduction', 'Bodyweight', 15, 45, 'figure.strengthtraining.functional'),
  movement('balance-reach', 'Single-Leg Balance Reach', 'Bodyweight', 10, 45, 'figure.strengthtraining.functional'),
  movement('monster-walk', 'Monster Walk', 'Resistance band', 12, 45, 'figure.strengthtraining.functional'),
  movement('nordic-curl', 'Nordic Hamstring Curl', 'Bodyweight', 6, 120, 'figure.strengthtraining.functional'),
  movement('seated-leg-curl', 'Seated Leg Curl', 'Machine', 12, 75, 'figure.strengthtraining.traditional'),
  movement('glute-ham-raise', 'Glute-Ham Raise', 'GHD', 8, 90, 'figure.strengthtraining.functional'),
  movement('lying-leg-curl', 'Lying Leg Curl', 'Machine', 12, 75, 'figure.strengthtraining.traditional'),
  movement('slider-curl', 'Hamstring Slider Curl', 'Sliders', 10, 60, 'figure.strengthtraining.functional'),
  movement('jump-rope', 'Jump Rope', 'Jump rope', 30, 45, 'figure.strengthtraining.functional'),
  movement('bent-knee-calf-raise', 'Bent-Knee Calf Raise', 'Dumbbell', 15, 45, 'figure.strengthtraining.functional'),
  movement('sled-push', 'Heavy Sled Push', 'Sled', 20, 75, 'figure.strengthtraining.functional'),
];

const ALL_EXERCISES = [
  ...MUSCLE_GROUPS.flatMap((group) => group.exercises),
  ...TARGET_ONLY_EXERCISES,
];

export const EXERCISES_BY_ID = Object.fromEntries(
  ALL_EXERCISES.map((exercise) => [exercise.id, exercise]),
) as Record<string, ExerciseTemplate>;

function exercises(...ids: string[]): ExerciseTemplate[] {
  return ids.map((id) => {
    const exercise = EXERCISES_BY_ID[id];
    if (!exercise) throw new Error(`Unknown exercise: ${id}`);
    return exercise;
  });
}

export const MUSCLE_TARGETS_BY_GROUP: Record<MuscleKey, MuscleTarget[]> = {
  shoulders: [
    {
      id: 'anterior-deltoid',
      label: 'Anterior deltoid',
      description: 'The front shoulder fibers that flex and internally rotate the upper arm.',
      cue: 'Keep the ribs down and finish the raise at shoulder height without shrugging.',
      highlightAreas: [{ cx: 31, cy: 39, rx: 5, ry: 7 }, { cx: 69, cy: 39, rx: 5, ry: 7 }],
      exercises: exercises('overhead-press', 'front-raise', 'arnold-press'),
    },
    {
      id: 'lateral-deltoid',
      label: 'Lateral deltoid',
      description: 'The middle shoulder fibers responsible for raising the arm out to the side.',
      cue: 'Lead with the elbows and stop before the upper traps take over.',
      highlightAreas: [{ cx: 25, cy: 40, rx: 5, ry: 8 }, { cx: 75, cy: 40, rx: 5, ry: 8 }],
      exercises: exercises('lateral-raise', 'cable-lateral-raise', 'upright-row'),
    },
  ],
  chest: [
    {
      id: 'pectoralis-major',
      label: 'Pectoralis major',
      description: 'The large superficial chest muscle that brings the upper arm across the body.',
      cue: 'Keep the shoulder blades supported and bring the upper arms toward the midline.',
      highlightAreas: [{ cx: 39, cy: 45, rx: 10, ry: 9 }, { cx: 61, cy: 45, rx: 10, ry: 9 }],
      exercises: exercises('bench-press', 'cable-fly', 'push-up'),
    },
    {
      id: 'pectoralis-minor',
      label: 'Pectoralis minor',
      description: 'A smaller, deeper chest muscle that helps control the shoulder blade.',
      cue: 'Reach fully at the top while keeping the neck long and the ribs quiet.',
      highlightAreas: [{ cx: 43, cy: 48, rx: 5, ry: 6 }, { cx: 57, cy: 48, rx: 5, ry: 6 }],
      exercises: exercises('assisted-dip', 'dumbbell-pullover', 'scapular-push-up'),
    },
    {
      id: 'serratus-anterior',
      label: 'Serratus anterior',
      description: 'The rib-side muscle that protracts and upwardly rotates the shoulder blade.',
      cue: 'Finish each rep by reaching the shoulder blades around the rib cage.',
      highlightAreas: [{ cx: 34, cy: 56, rx: 4, ry: 10 }, { cx: 66, cy: 56, rx: 4, ry: 10 }],
      exercises: exercises('push-up-plus', 'wall-slide', 'landmine-press'),
    },
  ],
  biceps: [
    {
      id: 'biceps-brachii',
      label: 'Biceps brachii',
      description: 'The two-headed upper-arm muscle that bends the elbow and turns the palm up.',
      cue: 'Keep the upper arm still and fully supinate the palm as you curl.',
      highlightAreas: [{ cx: 25, cy: 57, rx: 4, ry: 12 }, { cx: 75, cy: 57, rx: 4, ry: 12 }],
      exercises: exercises('incline-curl', 'chin-up', 'barbell-curl'),
    },
    {
      id: 'brachialis',
      label: 'Brachialis',
      description: 'A deep elbow flexor beneath the biceps that adds upper-arm thickness.',
      cue: 'Use a neutral or pronated grip and avoid letting the elbows drift forward.',
      highlightAreas: [{ cx: 27, cy: 64, rx: 3.5, ry: 8 }, { cx: 73, cy: 64, rx: 3.5, ry: 8 }],
      exercises: exercises('hammer-curl', 'reverse-curl', 'preacher-curl'),
    },
    {
      id: 'brachioradialis',
      label: 'Brachioradialis',
      description: 'The prominent forearm-side elbow flexor strongest with a neutral grip.',
      cue: 'Keep the wrist neutral and drive the thumb toward the shoulder.',
      highlightAreas: [{ cx: 19, cy: 75, rx: 3.5, ry: 12 }, { cx: 81, cy: 75, rx: 3.5, ry: 12 }],
      exercises: exercises('hammer-curl', 'reverse-curl', 'zottman-curl'),
    },
  ],
  core: [
    {
      id: 'rectus-abdominis',
      label: 'Rectus abdominis',
      description: 'The front abdominal wall that flexes the trunk and resists extension.',
      cue: 'Exhale, bring the ribs toward the pelvis, and avoid pulling on the neck.',
      highlightAreas: [{ cx: 46, cy: 69, rx: 5, ry: 17 }, { cx: 54, cy: 69, rx: 5, ry: 17 }],
      exercises: exercises('front-plank', 'cable-crunch', 'hanging-knee-raise'),
    },
    {
      id: 'obliques',
      label: 'Internal & external obliques',
      description: 'The side abdominal layers that rotate, side-bend, and resist unwanted motion.',
      cue: 'Keep the hips square and rotate through the rib cage under control.',
      highlightAreas: [{ cx: 38, cy: 70, rx: 5, ry: 17 }, { cx: 62, cy: 70, rx: 5, ry: 17 }],
      exercises: exercises('cable-chop', 'side-plank', 'suitcase-carry'),
    },
    {
      id: 'transverse-abdominis',
      label: 'Transverse abdominis',
      description: 'The deepest abdominal layer that braces the trunk like a corset.',
      cue: 'Breathe out gently, brace 360 degrees, and keep the low back quiet.',
      highlightAreas: [{ cx: 50, cy: 81, rx: 12, ry: 5 }],
      exercises: exercises('dead-bug', 'bird-dog', 'hollow-hold'),
    },
  ],
  quadriceps: [
    {
      id: 'rectus-femoris',
      label: 'Rectus femoris',
      description: 'The central quadriceps muscle that extends the knee and assists hip flexion.',
      cue: 'Keep the pelvis stacked and control both the lifting and lowering phases.',
      highlightAreas: [{ cx: 43, cy: 112, rx: 4.5, ry: 20 }, { cx: 57, cy: 112, rx: 4.5, ry: 20 }],
      exercises: exercises('leg-extension', 'reverse-nordic', 'split-squat'),
    },
    {
      id: 'vastus-lateralis',
      label: 'Vastus lateralis',
      description: 'The outer quadriceps muscle that provides powerful knee extension.',
      cue: 'Track the knees over the toes and maintain even pressure through the feet.',
      highlightAreas: [{ cx: 34, cy: 114, rx: 5, ry: 21 }, { cx: 66, cy: 114, rx: 5, ry: 21 }],
      exercises: exercises('goblet-squat', 'narrow-leg-press', 'hack-squat'),
    },
    {
      id: 'vastus-medialis',
      label: 'Vastus medialis',
      description: 'The teardrop-shaped inner quadriceps muscle that supports knee control.',
      cue: 'Own the final degrees of knee extension without snapping the joint locked.',
      highlightAreas: [{ cx: 44, cy: 130, rx: 4, ry: 8 }, { cx: 56, cy: 130, rx: 4, ry: 8 }],
      exercises: exercises('step-down', 'heel-elevated-squat', 'terminal-knee-extension'),
    },
  ],
  'upper-back': [
    {
      id: 'trapezius',
      label: 'Trapezius',
      description: 'A broad upper-back muscle that elevates, retracts, and rotates the shoulder blades.',
      cue: 'Move the shoulder blades deliberately without jutting the head forward.',
      highlightAreas: [{ cx: 50, cy: 41, rx: 12, ry: 18 }],
      exercises: exercises('face-pull', 'farmer-carry', 'dumbbell-shrug'),
    },
    {
      id: 'rhomboids',
      label: 'Rhomboids',
      description: 'Deep muscles between the shoulder blades that draw them toward the spine.',
      cue: 'Pause with the shoulder blades gently together while keeping the neck relaxed.',
      highlightAreas: [{ cx: 46, cy: 48, rx: 3.5, ry: 8 }, { cx: 54, cy: 48, rx: 3.5, ry: 8 }],
      exercises: exercises('chest-supported-row', 'seated-cable-row', 'band-pull-apart'),
    },
    {
      id: 'posterior-deltoid',
      label: 'Posterior deltoid',
      description: 'The rear shoulder fibers that pull the upper arm backward and outward.',
      cue: 'Lead with the elbows and keep the shoulder blades from over-squeezing.',
      highlightAreas: [{ cx: 28, cy: 41, rx: 6, ry: 7 }, { cx: 72, cy: 41, rx: 6, ry: 7 }],
      exercises: exercises('reverse-fly', 'face-pull', 'rear-delt-row'),
    },
  ],
  lats: [
    {
      id: 'latissimus-dorsi',
      label: 'Latissimus dorsi',
      description: 'The broad back muscle that pulls the upper arm down and toward the torso.',
      cue: 'Drive the elbows toward your pockets without arching the low back.',
      highlightAreas: [{ cx: 37, cy: 66, rx: 8, ry: 19 }, { cx: 63, cy: 66, rx: 8, ry: 19 }],
      exercises: exercises('lat-pulldown', 'pull-up', 'one-arm-row'),
    },
    {
      id: 'teres-major',
      label: 'Teres major',
      description: 'A smaller upper-back muscle that assists shoulder extension and inward rotation.',
      cue: 'Keep the shoulder down and sweep the upper arm toward the side of the ribs.',
      highlightAreas: [{ cx: 34, cy: 49, rx: 6, ry: 5 }, { cx: 66, cy: 49, rx: 6, ry: 5 }],
      exercises: exercises('straight-arm-pulldown', 'neutral-pulldown', 'dumbbell-pullover'),
    },
  ],
  triceps: [
    {
      id: 'triceps-long-head',
      label: 'Triceps long head',
      description: 'The largest triceps head, crossing both the shoulder and elbow joints.',
      cue: 'Keep the upper arms long and stable while reaching a full overhead stretch.',
      highlightAreas: [{ cx: 28, cy: 57, rx: 3.5, ry: 12 }, { cx: 72, cy: 57, rx: 3.5, ry: 12 }],
      exercises: exercises('overhead-extension', 'skull-crusher', 'incline-cable-extension'),
    },
    {
      id: 'triceps-lateral-head',
      label: 'Triceps lateral head',
      description: 'The outer triceps head that contributes strongly to elbow lockout.',
      cue: 'Pin the elbows near the ribs and finish each rep without rolling the shoulders.',
      highlightAreas: [{ cx: 24, cy: 59, rx: 3.5, ry: 10 }, { cx: 76, cy: 59, rx: 3.5, ry: 10 }],
      exercises: exercises('cable-pushdown', 'close-grip-push-up', 'close-grip-bench'),
    },
    {
      id: 'triceps-medial-head',
      label: 'Triceps medial head',
      description: 'A deep triceps head active through all forms of elbow extension.',
      cue: 'Use a controlled squeeze at lockout and keep the wrist stacked.',
      highlightAreas: [{ cx: 29, cy: 67, rx: 3, ry: 7 }, { cx: 71, cy: 67, rx: 3, ry: 7 }],
      exercises: exercises('reverse-grip-pushdown', 'diamond-push-up', 'single-arm-pushdown'),
    },
  ],
  'lower-back': [
    {
      id: 'erector-spinae',
      label: 'Erector spinae',
      description: 'Long columns beside the spine that extend and stabilize the trunk.',
      cue: 'Brace first, hinge at the hips, and finish tall without leaning backward.',
      highlightAreas: [{ cx: 46, cy: 82, rx: 3, ry: 14 }, { cx: 54, cy: 82, rx: 3, ry: 14 }],
      exercises: exercises('back-extension', 'good-morning', 'romanian-deadlift'),
    },
    {
      id: 'multifidus',
      label: 'Multifidus',
      description: 'Small deep spinal muscles that provide segment-by-segment stability.',
      cue: 'Move slowly while keeping the pelvis level and the spine quiet.',
      highlightAreas: [{ cx: 48, cy: 84, rx: 2, ry: 10 }, { cx: 52, cy: 84, rx: 2, ry: 10 }],
      exercises: exercises('bird-dog', 'dead-bug', 'pallof-press'),
    },
    {
      id: 'quadratus-lumborum',
      label: 'Quadratus lumborum',
      description: 'A deep side-wall back muscle that stabilizes the pelvis and side-bends the trunk.',
      cue: 'Stay tall and resist letting one side of the pelvis hike or collapse.',
      highlightAreas: [{ cx: 40, cy: 83, rx: 4, ry: 8 }, { cx: 60, cy: 83, rx: 4, ry: 8 }],
      exercises: exercises('suitcase-carry', 'side-plank', 'hip-hike'),
    },
  ],
  glutes: [
    {
      id: 'gluteus-maximus',
      label: 'Gluteus maximus',
      description: 'The largest gluteal muscle and primary driver of powerful hip extension.',
      cue: 'Finish through the hips while keeping the ribs down and pelvis neutral.',
      highlightAreas: [{ cx: 41, cy: 100, rx: 10, ry: 12 }, { cx: 59, cy: 100, rx: 10, ry: 12 }],
      exercises: exercises('hip-thrust', 'step-up', 'romanian-deadlift'),
    },
    {
      id: 'gluteus-medius',
      label: 'Gluteus medius',
      description: 'The upper-side glute that abducts the hip and keeps the pelvis level.',
      cue: 'Keep the pelvis stacked and move the thigh without rolling backward.',
      highlightAreas: [{ cx: 38, cy: 91, rx: 7, ry: 6 }, { cx: 62, cy: 91, rx: 7, ry: 6 }],
      exercises: exercises('band-abduction', 'lateral-step-up', 'clamshell'),
    },
    {
      id: 'gluteus-minimus',
      label: 'Gluteus minimus',
      description: 'The deepest gluteal muscle, assisting hip abduction and joint stability.',
      cue: 'Use a small controlled range and keep the standing hip centered.',
      highlightAreas: [{ cx: 40, cy: 94, rx: 4, ry: 4 }, { cx: 60, cy: 94, rx: 4, ry: 4 }],
      exercises: exercises('side-lying-abduction', 'balance-reach', 'monster-walk'),
    },
  ],
  hamstrings: [
    {
      id: 'biceps-femoris',
      label: 'Biceps femoris',
      description: 'The outer hamstring that bends the knee and extends the hip.',
      cue: 'Keep the hips square and feel tension along the outer back of the thigh.',
      highlightAreas: [{ cx: 35, cy: 122, rx: 5, ry: 18 }, { cx: 65, cy: 122, rx: 5, ry: 18 }],
      exercises: exercises('leg-curl', 'romanian-deadlift', 'nordic-curl'),
    },
    {
      id: 'semitendinosus',
      label: 'Semitendinosus',
      description: 'A medial superficial hamstring important for knee flexion and hip extension.',
      cue: 'Keep the knee tracking straight and control the final portion of the curl.',
      highlightAreas: [{ cx: 43, cy: 122, rx: 4, ry: 18 }, { cx: 57, cy: 122, rx: 4, ry: 18 }],
      exercises: exercises('seated-leg-curl', 'single-leg-hinge', 'glute-ham-raise'),
    },
    {
      id: 'semimembranosus',
      label: 'Semimembranosus',
      description: 'A deeper medial hamstring that supports hip extension and knee stability.',
      cue: 'Use a smooth tempo and avoid twisting the foot or pelvis to finish the rep.',
      highlightAreas: [{ cx: 47, cy: 123, rx: 3, ry: 16 }, { cx: 53, cy: 123, rx: 3, ry: 16 }],
      exercises: exercises('lying-leg-curl', 'good-morning', 'slider-curl'),
    },
  ],
  calves: [
    {
      id: 'gastrocnemius',
      label: 'Gastrocnemius',
      description: 'The visible two-headed calf muscle, strongest when the knee is straight.',
      cue: 'Rise through the big toe, pause at the top, and lower through full control.',
      highlightAreas: [{ cx: 37, cy: 145, rx: 6, ry: 14 }, { cx: 63, cy: 145, rx: 6, ry: 14 }],
      exercises: exercises('standing-calf-raise', 'single-leg-calf-raise', 'jump-rope'),
    },
    {
      id: 'soleus',
      label: 'Soleus',
      description: 'The deeper calf muscle emphasized when the knee remains bent.',
      cue: 'Keep the knee softly bent and pause without bouncing out of the bottom.',
      highlightAreas: [{ cx: 39, cy: 155, rx: 5, ry: 10 }, { cx: 61, cy: 155, rx: 5, ry: 10 }],
      exercises: exercises('seated-calf-raise', 'bent-knee-calf-raise', 'sled-push'),
    },
  ],
};
