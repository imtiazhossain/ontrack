import { DEFAULT_EMOTIONS } from './defaults';
import type {
  DailyHealthSummary,
  EmotionDefinition,
  MoodEntry,
  MoodPlaybook,
  MoodPlaybookRun,
} from './types';

export function healthSummaryForDate(
  summaries: readonly DailyHealthSummary[],
  dateKey: string,
): DailyHealthSummary | undefined {
  return summaries.find((summary) => summary.dateKey === dateKey);
}

export function averageMetric(
  summaries: readonly DailyHealthSummary[],
  key: keyof Omit<DailyHealthSummary, 'dateKey'>,
): number | undefined {
  const values = summaries
    .map((summary) => summary[key])
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!values.length) return undefined;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function emotionName(
  emotionId: string,
  emotions: readonly EmotionDefinition[] = DEFAULT_EMOTIONS,
): string {
  return emotions.find((emotion) => emotion.id === emotionId)?.name ?? emotionId;
}

export function moodEntrySummary(
  entry: MoodEntry,
  emotions: readonly EmotionDefinition[],
): string {
  return entry.emotions
    .map((rating) => `${emotionName(rating.emotionId, emotions)} ${rating.intensity}/5`)
    .join(' · ');
}

export function playbookOutcomeSummary(input: {
  playbook: MoodPlaybook;
  runs: readonly MoodPlaybookRun[];
  entries: readonly MoodEntry[];
  emotions: readonly EmotionDefinition[];
}): string | undefined {
  const sourceId = input.playbook.sourceEmotionIds[0];
  if (!sourceId) return undefined;
  let improved = 0;
  let compared = 0;
  for (const run of input.runs) {
    if (run.playbookId !== input.playbook.id || !run.initialEntryId || !run.followUpEntryId) continue;
    const before = input.entries.find((entry) => entry.id === run.initialEntryId);
    const after = input.entries.find((entry) => entry.id === run.followUpEntryId);
    const beforeRating = before?.emotions.find((rating) => rating.emotionId === sourceId)?.intensity;
    const afterRating = after?.emotions.find((rating) => rating.emotionId === sourceId)?.intensity;
    if (beforeRating === undefined || afterRating === undefined) continue;
    compared += 1;
    if (afterRating < beforeRating) improved += 1;
  }
  if (!compared) return undefined;
  return `This action was followed by lower ${emotionName(sourceId, input.emotions).toLowerCase()} in ${improved} of ${compared} check-ins.`;
}

export function mergeAppleMoodEntries(
  local: readonly MoodEntry[],
  imported: readonly MoodEntry[],
): MoodEntry[] {
  const localAppleIds = new Set(local.map((entry) => entry.appleHealth?.uuid).filter(Boolean));
  const localEntryIds = new Set(local.map((entry) => entry.id));
  return [
    ...local,
    ...imported.filter(
      (entry) =>
        !localEntryIds.has(entry.id) &&
        (!entry.appleHealth?.uuid || !localAppleIds.has(entry.appleHealth.uuid)),
    ),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));
}
