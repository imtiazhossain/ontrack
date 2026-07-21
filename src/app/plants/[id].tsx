import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, Input, Screen, SectionHeader } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import {
  addPruningActivity,
  deletePlant,
  logPlantWatering,
  undoPlantWatering,
} from '@/services/plants/schedule';
import { usePlants } from '@/store/plants';
import { formatDateLong, formatMinutes, toDateKey, todayKey } from '@/utils/date';

export default function PlantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const plant = usePlants((state) => state.plants.find((item) => item.id === id));
  const [amount, setAmount] = useState('');

  if (!plant) {
    return <Screen><BackButton /><AppText variant="title">Plant not found</AppText></Screen>;
  }

  const dueKey = toDateKey(new Date(plant.nextWateringAt));
  const due = dueKey < todayKey() ? `Overdue since ${formatDateLong(dueKey)}` : dueKey === todayKey() ? 'Due today' : `Due ${formatDateLong(dueKey)}`;
  const latestLog = plant.wateringLogs.at(-1);

  const remove = () => Alert.alert('Delete plant', `Remove ${plant.nickname}, its care tasks, and locally saved photos?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => void deletePlant(plant.id).then(() => router.replace('/(tabs)/plants')) },
  ]);

  return (
    <Screen contentStyle={styles.content}>
      <BackButton />
      <Image source={plant.photoUri} style={styles.hero} contentFit="cover" />
      <View style={styles.titleRow}>
        <View style={styles.flex}>
          <AppText variant="title">{plant.nickname}</AppText>
          <AppText variant="callout" color="secondary">{plant.identity.commonName}</AppText>
          <AppText variant="caption" color="tertiary" style={styles.italic}>{plant.identity.scientificName}</AppText>
        </View>
        <Button variant="secondary" onPress={() => router.push({ pathname: '/plants/[id]/edit', params: { id: plant.id } })}>Edit</Button>
      </View>

      <Card style={styles.careCard}>
        <AppText variant="overline" color="tertiary">Next soil check</AppText>
        <AppText variant="heading" color={dueKey <= todayKey() ? 'accent' : 'primary'}>{due}</AppText>
        <AppText color="secondary">At {formatMinutes(plant.reminderMinutes)} · {plant.carePlan.watering.soilCheck}</AppText>
        <AppText variant="callout">Start with {Math.round(plant.carePlan.watering.minMl)}–{Math.round(plant.carePlan.watering.maxMl)} mL only when the soil check says it is needed.</AppText>
        <Input label="Amount used (mL, optional)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <Button onPress={() => {
          const parsed = Number(amount);
          void logPlantWatering(plant.id, amount.trim() && Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined);
        }}>Log watering now</Button>
        {latestLog?.activityId ? <Button variant="ghost" onPress={() => void undoPlantWatering(latestLog.activityId!)}>Undo last watering</Button> : null}
      </Card>

      <SectionHeader title="Health" detail={`${Math.round(plant.health.confidence * 100)}% assessment confidence`} />
      <Card style={styles.careCard}>
        <AppText variant="heading" color={plant.health.status === 'healthy' ? 'success' : plant.health.status === 'urgent' ? 'danger' : 'primary'}>
          {plant.health.status === 'healthy' ? 'Looking healthy' : plant.health.status === 'urgent' ? 'Needs prompt attention' : 'Keep watching'}
        </AppText>
        <AppText>{plant.health.summary}</AppText>
        {plant.health.visibleSigns.map((item) => <AppText key={item} color="secondary">Observed: {item}</AppText>)}
        {plant.health.possibleCauses.map((item) => <AppText key={item} variant="caption" color="tertiary">Possible, not diagnosed: {item}</AppText>)}
        <Button variant="secondary" onPress={() => router.push({ pathname: '/plants/[id]/check-in', params: { id: plant.id } })} icon="camera.fill">Add health check-in</Button>
      </Card>

      <SectionHeader title="Placement" />
      <Card style={styles.careCard}>
        <AppText variant="heading">{plant.carePlan.placement.location}</AppText>
        <AppText color="secondary">{plant.carePlan.placement.windowDistance}</AppText>
        <AppText>{plant.carePlan.placement.light}</AppText>
        {plant.carePlan.placement.avoid.map((item) => <AppText key={item} variant="caption" color="secondary">Avoid: {item}</AppText>)}
      </Card>

      <SectionHeader title="Pruning" detail={plant.carePlan.pruning.urgency.replace('-', ' ')} />
      <Card style={styles.careCard}>
        <AppText>{plant.carePlan.pruning.reason}</AppText>
        {plant.carePlan.pruning.steps.map((item) => <AppText key={item} color="secondary">• {item}</AppText>)}
        {plant.carePlan.pruning.urgency !== 'not-needed' ? <Button variant="secondary" onPress={() => { addPruningActivity(plant.id); Alert.alert('Added to Today', `Prune ${plant.nickname} is now on your schedule.`); }}>Add pruning task</Button> : null}
      </Card>

      <SectionHeader title="History" detail={`${plant.wateringLogs.length} waterings · ${plant.checkIns.length} check-ins`} />
      {plant.checkIns.slice().reverse().map((checkIn) => (
        <Card key={checkIn.id} style={styles.historyRow}>
          <Image source={checkIn.photoUri} style={styles.historyPhoto} contentFit="cover" />
          <View style={styles.flex}><AppText variant="callout">{new Date(checkIn.createdAt).toLocaleDateString()}</AppText><AppText variant="caption" color="secondary">{checkIn.assessment.summary}</AppText></View>
        </Card>
      ))}
      {plant.wateringLogs.slice().reverse().slice(0, 5).map((log) => <AppText key={log.id} variant="caption" color="secondary">Watered {new Date(log.wateredAt).toLocaleString()}{log.amountMl ? ` · ${log.amountMl} mL` : ''}</AppText>)}

      <SectionHeader title="Care sources" />
      {plant.carePlan.sources.map((source) => <AppText key={source.url} color="accent" onPress={() => Linking.openURL(source.url)}>{source.title}</AppText>)}
      <AppText variant="caption" color="tertiary">{plant.carePlan.disclaimer}</AppText>
      <Button variant="danger" onPress={remove}>Delete plant</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  italic: { fontStyle: 'italic' },
  careCard: { gap: spacing.sm },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  historyPhoto: { width: 64, height: 64, borderRadius: radii.sm },
});
