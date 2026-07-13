import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText, BackButton, Button, EmptyState, Screen, SectionHeader } from '@/components/primitives';
import { MetricDisplay } from '@/components/shared';
import { findCategory } from '@/constants/categories';
import { radii, spacing } from '@/design-system';
import { usePreferences } from '@/store/preferences';
import { useSchedule } from '@/store/schedule';
import type { Meal, MealAnalysis } from '@/types/models';
import { aiProvider } from '@/services/ai';

export default function FoodDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const activityId = params.id;
  const aiEnabled = usePreferences((s) => s.aiEnabled);

  const activity = useSchedule((s) => s.activities.find((a) => a.id === activityId));
  const meal = useSchedule((s) => s.meals.find((m) => m.activityId === activityId));
  const categories = useSchedule((s) => s.categories);
  const upsertMeal = useSchedule((s) => s.upsertMeal);
  const updateActivity = useSchedule((s) => s.updateActivity);

  const [analyzing, setAnalyzing] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<MealAnalysis | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const items = pendingAnalysis?.items ?? meal?.items ?? [];
    return {
      calories: items.reduce((sum, i) => sum + i.calories, 0),
      protein: items.reduce((sum, i) => sum + i.proteinG, 0),
      carbs: items.reduce((sum, i) => sum + i.carbsG, 0),
      fat: items.reduce((sum, i) => sum + i.fatG, 0),
    };
  }, [meal?.items, pendingAnalysis?.items]);

  const displayItems = pendingAnalysis?.items ?? meal?.items ?? [];
  const displayPhoto = pendingPhoto ?? meal?.photo;

  const pickAndAnalyze = async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is required to analyze meals.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (result.canceled || !result.assets[0]?.uri) return;

    const photoUri = result.assets[0].uri;
    setPendingPhoto(photoUri);
    setAnalyzing(true);
    setPendingAnalysis(null);

    try {
      const analysis = await aiProvider.analyzeMealPhoto({
        photoUri,
        mealName: activity?.title,
      });
      setPendingAnalysis(analysis);
    } catch {
      setError('Analysis failed. You can try again or add items manually later.');
    } finally {
      setAnalyzing(false);
    }
  };

  const saveAnalysis = () => {
    if (!activity || !pendingAnalysis) return;

    const savedMeal: Meal = {
      activityId: activity.id,
      mealType: meal?.mealType ?? 'lunch',
      name: activity.title,
      photo: pendingPhoto ?? meal?.photo,
      aiAnalysis: pendingAnalysis,
      items: pendingAnalysis.items,
      notes: meal?.notes,
    };

    upsertMeal(savedMeal);
    updateActivity(activity.id, {
      summary: `${totals.calories} kcal · balanced`,
      photo: pendingPhoto ?? meal?.photo,
    });
    setPendingAnalysis(null);
    setPendingPhoto(null);
  };

  if (!activity) {
    return (
      <Screen>
        <BackButton />
        <AppText variant="title">Meal not found</AppText>
        <Button onPress={() => router.back()} accessibilityLabel="Go back">
          Go back
        </Button>
      </Screen>
    );
  }

  const category = findCategory(categories, activity.categoryId);
  const hasMeal = displayItems.length > 0;

  return (
    <Screen>
      <BackButton />
      {displayPhoto ? (
        <Image source={displayPhoto} style={styles.photo} contentFit="cover" />
      ) : null}

      <AppText variant="overline" color="tertiary">
        {category.name}
      </AppText>
      <AppText variant="title">{meal?.name ?? activity.title}</AppText>
      <Button
        variant="secondary"
        icon="pencil"
        style={{ marginTop: spacing.md, marginBottom: spacing.sm }}
        onPress={() => router.push({ pathname: '/activity-form', params: { id: activity.id } })}
        accessibilityLabel="Edit meal">
        Edit meal
      </Button>

      {!hasMeal && !analyzing ? (
        <EmptyState
          icon="camera.fill"
          title="Capture your meal"
          message="Add a photo to get an AI-assisted nutrition estimate. Values are approximate and editable."
          actionLabel={aiEnabled ? 'Choose photo' : 'AI disabled in settings'}
          onAction={aiEnabled ? pickAndAnalyze : undefined}
        />
      ) : null}

      {analyzing ? (
        <View style={styles.loading}>
          <ActivityIndicator />
          <AppText variant="callout" color="secondary">
            Analyzing your meal…
          </AppText>
        </View>
      ) : null}

      {error ? (
        <AppText variant="callout" color="danger" style={styles.error}>
          {error}
        </AppText>
      ) : null}

      {hasMeal ? (
        <>
          <SectionHeader title="Nutrition estimate" />
          <View style={styles.metrics}>
            <MetricDisplay label="Calories" value={`${totals.calories}`} />
            <MetricDisplay label="Protein" value={`${totals.protein}g`} />
          </View>
          <View style={styles.metrics}>
            <MetricDisplay label="Carbs" value={`${totals.carbs}g`} />
            <MetricDisplay label="Fat" value={`${totals.fat}g`} />
          </View>

          <SectionHeader title="Items" />
          {displayItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <AppText variant="callout">{item.name}</AppText>
              <AppText variant="caption" color="secondary">
                {item.portion} · {item.calories} kcal
                {item.confidence !== undefined && item.confidence < 0.7 ? ' · review' : ''}
              </AppText>
            </View>
          ))}

          {(pendingAnalysis?.observations ?? meal?.aiAnalysis?.observations ?? []).map((note) => (
            <AppText key={note} variant="caption" color="secondary" style={styles.observation}>
              {note}
            </AppText>
          ))}

          <AppText variant="caption" color="tertiary" style={styles.disclaimer}>
            {pendingAnalysis?.disclaimer ??
              meal?.aiAnalysis?.disclaimer ??
              'Nutrition values are estimates and not medical advice.'}
          </AppText>
        </>
      ) : null}

      <View style={styles.actions}>
        {pendingAnalysis ? (
          <Button onPress={saveAnalysis} accessibilityLabel="Save meal analysis">
            Save analysis
          </Button>
        ) : null}
        {aiEnabled && hasMeal ? (
          <Button variant="secondary" onPress={pickAndAnalyze} accessibilityLabel="Analyze new photo">
            {analyzing ? 'Analyzing…' : 'Analyze new photo'}
          </Button>
        ) : null}
        <Button variant="ghost" onPress={() => router.back()} accessibilityLabel="Close">
          Close
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 220,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  loading: {
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  error: { marginBottom: spacing.md },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  itemRow: {
    marginBottom: spacing.md,
    gap: spacing.xxs,
  },
  observation: {
    marginBottom: spacing.xs,
  },
  disclaimer: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  actions: { gap: spacing.sm },
});
