import type { AnatomySex, BodyView } from './muscle-data';
import { ART_VIEWBOX } from './anatomy-art';

export { ART_VIEWBOX };
export type { AnatomySex };

/** Canonical view for each highlight id (which tab it prefers). */
export const MUSCLE_HIGHLIGHT_VIEW: Record<string, BodyView> = {
  'anterior-deltoid': 'front',
  'lateral-deltoid': 'front',
  'pectoralis-major': 'front',
  'pectoralis-minor': 'front',
  'serratus-anterior': 'front',
  'biceps-brachii': 'front',
  'brachialis': 'front',
  'brachioradialis': 'front',
  'rectus-abdominis': 'front',
  'obliques': 'front',
  'transverse-abdominis': 'front',
  'rectus-femoris': 'front',
  'vastus-lateralis': 'front',
  'vastus-medialis': 'front',
  'trapezius': 'back',
  'rhomboids': 'back',
  'posterior-deltoid': 'back',
  'latissimus-dorsi': 'back',
  'teres-major': 'back',
  'triceps-long-head': 'back',
  'triceps-lateral-head': 'back',
  'triceps-medial-head': 'back',
  'erector-spinae': 'back',
  'multifidus': 'back',
  'quadratus-lumborum': 'back',
  'gluteus-maximus': 'back',
  'gluteus-medius': 'back',
  'gluteus-minimus': 'back',
  'biceps-femoris': 'back',
  'semitendinosus': 'back',
  'semimembranosus': 'back',
  'gastrocnemius': 'back',
  'soleus': 'back',
};

/** Collapse body view into the plate family used by highlight assets. */
export function plateViewForBodyView(bodyView: BodyView): 'front' | 'back' | 'side' {
  return bodyView;
}

const NEUTRAL: Record<AnatomySex, Record<'front' | 'back' | 'side', number>> = {
  male: {
    front: require('../../../assets/images/workouts/highlights/neutral-male-front.jpg'),
    back: require('../../../assets/images/workouts/highlights/neutral-male-back.jpg'),
    side: require('../../../assets/images/workouts/highlights/neutral-male-side.jpg'),
  },
  female: {
    front: require('../../../assets/images/workouts/highlights/neutral-female-front.jpg'),
    back: require('../../../assets/images/workouts/highlights/neutral-female-back.jpg'),
    side: require('../../../assets/images/workouts/highlights/neutral-female-side.jpg'),
  },
};

/** Male front plates (legacy flat filenames). */
const MALE_FRONT: Record<string, number> = {
  'anterior-deltoid': require('../../../assets/images/workouts/highlights/anterior-deltoid.jpg'),
  'lateral-deltoid': require('../../../assets/images/workouts/highlights/lateral-deltoid.jpg'),
  'pectoralis-major': require('../../../assets/images/workouts/highlights/pectoralis-major.jpg'),
  'pectoralis-minor': require('../../../assets/images/workouts/highlights/pectoralis-minor.jpg'),
  'serratus-anterior': require('../../../assets/images/workouts/highlights/serratus-anterior.jpg'),
  'biceps-brachii': require('../../../assets/images/workouts/highlights/biceps-brachii.jpg'),
  'brachialis': require('../../../assets/images/workouts/highlights/brachialis.jpg'),
  'brachioradialis': require('../../../assets/images/workouts/highlights/brachioradialis.jpg'),
  'rectus-abdominis': require('../../../assets/images/workouts/highlights/rectus-abdominis.jpg'),
  'obliques': require('../../../assets/images/workouts/highlights/obliques.jpg'),
  'transverse-abdominis': require('../../../assets/images/workouts/highlights/transverse-abdominis.jpg'),
  'rectus-femoris': require('../../../assets/images/workouts/highlights/rectus-femoris.jpg'),
  'vastus-lateralis': require('../../../assets/images/workouts/highlights/vastus-lateralis.jpg'),
  'vastus-medialis': require('../../../assets/images/workouts/highlights/vastus-medialis.jpg'),
};

