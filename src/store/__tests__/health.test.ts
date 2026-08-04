import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { useHealth } from '@/store/health';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(async () => 'test-health-encryption-key'),
  setItemAsync: jest.fn(async () => undefined),
}));

describe('health store', () => {
  beforeEach(() => {
    useHealth.getState().reset();
  });

  it('creates, edits, and removes factors without deleting linked check-ins', () => {
    const factorId = useHealth.getState().saveFactor({
      name: 'A walk outside',
      category: 'activity',
      emotionIds: ['calm'],
    });
    const entryId = useHealth.getState().saveMoodEntry({
      occurredAt: '2026-08-04T12:00:00.000Z',
      emotions: [{ emotionId: 'calm', intensity: 4 }],
      factorIds: [factorId],
      source: 'ontrack',
    });

    useHealth.getState().saveFactor({
      id: factorId,
      name: 'A quiet walk',
      category: 'activity',
      emotionIds: ['calm', 'hopeful'],
    });
    expect(useHealth.getState().factors.find((factor) => factor.id === factorId)?.name).toBe('A quiet walk');

    useHealth.getState().removeFactor(factorId);
    expect(useHealth.getState().factors).toHaveLength(0);
    expect(useHealth.getState().moodEntries.find((entry) => entry.id === entryId)?.factorIds).toEqual([]);
  });

  it('links a completed playbook to an optional follow-up and cleans up on delete', () => {
    const beforeId = useHealth.getState().saveMoodEntry({
      occurredAt: '2026-08-04T12:00:00.000Z',
      emotions: [{ emotionId: 'sad', intensity: 5 }],
      factorIds: [],
      source: 'ontrack',
    });
    const playbookId = useHealth.getState().savePlaybook({
      name: 'Gentle reset',
      sourceEmotionIds: ['sad'],
      targetEmotionIds: ['calm'],
      steps: ['Drink water', 'Walk for ten minutes'],
      durationMinutes: 10,
      enabled: true,
    });
    const runId = useHealth.getState().startPlaybook(playbookId, beforeId);
    useHealth.getState().completePlaybook(runId);
    const afterId = useHealth.getState().saveMoodEntry({
      occurredAt: '2026-08-04T12:15:00.000Z',
      emotions: [{ emotionId: 'sad', intensity: 2 }],
      factorIds: [],
      source: 'ontrack',
      linkedPlaybookRunId: runId,
    });
    useHealth.getState().linkFollowUp(runId, afterId);

    expect(useHealth.getState().playbookRuns.find((run) => run.id === runId)).toMatchObject({
      status: 'completed',
      initialEntryId: beforeId,
      followUpEntryId: afterId,
    });

    useHealth.getState().removePlaybook(playbookId);
    expect(useHealth.getState().playbooks).toHaveLength(0);
    expect(useHealth.getState().playbookRuns).toHaveLength(0);
  });

  it('resets all sensitive records while restoring built-in emotions', () => {
    useHealth.getState().addCustomEmotion('Restless');
    useHealth.getState().saveFactor({ name: 'Work', category: 'situation', emotionIds: ['stressed'] });
    useHealth.getState().reset();

    expect(useHealth.getState().factors).toEqual([]);
    expect(useHealth.getState().moodEntries).toEqual([]);
    expect(useHealth.getState().emotions.some((emotion) => emotion.id === 'happy')).toBe(true);
    expect(useHealth.getState().emotions.some((emotion) => emotion.name === 'Restless')).toBe(false);
  });
});
