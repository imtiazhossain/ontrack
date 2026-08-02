import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, ErrorMessage, Input, Screen, SectionHeader, TimeField } from '@/components/primitives';
import { spacing } from '@/design-system';
import { applyPlantCarePlan, wateringDueAt } from '@/services/plants/schedule';
import { usePlants } from '@/store/plants';
import type { PlantCarePlan } from '@/types/models';

function value(input: string) {
  const parsed = Number(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const plant = usePlants((state) => state.plants.find((item) => item.id === id));
  const updatePlant = usePlants((state) => state.updatePlant);
  const [nickname, setNickname] = useState(plant?.nickname ?? '');
  const [minMl, setMinMl] = useState(String(plant?.carePlan.watering.minMl ?? ''));
  const [maxMl, setMaxMl] = useState(String(plant?.carePlan.watering.maxMl ?? ''));
  const [interval, setInterval] = useState(String(plant?.carePlan.watering.intervalDays ?? ''));
  const [soilCheck, setSoilCheck] = useState(plant?.carePlan.watering.soilCheck ?? '');
  const [notes, setNotes] = useState(plant?.carePlan.watering.notes ?? '');
  const [location, setLocation] = useState(plant?.carePlan.placement.location ?? '');
  const [windowDistance, setWindowDistance] = useState(plant?.carePlan.placement.windowDistance ?? '');
  const [light, setLight] = useState(plant?.carePlan.placement.light ?? '');
  const [soilType, setSoilType] = useState(plant?.carePlan.soil.soilType ?? '');
  const [phMin, setPhMin] = useState(String(plant?.carePlan.soil.phMin ?? ''));
  const [phMax, setPhMax] = useState(String(plant?.carePlan.soil.phMax ?? ''));
  const [mixNotes, setMixNotes] = useState(plant?.carePlan.soil.mixNotes ?? '');
  const [drainageNotes, setDrainageNotes] = useState(plant?.carePlan.soil.drainageNotes ?? '');
  const [amendments, setAmendments] = useState((plant?.carePlan.soil.amendments ?? []).join(', '));
  const [reminderMinutes, setReminderMinutes] = useState(plant?.reminderMinutes ?? 9 * 60);
  const [error, setError] = useState<string>();

  if (!plant) return <Screen refresh={false}><AppText variant="title">Plant Not Found</AppText></Screen>;

  const save = async () => {
    if (!nickname.trim() || value(minMl) <= 0 || value(maxMl) < value(minMl) || value(interval) < 1 || reminderMinutes < 0 || reminderMinutes >= 1440) {
      setError('Review the name, watering range, interval, and reminder time.');
      return;
    }
    if (!soilType.trim() || value(phMin) < 3 || value(phMax) > 9 || value(phMax) < value(phMin) || !mixNotes.trim() || !drainageNotes.trim()) {
      setError('Review the soil type, pH range, and mix notes.');
      return;
    }
    const carePlan: PlantCarePlan = {
      ...plant.carePlan,
      watering: { ...plant.carePlan.watering, minMl: value(minMl), maxMl: value(maxMl), intervalDays: value(interval), soilCheck, notes },
      placement: { ...plant.carePlan.placement, location, windowDistance, light },
      soil: {
        soilType: soilType.trim(),
        phMin: value(phMin),
        phMax: value(phMax),
        mixNotes: mixNotes.trim(),
        drainageNotes: drainageNotes.trim(),
        amendments: amendments.split(',').map((item) => item.trim()).filter(Boolean),
      },
    };
    updatePlant(plant.id, {
      nickname: nickname.trim(),
      reminderMinutes,
      nextWateringAt: wateringDueAt(plant.lastWateredAt ?? new Date(), carePlan.watering.intervalDays, reminderMinutes),
    });
    await applyPlantCarePlan(plant.id, carePlan);
    router.back();
  };

  return (
    <Screen contentStyle={styles.content} refresh={false}>
      <AppText variant="title">Edit {plant.nickname}</AppText>
      <Input label="Nickname" value={nickname} onChangeText={setNickname} />
      <SectionHeader title="Watering" />
      <View style={styles.row}>
        <View style={styles.flex}><Input label="Minimum (mL)" keyboardType="decimal-pad" value={minMl} onChangeText={setMinMl} /></View>
        <View style={styles.flex}><Input label="Maximum (mL)" keyboardType="decimal-pad" value={maxMl} onChangeText={setMaxMl} /></View>
      </View>
      <Input label="Check Every (days)" keyboardType="number-pad" value={interval} onChangeText={setInterval} />
      <Input label="Soil Check" value={soilCheck} onChangeText={setSoilCheck} multiline />
      <Input label="Notes" value={notes} onChangeText={setNotes} multiline />
      <TimeField label="Reminder Time" value={reminderMinutes} onChange={setReminderMinutes} />
      <SectionHeader title="Soil" />
      <Input label="Soil Type" value={soilType} onChangeText={setSoilType} />
      <View style={styles.row}>
        <View style={styles.flex}><Input label="pH Min" keyboardType="decimal-pad" value={phMin} onChangeText={setPhMin} /></View>
        <View style={styles.flex}><Input label="pH Max" keyboardType="decimal-pad" value={phMax} onChangeText={setPhMax} /></View>
      </View>
      <Input label="Mix Notes" value={mixNotes} onChangeText={setMixNotes} multiline />
      <Input label="Drainage Notes" value={drainageNotes} onChangeText={setDrainageNotes} multiline />
      <Input label="Amendments (comma separated)" value={amendments} onChangeText={setAmendments} />
      <SectionHeader title="Placement" />
      <Input label="Location" value={location} onChangeText={setLocation} multiline />
      <Input label="Distance Guidance" value={windowDistance} onChangeText={setWindowDistance} />
      <Input label="Light Guidance" value={light} onChangeText={setLight} multiline />
      {error ? <ErrorMessage message={error} /> : null}
      <Button onPress={() => void save()}>Save and Reschedule</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