const MALE_BACK: Record<string, number> = {
  'trapezius': require('../../../assets/images/workouts/highlights/trapezius.jpg'),
  'rhomboids': require('../../../assets/images/workouts/highlights/rhomboids.jpg'),
  'posterior-deltoid': require('../../../assets/images/workouts/highlights/posterior-deltoid.jpg'),
  'latissimus-dorsi': require('../../../assets/images/workouts/highlights/latissimus-dorsi.jpg'),
  'teres-major': require('../../../assets/images/workouts/highlights/teres-major.jpg'),
  'triceps-long-head': require('../../../assets/images/workouts/highlights/triceps-long-head.jpg'),
  'triceps-lateral-head': require('../../../assets/images/workouts/highlights/triceps-lateral-head.jpg'),
  'triceps-medial-head': require('../../../assets/images/workouts/highlights/triceps-medial-head.jpg'),
  'erector-spinae': require('../../../assets/images/workouts/highlights/erector-spinae.jpg'),
  'multifidus': require('../../../assets/images/workouts/highlights/multifidus.jpg'),
  'quadratus-lumborum': require('../../../assets/images/workouts/highlights/quadratus-lumborum.jpg'),
  'gluteus-maximus': require('../../../assets/images/workouts/highlights/gluteus-maximus.jpg'),
  'gluteus-medius': require('../../../assets/images/workouts/highlights/gluteus-medius.jpg'),
  'gluteus-minimus': require('../../../assets/images/workouts/highlights/gluteus-minimus.jpg'),
  'biceps-femoris': require('../../../assets/images/workouts/highlights/biceps-femoris.jpg'),
  'semitendinosus': require('../../../assets/images/workouts/highlights/semitendinosus.jpg'),
  'semimembranosus': require('../../../assets/images/workouts/highlights/semimembranosus.jpg'),
  'gastrocnemius': require('../../../assets/images/workouts/highlights/gastrocnemius.jpg'),
  'soleus': require('../../../assets/images/workouts/highlights/soleus.jpg'),
};

const MALE_SIDE: Record<string, number> = {
  'anterior-deltoid': require('../../../assets/images/workouts/highlights/male-side-anterior-deltoid.jpg'),
  'lateral-deltoid': require('../../../assets/images/workouts/highlights/male-side-lateral-deltoid.jpg'),
  'posterior-deltoid': require('../../../assets/images/workouts/highlights/male-side-posterior-deltoid.jpg'),
  'pectoralis-major': require('../../../assets/images/workouts/highlights/male-side-pectoralis-major.jpg'),
  'pectoralis-minor': require('../../../assets/images/workouts/highlights/male-side-pectoralis-major.jpg'),
  'serratus-anterior': require('../../../assets/images/workouts/highlights/male-side-serratus-anterior.jpg'),
  'biceps-brachii': require('../../../assets/images/workouts/highlights/male-side-biceps-brachii.jpg'),
  'brachialis': require('../../../assets/images/workouts/highlights/male-side-brachialis.jpg'),
  'brachioradialis': require('../../../assets/images/workouts/highlights/male-side-brachioradialis.jpg'),
  'gluteus-maximus': require('../../../assets/images/workouts/highlights/male-side-gluteus-maximus.jpg'),
  'gluteus-medius': require('../../../assets/images/workouts/highlights/male-side-gluteus-medius.jpg'),
  'gluteus-minimus': require('../../../assets/images/workouts/highlights/male-side-gluteus-minimus.jpg'),
  'biceps-femoris': require('../../../assets/images/workouts/highlights/male-side-biceps-femoris.jpg'),
  'rectus-femoris': require('../../../assets/images/workouts/highlights/male-side-rectus-femoris.jpg'),
  'vastus-lateralis': require('../../../assets/images/workouts/highlights/male-side-vastus-lateralis.jpg'),
  'vastus-medialis': require('../../../assets/images/workouts/highlights/male-side-vastus-medialis.jpg'),
};

