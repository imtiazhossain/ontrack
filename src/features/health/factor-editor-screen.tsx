import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { appPrompt, AppText, Button, Input, Screen, SegmentedControl, SectionHeader } from '@/components/primitives';
import { spacing } from '@/design-system';
import type { MoodFactorCategory } from '@/features/health/types';
import { useHealth } from '@/store/health';
import { AgentUiIds } from '@/utils/agent-ui';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

const CATEGORIES: { value: MoodFactorCategory; label: string }[] = [
  { value: 'person', label: 'Person' }, { value: 'place', label: 'Place' },
  { value: 'activity', label: 'Activity' }, { value: 'situation', label: 'Situation' },
  { value: 'thought', label: 'Thought' }, { value: 'body', label: 'Body' },
  { value: 'custom', label: 'Other' },
];

export function FactorEditorScreen() {
  const router = useRouter();
  const { factorId } = useLocalSearchParams<{ factorId?: string }>();
  const emotions = useHealth((state) => state.emotions);
  const factor = useHealth((state) => state.factors.find((item) => item.id === factorId));
  const saveFactor = useHealth((state) => state.saveFactor);
  const removeFactor = useHealth((state) => state.removeFactor);
  const [name, setName] = useState(factor?.name ?? '');
  const [category, setCategory] = useState<MoodFactorCategory>(factor?.category ?? 'activity');
  const [emotionIds, setEmotionIds] = useState<string[]>(factor?.emotionIds ?? []);

  const save = () => {
    if (!name.trim()) { appPrompt.alert('Name what affects you', 'Add a short name such as “Music,” “Work deadlines,” or “Time with Sam.”'); return; }
    saveFactor({ id: factor?.id, name, category, emotionIds });
    router.back();
  };

  return (
    <Screen refresh={false} contentStyle={styles.screen}>
      <AppText variant="title">{factor ? 'Edit What Affects Me' : 'Something That Affects Me'}</AppText>
      <AppText color="secondary">Connect a person, place, activity, situation, thought, or body state to the feelings it often brings up.</AppText>
      <Input label="Name" value={name} onChangeText={setName} placeholder="Music, traffic, a friend…" accessibilityLabel="Mood factor name" testID={AgentUiIds.health.factorName} />
      <SegmentedControl label="Type" value={category} options={CATEGORIES.map((option) => ({ ...option, testID: AgentUiIds.health.factorCategory(option.value) }))} onChange={setCategory} wrap />
      <SectionHeader title="Often connected to" />
      <View style={styles.chips}>{emotions.map((emotion) => {
        const active = emotionIds.includes(emotion.id);
        return <Button key={emotion.id} size="sm" variant={active ? 'primary' : 'secondary'} testID={AgentUiIds.health.factorEmotion(emotion.id)} onPress={() => setEmotionIds((current) => active ? current.filter((id) => id !== emotion.id) : [...current, emotion.id])} accessibilityLabel={`${active ? 'Remove' : 'Add'} ${emotion.name}`}>{emotion.name}</Button>;
      })}</View>
      <Button size="lg" testID={AgentUiIds.health.saveFactor} onPress={save} accessibilityLabel="Save mood factor">Save</Button>
      {factor ? (
        <Button
          variant="danger"
          testID={AgentUiIds.health.deleteFactor}
          onPress={() => confirmDestructiveAction({
            title: 'Delete this factor?',
            message: 'It will also be removed from existing check-ins. Your check-ins will remain.',
            actionLabel: 'Delete factor',
            onConfirm: () => { removeFactor(factor.id); router.back(); },
          })}
          accessibilityLabel="Delete mood factor">Delete factor</Button>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ screen: { gap: spacing.md }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
