import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Input, Screen, SectionHeader } from '@/components/primitives';
import { spacing } from '@/design-system';
import { applyPlantCarePlan, wateringDueAt } from '@/services/plants/schedule';
import { usePlants } from '@/store/plants';
import type { PlantCarePlan } from '@/types/models';

function value(input: string) { const parsed = Number(input); return Number.isFinite(parsed) ? parsed : 0; }

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
  const [reminder, setReminder] = useState(plant ? `${String(Math.floor(plant.reminderMinutes / 60)).padStart(2, '0')}:${String(plant.reminderMinutes % 60).padStart(2, '0')}` : '09:00');
  const [error, setError] = useState<string>();

  if (!plant) return <Screen><BackButton /><AppText variant="title">Plant not found</AppText></Screen>;

  const save = async () => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(reminder);
    const reminderMinutes = match ? Number(match[1]) * 60 + Number(match[2]) : -1;
    if (!nickname.trim() || value(minMl) <= 0 || value(maxMl) < value(minMl) || value(interval) < 1 || reminderMinutes < 0 || reminderMinutes >= 1440) {
      setError('Review the name, watering range, interval, and HH:MM reminder.');
      return;
    }
    const carePlan: PlantCarePlan = {
      ...plant.carePlan,
      watering: { ...plant.carePlan.watering, minMl: value(minMl), maxMl: value(maxMl), intervalDays: value(interval), soilCheck, notes },
      placement: { ...plant.carePlan.placement, location, windowDistance, light },
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
    <Screen contentStyle={styles.content}>
      <BackButton />
      <AppText variant="title">Edit {plant.nickname}</AppText>
      <Input label="Nickname" value={nickname} onChangeText={setNickname} />
      <SectionHeader title="Watering" />
      <View style={styles.row}><View style={styles.flex}><Input label="Minimum (mL)" keyboardType="decimal-pad" value={minMl} onChangeText={setMinMl} /></View><View style={styles.flex}><Input label="Maximum (mL)" keyboardType="decimal-pad" value={maxMl} onChangeText={setMaxMl} /></View></View>
      <Input label="Check every (days)" keyboardType="number-pad" value={interval} onChangeText={setInterval} />
      <Input label="Soil check" value={soilCheck} onChangeText={setSoilCheck} multiline />
      <Input label="Notes" value={notes} onChangeText={setNotes} multiline />
      <Input label="Reminder (HH:MM)" value={reminder} onChangeText={setReminder} />
      <SectionHeader title="Placement" />
      <Input label="Location" value={location} onChangeText={setLocation} multiline />
      <Input label="Distance guidance" value={windowDistance} onChangeText={setWindowDistance} />
      <Input label="Light guidance" value={light} onChangeText={setLight} multiline />
      {error ? <AppText color="danger">{error}</AppText> : null}
      <Button onPress={() => void save()}>Save and reschedule</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.md }, row: { flexDirection: 'row', gap: spacing.md }, flex: { flex: 1 } });
