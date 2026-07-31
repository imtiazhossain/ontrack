import type { SoilRecommendation } from '@/types/models';

/** Conservative fallback when older care plans lack soil guidance. */
export function defaultSoilRecommendation(): SoilRecommendation {
  return {
    soilType: 'Well-draining indoor potting mix',
    phMin: 6,
    phMax: 7,
    mixNotes: 'Use a quality indoor potting mix with added perlite or bark for aeration.',
    drainageNotes: 'Ensure the pot has drainage holes and empty saucers after watering.',
    amendments: ['Perlite', 'Orchid bark'],
  };
}
