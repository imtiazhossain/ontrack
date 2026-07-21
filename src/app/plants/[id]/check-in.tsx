import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, Screen, SectionHeader } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { analyzePlantCheckIn, persistPlantPhoto, PlantServiceError } from '@/services/plants';
import { applyPlantCarePlan } from '@/services/plants/schedule';
import { usePlants } from '@/store/plants';
import { newId } from '@/store/schedule';
import type { PlantCheckInResponse } from '@/services/plants';
import type { PlantCheckIn } from '@/types/models';

export default function PlantCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const plant = usePlants((state) => state.plants.find((item) => item.id === id));
  const addCheckIn = usePlants((state) => state.addCheckIn);
  const acceptCheckInPlan = usePlants((state) => state.acceptCheckInPlan);
  const [photo, setPhoto] = useState<string>();
  const [result, setResult] = useState<PlantCheckInResponse>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!plant) return <Screen><BackButton /><AppText variant="title">Plant not found</AppText></Screen>;

  const camera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to take a health check-in.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const picked = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!picked.canceled && picked.assets[0]?.uri) { setPhoto(picked.assets[0].uri); setResult(undefined); }
  };

  const library = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!picked.canceled && picked.assets[0]?.uri) { setPhoto(picked.assets[0].uri); setResult(undefined); }
  };

  const analyze = async () => {
    if (!photo) return;
    setBusy(true); setError(undefined);
    try {
      setResult(await analyzePlantCheckIn({
        photoUri: photo, identity: plant.identity, previousHealth: plant.health,
        currentCarePlan: plant.carePlan, room: plant.room,
      }));
    } catch (caught) {
      setError(caught instanceof PlantServiceError ? caught.message : 'The check-in could not be analyzed.');
    } finally { setBusy(false); }
  };

  const save = async (acceptPlan: boolean) => {
    if (!photo || !result) return;
    setBusy(true);
    try {
      const checkInId = newId('checkin');
      const photoUri = await persistPlantPhoto(photo, plant.id, checkInId);
      const checkIn: PlantCheckIn = {
        id: checkInId, photoUri, createdAt: new Date().toISOString(),
        assessment: result.health, proposedCarePlan: result.proposedCarePlan,
      };
      addCheckIn(plant.id, checkIn);
      if (acceptPlan && result.proposedCarePlan) {
        acceptCheckInPlan(plant.id, checkIn.id, result.proposedCarePlan);
        await applyPlantCarePlan(plant.id, result.proposedCarePlan);
      }
      router.back();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The check-in could not be saved.'); }
    finally { setBusy(false); }
  };

  return (
    <Screen contentStyle={styles.content}>
      <BackButton />
      <AppText variant="title">Check in on {plant.nickname}</AppText>
      <AppText color="secondary">Use similar lighting and framing when possible. The assessment compares only visible changes.</AppText>
      {photo ? <Image source={photo} style={styles.hero} contentFit="cover" /> : null}
      <View style={styles.row}><View style={styles.flex}><Button onPress={() => void camera()} icon="camera.fill">Camera</Button></View><View style={styles.flex}><Button variant="secondary" onPress={() => void library()} icon="photo">Library</Button></View></View>
      <Button onPress={() => void analyze()} disabled={!photo || busy}>{busy ? 'Analyzing…' : 'Analyze check-in'}</Button>
      {result ? (
        <>
          <SectionHeader title="Assessment" />
          <Card style={styles.card}><AppText variant="heading">{result.health.summary}</AppText>{result.health.visibleSigns.map((item) => <AppText key={item} color="secondary">Observed: {item}</AppText>)}{result.health.actions.map((item) => <AppText key={item}>• {item}</AppText>)}</Card>
          {result.proposedCarePlan ? (
            <Card style={styles.card}>
              <AppText variant="heading">Care-plan update suggested</AppText>
              <AppText color="secondary">Check every {result.proposedCarePlan.watering.intervalDays} days, starting with {result.proposedCarePlan.watering.minMl}–{result.proposedCarePlan.watering.maxMl} mL after the soil check.</AppText>
              <Button onPress={() => void save(true)}>Save and update care plan</Button>
              <Button variant="secondary" onPress={() => void save(false)}>Save check-in, keep current plan</Button>
            </Card>
          ) : <Button onPress={() => void save(false)}>Save check-in</Button>}
        </>
      ) : null}
      {busy ? <ActivityIndicator /> : null}
      {error ? <AppText color="danger" selectable>{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.md }, hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg }, row: { flexDirection: 'row', gap: spacing.md }, flex: { flex: 1 }, card: { gap: spacing.sm } });