const FEMALE_FRONT: Record<string, number> = {
  'pectoralis-major': require('../../../assets/images/workouts/highlights/female-front-pectoralis-major.jpg'),
  'pectoralis-minor': require('../../../assets/images/workouts/highlights/female-front-pectoralis-minor.jpg'),
  'serratus-anterior': require('../../../assets/images/workouts/highlights/female-front-serratus-anterior.jpg'),
  'biceps-brachii': require('../../../assets/images/workouts/highlights/female-front-biceps-brachii.jpg'),
  'brachialis': require('../../../assets/images/workouts/highlights/female-front-brachialis.jpg'),
  'brachioradialis': require('../../../assets/images/workouts/highlights/female-front-brachioradialis.jpg'),
  'anterior-deltoid': require('../../../assets/images/workouts/highlights/female-front-anterior-deltoid.jpg'),
  'lateral-deltoid': require('../../../assets/images/workouts/highlights/female-front-lateral-deltoid.jpg'),
  'rectus-abdominis': require('../../../assets/images/workouts/highlights/female-front-rectus-abdominis.jpg'),
  'obliques': require('../../../assets/images/workouts/highlights/female-front-obliques.jpg'),
  'transverse-abdominis': require('../../../assets/images/workouts/highlights/female-front-transverse-abdominis.jpg'),
  'rectus-femoris': require('../../../assets/images/workouts/highlights/female-front-rectus-femoris.jpg'),
  'vastus-lateralis': require('../../../assets/images/workouts/highlights/female-front-vastus-lateralis.jpg'),
  'vastus-medialis': require('../../../assets/images/workouts/highlights/female-front-vastus-medialis.jpg'),
};

const FEMALE_BACK: Record<string, number> = {
  'trapezius': require('../../../assets/images/workouts/highlights/female-back-trapezius.jpg'),
  'rhomboids': require('../../../assets/images/workouts/highlights/female-back-rhomboids.jpg'),
  'posterior-deltoid': require('../../../assets/images/workouts/highlights/female-back-posterior-deltoid.jpg'),
  'latissimus-dorsi': require('../../../assets/images/workouts/highlights/female-back-latissimus-dorsi.jpg'),
  'teres-major': require('../../../assets/images/workouts/highlights/female-back-teres-major.jpg'),
  'triceps-long-head': require('../../../assets/images/workouts/highlights/female-back-triceps-long-head.jpg'),
  'triceps-lateral-head': require('../../../assets/images/workouts/highlights/female-back-triceps-lateral-head.jpg'),
  'triceps-medial-head': require('../../../assets/images/workouts/highlights/female-back-triceps-medial-head.jpg'),
  'erector-spinae': require('../../../assets/images/workouts/highlights/female-back-erector-spinae.jpg'),
  'multifidus': require('../../../assets/images/workouts/highlights/female-back-multifidus.jpg'),
  'quadratus-lumborum': require('../../../assets/images/workouts/highlights/female-back-quadratus-lumborum.jpg'),
  'gluteus-maximus': require('../../../assets/images/workouts/highlights/female-back-gluteus-maximus.jpg'),
  'gluteus-medius': require('../../../assets/images/workouts/highlights/female-back-gluteus-medius.jpg'),
  'gluteus-minimus': require('../../../assets/images/workouts/highlights/female-back-gluteus-minimus.jpg'),
  'biceps-femoris': require('../../../assets/images/workouts/highlights/female-back-biceps-femoris.jpg'),
  'semitendinosus': require('../../../assets/images/workouts/highlights/female-back-semitendinosus.jpg'),
  'semimembranosus': require('../../../assets/images/workouts/highlights/female-back-semimembranosus.jpg'),
  'gastrocnemius': require('../../../assets/images/workouts/highlights/female-back-gastrocnemius.jpg'),
  'soleus': require('../../../assets/images/workouts/highlights/female-back-soleus.jpg'),
};

