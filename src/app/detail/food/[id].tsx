import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, EmptyState, Input, Screen, SectionHeader } from '@/components/primitives';
import { findCategory } from '@/constants/categories';
import { radii, spacing } from '@/design-system';
import { MealAnalysisReview } from '@/features/nutrition/analysis-review';
import {
  analyzeMealLink,
  analyzeMealPhoto,
  confirmMealAnalysis,
  resolveMealLink,
  type MealLinkCandidate,
  NutritionServiceError,
} from '@/services/nutrition';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import type { Meal, MealAnalysis } from '@/types/models';

export default function FoodDetailScreen() {
  const router = useRouter();
  const { id: activityId } = useLocalSearchParams<{ id: string }>();
  const aiEnabled = usePreferences((state) => state.aiEnabled);
  const activity = useSchedule((state) => state.activities.find((item) => item.id === activityId));
  const meal = useSchedule((state) => state.meals.find((item) => item.activityId === activityId));
  const categories = useSchedule((state) => state.categories);
  const upsertMeal = useSchedule((state) => state.upsertMeal);
  const updateActivity = useSchedule((state) => state.updateActivity);

  const [analyzing, setAnalyzing] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<MealAnalysis | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string>();
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [candidates, setCandidates] = useState<MealLinkCandidate[]>([]);
  const [pendingSourceUrl, setPendingSourceUrl] = useState<string>();
  const [error, setError] = useState<string | null>(null);

  const displayAnalysis = pendingAnalysis ?? meal?.aiAnalysis;
  const displayPhoto = pendingPhoto ?? meal?.photo;

  const analyzeAsset = async (photoUri: string) => {
    setPendingPhoto(photoUri);
    setAnalyzing(true);
    setPendingAnalysis(null);
    setCandidates([]);
    try {
      const response = await analyzeMealPhoto(photoUri, activity?.title);
      setPendingAnalysis(response.analysis);
      setDraftId(response.draftId);
      setPendingSourceUrl(undefined);
    } catch (caught) {
      setError(caught instanceof NutritionServiceError ? caught.message : 'Meal analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const takePhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return setError('Camera access is required to photograph a meal.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets[0]?.uri) await analyzeAsset(result.assets[0].uri);
  };

  const choosePhoto = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return setError('Photo library access is required to choose a meal photo.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [4, 3] });
    if (!result.canceled && result.assets[0]?.uri) await analyzeAsset(result.assets[0].uri);
  };

  const showMealSources = () => {
    const select = (index: number) => {
      if (index === 0) void takePhoto();
      if (index === 1) void choosePhoto();
      if (index === 2) setShowLinkInput(true);
      if (index === 3 && activity) router.push({ pathname: '/activity-form', params: { id: activity.id } });
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({
        options: ['Take photo', 'Choose photo', 'Paste meal link', 'Enter manually', 'Cancel'],
        cancelButtonIndex: 4,
        title: 'Add meal nutrition',
      }, select);
    } else {
      Alert.alert('Add meal nutrition', undefined, [
        { text: 'Take photo', onPress: takePhoto },
        { text: 'Choose photo', onPress: choosePhoto },
        { text: 'Paste meal link', onPress: () => setShowLinkInput(true) },
        { text: 'Enter manually', onPress: () => activity && router.push({ pathname: '/activity-form', params: { id: activity.id } }) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const resolveLink = async () => {
    setError(null);
    setAnalyzing(true);
    try {
      const resolution = await resolveMealLink(linkInput);
      setPendingSourceUrl(resolution.sanitizedUrl);
      setCandidates(resolution.candidates);
      if (!resolution.candidates.length) setError(resolution.fallbackMessage ?? 'No meal was found at that link.');
    } catch (caught) {
      setError(caught instanceof NutritionServiceError ? caught.message : 'That link could not be analyzed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const chooseCandidate = async (candidate: MealLinkCandidate) => {
    setAnalyzing(true);
    setError(null);
    try {
      const response = await analyzeMealLink(candidate);
      setPendingAnalysis(response.analysis);
      setDraftId(response.draftId);
      setCandidates([]);
      setShowLinkInput(false);
    } catch (caught) {
      setError(caught instanceof NutritionServiceError ? caught.message : 'That meal could not be analyzed.');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAnalysis = async () => {
    if (!activity || !pendingAnalysis || !draftId) return;
    setAnalyzing(true);
    try {
      const confirmed = await confirmMealAnalysis(draftId, pendingAnalysis);
      const savedMeal: Meal = {
        activityId: activity.id,
        mealType: meal?.mealType ?? 'lunch',
        name: activity.title,
        photo: pendingPhoto ?? meal?.photo,
        sourceKind: pendingSourceUrl ? 'link' : 'photo',
        sourceUrl: pendingSourceUrl,
        aiAnalysis: confirmed.analysis,
        items: confirmed.analysis.items,
        notes: meal?.notes,
      };
      upsertMeal(savedMeal);
      updateActivity(activity.id, { summary: `${confirmed.analysis.totalCalories} kcal · ${confirmed.analysis.proteinG}g protein`, photo: savedMeal.photo });
      setPendingAnalysis(null);
      setPendingPhoto(null);
      setDraftId(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The analysis could not be saved.');
    } finally {
      setAnalyzing(false);
    }
  };

  if (!activity) return <Screen><BackButton /><AppText variant="title">Meal not found</AppText></Screen>;
  const category = findCategory(categories, activity.categoryId);

  return (
    <Screen>
      <BackButton />
      {displayPhoto ? <Image source={displayPhoto} style={styles.photo} contentFit="cover" /> : null}
      <AppText variant="overline" color="tertiary">{category.name}</AppText>
      <AppText variant="title">{meal?.name ?? activity.title}</AppText>

      {!displayAnalysis && !analyzing ? (
        <EmptyState
          icon="camera.fill"
          title="Analyze this meal"
          message="Take a photo, choose one, paste a restaurant link, or enter nutrition manually."
          actionLabel={aiEnabled ? 'Add meal nutrition' : 'AI disabled in settings'}
          onAction={aiEnabled ? showMealSources : undefined}
        />
      ) : null}

      {showLinkInput ? (
        <View style={styles.linkCard}>
          <SectionHeader title="Restaurant or delivery link" />
          <Input label="Meal link" autoCapitalize="none" keyboardType="url" value={linkInput} onChangeText={setLinkInput} placeholder="https://…" />
          <Button onPress={resolveLink} disabled={!linkInput.trim() || analyzing}>Find meal</Button>
          <AppText variant="caption" color="secondary">Blocked or ambiguous links will ask you to confirm the item or provide menu text/photo.</AppText>
        </View>
      ) : null}

      {candidates.length ? <SectionHeader title="Confirm the meal" /> : null}
      {candidates.map((candidate) => (
        <Button key={candidate.id} variant="secondary" onPress={() => chooseCandidate(candidate)} accessibilityLabel={`Choose ${candidate.itemName}`}>
          {[candidate.restaurant, candidate.itemName, candidate.size].filter(Boolean).join(' · ')}
        </Button>
      ))}

      {analyzing ? <View style={styles.loading}><ActivityIndicator /><AppText variant="callout" color="secondary">Analyzing your meal…</AppText></View> : null}
      {error ? <AppText variant="callout" color="danger" style={styles.error}>{error}</AppText> : null}
      {displayAnalysis ? (
        <MealAnalysisReview
          analysis={displayAnalysis}
          editable={Boolean(pendingAnalysis)}
          onChange={pendingAnalysis ? setPendingAnalysis : () => undefined}
        />
      ) : null}

      <View style={styles.actions}>
        {pendingAnalysis ? <Button onPress={saveAnalysis} disabled={analyzing}>Confirm and save</Button> : null}
        {aiEnabled && displayAnalysis ? <Button variant="secondary" onPress={showMealSources}>Analyze another source</Button> : null}
        <Button variant="secondary" icon="pencil" onPress={() => router.push({ pathname: '/activity-form', params: { id: activity.id } })}>Edit meal manually</Button>
        <Button variant="ghost" onPress={() => router.back()}>Close</Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', height: 220, borderRadius: radii.lg, marginBottom: spacing.lg },
  loading: { alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  error: { marginVertical: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.lg },
  linkCard: { gap: spacing.sm, marginVertical: spacing.md },
});
