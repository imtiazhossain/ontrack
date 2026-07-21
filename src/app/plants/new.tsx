import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, Card, Input, Screen, SectionHeader } from '@/components/primitives';
import { ChipRow } from '@/components/shared';
import { radii, spacing } from '@/design-system';
import {
  createPlantCarePlan,
  identifyPlant,
  persistPlantPhoto,
  PlantServiceError,
  searchPlants,
  type PlantTaxonSearchResult,
} from '@/services/plants';
import { activatePlantSchedule, wateringDueAt } from '@/services/plants/schedule';
import { usePlants } from '@/store/plants';
import { newId } from '@/store/schedule';
import type {
  Plant,
  PlantCarePlan,
  PlantHealthAssessment,
  PlantIdentity,
  RoomProfile,
} from '@/types/models';
import { fromDateKey, todayKey } from '@/utils/date';

type Step = 'photo' | 'details' | 'review';
type PhotoTarget = 'plant' | 'room';

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseReminder(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 60 + minutes : undefined;
}

export default function NewPlantScreen() {
  const router = useRouter();
  const addPlant = usePlants((state) => state.addPlant);
  const [plantId] = useState(() => newId('plant'));
  const [step, setStep] = useState<Step>('photo');
  const [plantPhoto, setPlantPhoto] = useState<string>();
  const [roomPhoto, setRoomPhoto] = useState<string>();
  const [identity, setIdentity] = useState<PlantIdentity>();
  const [suggestedIdentity, setSuggestedIdentity] = useState<PlantIdentity>();
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [searchResults, setSearchResults] = useState<PlantTaxonSearchResult[]>([]);
  const [selectedSearchName, setSelectedSearchName] = useState<string>();
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string>();
  const [health, setHealth] = useState<PlantHealthAssessment>();
  const [carePlan, setCarePlan] = useState<PlantCarePlan>();
  const [nickname, setNickname] = useState('');
  const [potDiameter, setPotDiameter] = useState('20');
  const [drainage, setDrainage] = useState<RoomProfile['drainage']>('yes');
  const [windowDirection, setWindowDirection] = useState<RoomProfile['windowDirection']>('east');
  const [windowDistance, setWindowDistance] = useState('1');
  const [sunHours, setSunHours] = useState('3');
  const [lastWatered, setLastWatered] = useState(todayKey());
  const [reminderTime, setReminderTime] = useState('09:00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void ImagePicker.getPendingResultAsync().then((result) => {
      if (result && 'canceled' in result && !result.canceled && result.assets[0]?.uri) {
        setPlantPhoto(result.assets[0].uri);
      }
    });
  }, []);

  useEffect(() => {
    const query = identity?.commonName.trim() ?? '';
    if (step !== 'details' || query.length < 2 || query === selectedSearchName) {
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => {
      setSearching(true);
      setSearchError(undefined);
      void searchPlants(query, controller.signal)
        .then((results) => {
          if (active) setSearchResults(results);
        })
        .catch((caught) => {
          if (active && (!(caught instanceof Error) || caught.name !== 'AbortError')) {
            setSearchResults([]);
            setSearchError(caught instanceof Error ? caught.message : 'Plant search is unavailable.');
          }
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [identity?.commonName, selectedSearchName, step]);

  const setPhoto = (target: PhotoTarget, uri: string) => {
    if (target === 'plant') setPlantPhoto(uri);
    else setRoomPhoto(uri);
  };

  const capturePhoto = async (target: PhotoTarget) => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph your plant.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (!result.canceled && result.assets[0]?.uri) setPhoto(target, result.assets[0].uri);
  };

  const choosePhoto = async (target: PhotoTarget) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (!result.canceled && result.assets[0]?.uri) setPhoto(target, result.assets[0].uri);
  };

  const analyzeIdentity = async () => {
    if (!plantPhoto) return;
    setBusy(true);
    setError(undefined);
    try {
      const result = await identifyPlant(plantPhoto);
      setIdentity(result.identity);
      setSuggestedIdentity(result.identity);
      setIdentityConfirmed(false);
      setHealth(result.health);
      setNickname(result.identity.commonName);
      setStep('details');
    } catch (caught) {
      setError(caught instanceof PlantServiceError ? caught.message : 'The plant could not be analyzed.');
    } finally {
      setBusy(false);
    }
  };

  const roomProfile = (): RoomProfile => ({
    potDiameterCm: numberValue(potDiameter),
    drainage,
    windowDirection,
    windowDistanceM: numberValue(windowDistance),
    directSunHours: numberValue(sunHours),
  });

  const updateIdentity = (patch: Partial<PlantIdentity>) => {
    setIdentity((current) => current ? { ...current, ...patch, identificationSource: 'ai' } : current);
    setIdentityConfirmed(false);
    setError(undefined);
  };

  const updateCommonName = (commonName: string) => {
    const botanicalNameStillMatchesSuggestion = identity?.scientificName === suggestedIdentity?.scientificName;
    setSelectedSearchName(undefined);
    setSearchResults([]);
    setSearching(false);
    setSearchError(undefined);
    updateIdentity({
      commonName,
      ...(botanicalNameStillMatchesSuggestion ? { scientificName: '' } : null),
    });
  };

  const selectPlantSearchResult = (result: PlantTaxonSearchResult) => {
    setIdentity((current) => current ? {
      ...current,
      commonName: result.commonName,
      scientificName: result.scientificName,
      identificationSource: 'ai',
    } : current);
    setSelectedSearchName(result.commonName);
    setSearchResults([]);
    setSearchError(undefined);
    setIdentityConfirmed(false);
  };

  const confirmIdentity = () => {
    if (!identity || !suggestedIdentity) return;
    const commonName = identity.commonName.trim();
    if (!commonName) {
      setError('Enter the plant name you want to use.');
      return;
    }
    const scientificName = identity.scientificName.trim() || `${commonName} species`;
    const corrected = commonName.toLocaleLowerCase() !== suggestedIdentity.commonName.toLocaleLowerCase()
      || scientificName.toLocaleLowerCase() !== suggestedIdentity.scientificName.toLocaleLowerCase();
    setIdentity({
      ...identity,
      commonName,
      scientificName,
      identificationSource: corrected ? 'user-corrected' : 'user-confirmed',
    });
    if (!nickname.trim() || nickname === suggestedIdentity.commonName) setNickname(commonName);
    setIdentityConfirmed(true);
    setError(undefined);
  };

  const generateCarePlan = async () => {
    if (!identity || !health) return;
    if (!identityConfirmed) {
      setError('Confirm or correct the plant identification before building its care plan.');
      return;
    }
    if (numberValue(potDiameter) <= 0 || numberValue(windowDistance) < 0 || numberValue(sunHours) < 0 || numberValue(sunHours) > 24) {
      setError('Enter valid pot and room measurements.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastWatered) || parseReminder(reminderTime) === undefined) {
      setError('Use YYYY-MM-DD for the watering date and HH:MM for reminder time.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const result = await createPlantCarePlan({ identity, health, room: roomProfile(), roomPhotoUri: roomPhoto });
      setCarePlan(result.carePlan);
      setRoomPhoto(undefined);
      setStep('review');
    } catch (caught) {
      setError(caught instanceof PlantServiceError ? caught.message : 'A care plan could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const updateWatering = (patch: Partial<PlantCarePlan['watering']>) => {
    setCarePlan((current) => current ? { ...current, watering: { ...current.watering, ...patch } } : current);
  };

  const savePlant = async () => {
    if (!plantPhoto || !identity || !health || !carePlan) return;
    const reminderMinutes = parseReminder(reminderTime);
    if (reminderMinutes === undefined || carePlan.watering.minMl <= 0 || carePlan.watering.maxMl < carePlan.watering.minMl || carePlan.watering.intervalDays < 1) {
      setError('Review the watering range, interval, and reminder time.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const photoUri = await persistPlantPhoto(plantPhoto, plantId);
      const now = new Date().toISOString();
      const wateredBasis = fromDateKey(lastWatered);
      const plant: Plant = {
        id: plantId,
        nickname: nickname.trim() || identity.commonName,
        photoUri,
        identity,
        health,
        carePlan,
        room: roomProfile(),
        lastWateredAt: wateredBasis.toISOString(),
        nextWateringAt: wateringDueAt(wateredBasis, carePlan.watering.intervalDays, reminderMinutes),
        reminderMinutes,
        wateringLogs: [],
        checkIns: [],
        createdAt: now,
        updatedAt: now,
      };
      addPlant(plant);
      await activatePlantSchedule(plant.id, true);
      router.replace({ pathname: '/plants/[id]', params: { id: plant.id } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The plant could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <BackButton />
      <AppText variant="title">{step === 'photo' ? 'Photograph your plant' : step === 'details' ? 'Describe its space' : 'Review the care plan'}</AppText>
      <AppText variant="callout" color="secondary">
        {step === 'photo'
          ? 'Use a bright, sharp photo showing the whole plant and several leaves.'
          : step === 'details'
            ? 'Pot and light details make watering and placement guidance more useful.'
            : 'These are editable starting points. Your soil check always comes first.'}
      </AppText>

      {step === 'photo' ? (
        <>
          {plantPhoto ? <Image source={plantPhoto} style={styles.hero} contentFit="cover" /> : <View style={styles.photoPlaceholder}><AppText color="secondary">No plant photo yet</AppText></View>}
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Button onPress={() => void capturePhoto('plant')} icon="camera.fill">Camera</Button></View>
            <View style={styles.flex}><Button variant="secondary" onPress={() => void choosePhoto('plant')} icon="photo">Library</Button></View>
          </View>
          <Button onPress={() => void analyzeIdentity()} disabled={!plantPhoto || busy}>
            {busy ? 'Analyzing…' : 'Identify and assess'}
          </Button>
        </>
      ) : null}

      {step === 'details' && identity && health ? (
        <>
          <Card style={styles.summaryCard}>
            <AppText variant="caption" color="secondary">AI suggestion — please verify</AppText>
            <AppText variant="heading">{suggestedIdentity?.commonName ?? identity.commonName}</AppText>
            <AppText variant="callout" color="secondary" style={styles.italic}>{suggestedIdentity?.scientificName ?? identity.scientificName}</AppText>
            <AppText variant="caption" color="secondary">Model-reported confidence: {Math.round((suggestedIdentity?.confidence ?? identity.confidence) * 100)}%</AppText>
            <AppText variant="body">{health.summary}</AppText>
          </Card>
          <AppText variant="callout" color="secondary">
            AI can confidently choose the wrong plant. Confirm the name below, or replace it with the correct one before care advice is created.
          </AppText>
          <Input
            label="Search for the correct plant"
            value={identity.commonName}
            onChangeText={updateCommonName}
            placeholder="Try Ginger, Monstera, or a botanical name"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator size="small" /> : null}
          {searchResults.length > 0 ? (
            <Card style={styles.searchResults}>
              {searchResults.map((result) => (
                <Pressable
                  key={result.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${result.commonName}, ${result.scientificName}`}
                  onPress={() => selectPlantSearchResult(result)}
                  style={({ pressed }) => [styles.searchResult, pressed && styles.searchResultPressed]}
                >
                  <AppText variant="callout">{result.commonName}</AppText>
                  <AppText variant="caption" color="secondary" style={styles.italic}>{result.scientificName}</AppText>
                </Pressable>
              ))}
            </Card>
          ) : null}
          {searchError ? <AppText variant="caption" color="danger" selectable>{searchError}</AppText> : null}
          <Input label="Botanical name" value={identity.scientificName} onChangeText={(scientificName) => updateIdentity({ scientificName })} />
          <Button variant="secondary" onPress={confirmIdentity}>
            {identityConfirmed ? 'Identification confirmed' : 'Confirm identification'}
          </Button>
          {identityConfirmed ? (
            <AppText variant="caption" color="success">
              {identity.identificationSource === 'user-corrected' ? 'Using your corrected identification.' : 'Using your confirmed identification.'}
            </AppText>
          ) : null}
          <Input label="Plant nickname" value={nickname} onChangeText={setNickname} />
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Input label="Pot diameter (cm)" keyboardType="decimal-pad" value={potDiameter} onChangeText={setPotDiameter} /></View>
            <View style={styles.flex}><Input label="Last watered (YYYY-MM-DD)" value={lastWatered} onChangeText={setLastWatered} /></View>
          </View>
          <SectionHeader title="Drainage holes" />
          <ChipRow options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, { value: 'unknown', label: 'Not sure' }]} selected={drainage} onSelect={setDrainage} />
          <SectionHeader title="Nearest window" />
          <ChipRow options={(['north', 'east', 'south', 'west', 'unknown'] as const).map((value) => ({ value, label: value === 'unknown' ? 'Not sure' : value[0].toUpperCase() + value.slice(1) }))} selected={windowDirection} onSelect={setWindowDirection} />
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Input label="Distance from window (m)" keyboardType="decimal-pad" value={windowDistance} onChangeText={setWindowDistance} /></View>
            <View style={styles.flex}><Input label="Direct sun (hours/day)" keyboardType="decimal-pad" value={sunHours} onChangeText={setSunHours} /></View>
          </View>
          <Input label="Reminder time (HH:MM)" value={reminderTime} onChangeText={setReminderTime} />
          <SectionHeader title="Optional room photo" detail="Discarded after analysis" />
          {roomPhoto ? <Image source={roomPhoto} style={styles.roomPhoto} contentFit="cover" /> : null}
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Button variant="secondary" onPress={() => void capturePhoto('room')} icon="camera.fill">Room camera</Button></View>
            <View style={styles.flex}><Button variant="secondary" onPress={() => void choosePhoto('room')} icon="photo">Room library</Button></View>
          </View>
          <Button onPress={() => void generateCarePlan()} disabled={busy || !identityConfirmed}>{busy ? 'Building care plan…' : 'Build care plan'}</Button>
        </>
      ) : null}

      {step === 'review' && carePlan ? (
        <>
          <SectionHeader title="Watering" />
          <View style={styles.buttonRow}>
            <View style={styles.flex}><Input label="Minimum (mL)" keyboardType="decimal-pad" value={String(carePlan.watering.minMl)} onChangeText={(value) => updateWatering({ minMl: numberValue(value) })} /></View>
            <View style={styles.flex}><Input label="Maximum (mL)" keyboardType="decimal-pad" value={String(carePlan.watering.maxMl)} onChangeText={(value) => updateWatering({ maxMl: numberValue(value) })} /></View>
          </View>
          <Input label="Check every (days)" keyboardType="number-pad" value={String(carePlan.watering.intervalDays)} onChangeText={(value) => updateWatering({ intervalDays: numberValue(value) })} />
          <Input label="Soil check" value={carePlan.watering.soilCheck} onChangeText={(soilCheck) => updateWatering({ soilCheck })} multiline />
          <AppText variant="caption" color="secondary">About {Math.round(carePlan.watering.minMl / 237 * 10) / 10}–{Math.round(carePlan.watering.maxMl / 237 * 10) / 10} US cups as a starting range.</AppText>
          <SectionHeader title="Best placement" />
          <Card><AppText variant="heading">{carePlan.placement.location}</AppText><AppText color="secondary">{carePlan.placement.windowDistance}</AppText><AppText>{carePlan.placement.light}</AppText></Card>
          <SectionHeader title="Pruning" detail={carePlan.pruning.urgency.replace('-', ' ')} />
          <AppText>{carePlan.pruning.reason}</AppText>
          {carePlan.pruning.steps.map((item) => <AppText key={item} color="secondary">• {item}</AppText>)}
          <SectionHeader title="Sources" />
          {carePlan.sources.map((source) => <AppText key={source.url} variant="caption" color="accent" onPress={() => Linking.openURL(source.url)}>{source.title}</AppText>)}
          <AppText variant="caption" color="tertiary">{carePlan.disclaimer}</AppText>
          <Button size="lg" onPress={() => void savePlant()} disabled={busy}>{busy ? 'Saving…' : 'Confirm and schedule'}</Button>
        </>
      ) : null}

      {busy ? <ActivityIndicator /> : null}
      {error ? <AppText variant="callout" color="danger" selectable>{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  hero: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg },
  roomPhoto: { width: '100%', aspectRatio: 16 / 9, borderRadius: radii.md },
  photoPlaceholder: { aspectRatio: 4 / 3, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.12)', borderRadius: radii.lg },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  summaryCard: { gap: spacing.xs },
  searchResults: { gap: 0, padding: 0, overflow: 'hidden' },
  searchResult: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.xs },
  searchResultPressed: { opacity: 0.55 },
  italic: { fontStyle: 'italic' },
});
