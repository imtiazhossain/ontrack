export type HealthRange = 7 | 30 | 90;

export interface DailyHealthSummary {
  dateKey: string;
  steps?: number;
  activeEnergyKcal?: number;
  exerciseMinutes?: number;
  heartRateAverageBpm?: number;
  heartRateMinBpm?: number;
  heartRateMaxBpm?: number;
  restingHeartRateBpm?: number;
  sleepMinutes?: number;
}

export interface HealthWorkoutSummary {
  id: string;
  activityName: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  activeEnergyKcal?: number;
}

export interface HealthImport {
  daily: DailyHealthSummary[];
  workouts: HealthWorkoutSummary[];
}

export type MoodFactorCategory =
  | 'person'
  | 'place'
  | 'activity'
  | 'situation'
  | 'thought'
  | 'body'
  | 'custom';

export interface EmotionDefinition {
  id: string;
  name: string;
  valence: -2 | -1 | 0 | 1 | 2;
  appleLabel?: string;
  builtIn?: boolean;
}

export interface MoodEmotionRating {
  emotionId: string;
  intensity: 1 | 2 | 3 | 4 | 5;
}

export interface MoodFactor {
  id: string;
  name: string;
  category: MoodFactorCategory;
  emotionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MoodEntry {
  id: string;
  occurredAt: string;
  emotions: MoodEmotionRating[];
  factorIds: string[];
  note?: string;
  source: 'ontrack' | 'apple-health';
  linkedPlaybookRunId?: string;
  appleHealth?: {
    uuid: string;
    kind: 'momentary' | 'daily';
    valence: number;
    ownedByOnTrack: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MoodPlaybook {
  id: string;
  name: string;
  sourceEmotionIds: string[];
  targetEmotionIds: string[];
  steps: string[];
  durationMinutes?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MoodPlaybookRun {
  id: string;
  playbookId: string;
  initialEntryId?: string;
  followUpEntryId?: string;
  startedAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface AppleStateOfMindInput {
  entryId: string;
  date: string;
  kind: 'momentary' | 'daily';
  valence: number;
  labels: string[];
  associations: string[];
}

export interface AppleStateOfMindSample {
  uuid: string;
  entryId?: string;
  date: string;
  kind: 'momentary' | 'daily';
  valence: number;
  labels: string[];
  associations: string[];
  ownedByOnTrack: boolean;
}