const FEMALE_SIDE: Record<string, number> = {
  'anterior-deltoid': require('../../../assets/images/workouts/highlights/female-side-anterior-deltoid.jpg'),
  'lateral-deltoid': require('../../../assets/images/workouts/highlights/female-side-lateral-deltoid.jpg'),
  'pectoralis-major': require('../../../assets/images/workouts/highlights/female-side-pectoralis-major.jpg'),
  'pectoralis-minor': require('../../../assets/images/workouts/highlights/female-side-pectoralis-minor.jpg'),
  'serratus-anterior': require('../../../assets/images/workouts/highlights/female-side-serratus-anterior.jpg'),
  'biceps-brachii': require('../../../assets/images/workouts/highlights/female-side-biceps-brachii.jpg'),
  'brachialis': require('../../../assets/images/workouts/highlights/female-side-brachialis.jpg'),
  'brachioradialis': require('../../../assets/images/workouts/highlights/female-side-brachioradialis.jpg'),
  'gluteus-maximus': require('../../../assets/images/workouts/highlights/female-side-gluteus-maximus.jpg'),
  'gluteus-medius': require('../../../assets/images/workouts/highlights/female-side-gluteus-medius.jpg'),
  'gluteus-minimus': require('../../../assets/images/workouts/highlights/female-side-gluteus-minimus.jpg'),
  'biceps-femoris': require('../../../assets/images/workouts/highlights/female-side-biceps-femoris.jpg'),
  'rectus-femoris': require('../../../assets/images/workouts/highlights/female-side-rectus-femoris.jpg'),
  'vastus-lateralis': require('../../../assets/images/workouts/highlights/female-side-vastus-lateralis.jpg'),
  'vastus-medialis': require('../../../assets/images/workouts/highlights/female-side-vastus-medialis.jpg'),
};

/** Flat male-front map kept for tests / legacy callers. */
export const MUSCLE_HIGHLIGHT_IMAGES: Record<string, number> = {
  ...MALE_FRONT,
  ...MALE_BACK,
};

function catalogFor(sex: AnatomySex, view: 'front' | 'back' | 'side'): Record<string, number> {
  if (sex === 'female') {
    if (view === 'front') return FEMALE_FRONT;
    if (view === 'back') return FEMALE_BACK;
    return FEMALE_SIDE;
  }
  if (view === 'front') return MALE_FRONT;
  if (view === 'back') return MALE_BACK;
  return MALE_SIDE;
}

/** Resolve finished-art plate for sex + view + muscle (falls back to neutral). */
export function highlightImageForMuscle(
  muscleId: string | undefined,
  bodyView: BodyView,
  sex: AnatomySex = 'male',
): number {
  const view = plateViewForBodyView(bodyView);
  if (muscleId) {
    const exact = catalogFor(sex, view)[muscleId];
    if (exact != null) return exact;
    // Prefer male plate for same view if female/side frame is missing.
    if (sex === 'female') {
      const maleFallback = catalogFor('male', view)[muscleId];
      if (maleFallback != null) return maleFallback;
    }
    if (view === 'side') {
      const frontFallback = catalogFor(sex, 'front')[muscleId] ?? catalogFor('male', 'front')[muscleId];
      if (frontFallback != null) return frontFallback;
      const backFallback = catalogFor(sex, 'back')[muscleId] ?? catalogFor('male', 'back')[muscleId];
      if (backFallback != null) return backFallback;
    }
  }
  return NEUTRAL[sex][view];
}

export function hasHighlightImage(muscleId: string | undefined): boolean {
  return muscleId != null && MUSCLE_HIGHLIGHT_IMAGES[muscleId] != null;
}
