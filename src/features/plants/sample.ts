import type { Plant } from '@/types/models';
import { addDays, todayKey } from '@/utils/date';

export const PLANT_SAMPLE_VERSION = 2;
export const SAMPLE_PLANT_ID = 'plant-sample-monstera';
export const SAMPLE_PLANT_PHOTO_URI = 'sample://plants/monstera';

export function plantImageSource(uri: string) {
  if (uri === SAMPLE_PLANT_PHOTO_URI) {
    return require('../../../assets/images/plants/sample-monstera.jpg');
  }
  return uri;
}

export function isSamplePlant(plant: Pick<Plant, 'id'>) {
  return plant.id === SAMPLE_PLANT_ID;
}

export function createSamplePlant(timestamp = new Date().toISOString()): Plant {
  const nextWateringKey = addDays(todayKey(), 3);
  const nextWateringAt = `${nextWateringKey}T13:00:00.000Z`;
  const lastWateredKey = addDays(todayKey(), -6);
  const lastWateredAt = `${lastWateredKey}T13:00:00.000Z`;

  return {
    id: SAMPLE_PLANT_ID,
    nickname: 'Monstera',
    photoUri: SAMPLE_PLANT_PHOTO_URI,
    identity: {
      commonName: 'Swiss Cheese Plant',
      scientificName: 'Monstera deliciosa',
      confidence: 0.94,
      identificationSource: 'user-confirmed',
    },
    health: {
      status: 'healthy',
      summary: 'Leaves look glossy and firm with healthy fenestrations. Keep watching new growth for droop after watering.',
      visibleSigns: [
        'Deep green split leaves',
        'Firm petioles',
        'No widespread yellowing',
      ],
      possibleCauses: [],
      actions: [
        'Continue the current soil-check watering rhythm',
        'Wipe dust from leaves monthly so light reaches the surface',
        'Rotate the pot a quarter turn each week for even growth',
      ],
      confidence: 0.88,
      assessedAt: timestamp,
    },
    carePlan: {
      watering: {
        minMl: 250,
        maxMl: 400,
        intervalDays: 9,
        soilCheck: 'Water when the top 3–5 cm of mix feel dry.',
        notes: 'Soak thoroughly, then let the pot drain fully before returning it to its saucer.',
      },
      pruning: {
        urgency: 'not-needed',
        reason: 'No damaged or yellowing leaves need removal right now.',
        steps: ['Use clean shears if a leaf yellows fully.', 'Cut the petiole close to the stem.'],
      },
      placement: {
        light: 'Bright, indirect light for most of the day.',
        location: 'Living room, near the east window',
        windowDistance: 'About 1 metre from the glass',
        avoid: ['Direct midday sun on leaves', 'Heating vents', 'Cold drafts'],
      },
      soil: {
        soilType: 'Chunky aroid mix',
        phMin: 5.5,
        phMax: 7.0,
        mixNotes: 'Equal parts potting soil, orchid bark, and perlite keeps Monstera roots oxygenated and resists compaction.',
        drainageNotes: 'Use a pot with drainage holes. Water until runoff appears, then empty the saucer within 15 minutes.',
        amendments: ['Orchid bark', 'Perlite', 'Coco coir'],
      },
      sources: [
        {
          title: 'University of Minnesota Extension — Houseplants',
          url: 'https://extension.umn.edu/houseplants',
        },
        {
          title: 'Royal Horticultural Society — Houseplants',
          url: 'https://www.rhs.org.uk/plants/types/houseplants',
        },
      ],
      disclaimer: 'Sample care plan for exploration. Indoor conditions vary; verify uncertain or worsening issues with a qualified horticulturist.',
      generatedAt: timestamp,
    },
    room: {
      potDiameterCm: 25,
      drainage: 'yes',
      windowDirection: 'east',
      windowDistanceM: 1,
      directSunHours: 2,
    },
    lastWateredAt,
    nextWateringAt,
    reminderMinutes: 9 * 60,
    wateringLogs: [
      {
        id: 'plant-sample-water-1',
        wateredAt: lastWateredAt,
        amountMl: 320,
        priorNextWateringAt: nextWateringAt,
      },
    ],
    checkIns: [
      {
        id: 'plant-sample-checkin-1',
        photoUri: SAMPLE_PLANT_PHOTO_URI,
        createdAt: timestamp,
        assessment: {
          status: 'healthy',
          summary: 'Looking healthy after the latest photo check-in.',
          visibleSigns: ['Glossy fenestrated leaves', 'No soft spots'],
          possibleCauses: [],
          actions: ['Keep the current watering interval', 'Check soil before the next watering day'],
          confidence: 0.88,
          assessedAt: timestamp,
        },
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function ensurePlantSample(
  plants: Plant[],
  sampleVersion: number,
  sampleDismissed = false,
  timestamp = new Date().toISOString(),
): { plants: Plant[]; sampleVersion: number; sampleDismissed: boolean } {
  const hasSample = plants.some((plant) => plant.id === SAMPLE_PLANT_ID);
  if (hasSample) {
    return {
      plants,
      sampleVersion: Math.max(sampleVersion, PLANT_SAMPLE_VERSION),
      sampleDismissed: false,
    };
  }
  if (plants.length > 0 || sampleDismissed) {
    return {
      plants,
      sampleVersion: Math.max(sampleVersion, PLANT_SAMPLE_VERSION),
      sampleDismissed,
    };
  }
  return {
    plants: [createSamplePlant(timestamp)],
    sampleVersion: PLANT_SAMPLE_VERSION,
    sampleDismissed: false,
  };
}
