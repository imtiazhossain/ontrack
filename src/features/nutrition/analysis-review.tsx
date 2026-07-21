import { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Input, SectionHeader } from '@/components/primitives';
import { MetricDisplay } from '@/components/shared';
import { radii, spacing } from '@/design-system';
import type { FoodItem, MealAnalysis } from '@/types/models';

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function MealAnalysisReview({
  analysis,
  onChange,
  editable = true,
}: {
  analysis: MealAnalysis;
  onChange: (analysis: MealAnalysis) => void;
  editable?: boolean;
}) {
  const [showNutrients, setShowNutrients] = useState(false);
  const updateItem = (id: string, patch: Partial<FoodItem>) => {
    const items = analysis.items.map((item) => item.id === id ? { ...item, ...patch } : item);
    onChange({
      ...analysis,
      items,
      totalCalories: items.reduce((sum, item) => sum + item.calories, 0),
      proteinG: items.reduce((sum, item) => sum + item.proteinG, 0),
      carbsG: items.reduce((sum, item) => sum + item.carbsG, 0),
      fatG: items.reduce((sum, item) => sum + item.fatG, 0),
      fiberG: items.reduce((sum, item) => sum + (item.fiberG ?? 0), 0),
      sugarG: items.reduce((sum, item) => sum + (item.sugarG ?? 0), 0),
      saturatedFatG: items.reduce((sum, item) => sum + (item.saturatedFatG ?? 0), 0),
      sodiumMg: items.reduce((sum, item) => sum + (item.sodiumMg ?? 0), 0),
    });
  };

  return (
    <View>
      {analysis.reviewRequired ? (
        <View style={styles.reviewBanner}>
          <AppText variant="callout">Review portions and items before saving.</AppText>
          <AppText variant="caption" color="secondary">Low-confidence values are estimates, not measurements.</AppText>
        </View>
      ) : null}

      <SectionHeader title="Nutrition estimate" />
      <View style={styles.metrics}>
        <MetricDisplay label="Calories" value={`${analysis.totalCalories}`} />
        <MetricDisplay label="Protein" value={`${analysis.proteinG}g`} />
      </View>
      <View style={styles.metrics}>
        <MetricDisplay label="Carbs" value={`${analysis.carbsG}g`} />
        <MetricDisplay label="Fat" value={`${analysis.fatG}g`} />
      </View>
      <View style={styles.metrics}>
        <MetricDisplay label="Fiber" value={`${analysis.fiberG}g`} />
        <MetricDisplay label="Sodium" value={analysis.sodiumMg === undefined ? 'Unknown' : `${analysis.sodiumMg}mg`} />
      </View>

      <SectionHeader title="Detected items" />
      {analysis.items.map((item) => (
        <View key={item.id} style={styles.itemCard}>
          <Input editable={editable} label="Item" value={item.name} onChangeText={(name) => updateItem(item.id, { name })} />
          <Input editable={editable} label="Portion" value={item.portion} onChangeText={(portion) => updateItem(item.id, { portion })} />
          <View style={styles.metrics}>
            <View style={styles.flex}><Input editable={editable} label="Calories" keyboardType="decimal-pad" value={String(item.calories)} onChangeText={(value) => updateItem(item.id, { calories: numberValue(value) })} /></View>
            <View style={styles.flex}><Input editable={editable} label="Protein (g)" keyboardType="decimal-pad" value={String(item.proteinG)} onChangeText={(value) => updateItem(item.id, { proteinG: numberValue(value) })} /></View>
          </View>
          <AppText variant="caption" color={(item.confidence ?? 1) < 0.7 ? 'danger' : 'secondary'}>
            {item.confidence === undefined ? 'Manual value' : `${Math.round(item.confidence * 100)}% identification confidence`}
          </AppText>
        </View>
      ))}

      <Button variant="ghost" onPress={() => setShowNutrients((value) => !value)} accessibilityLabel="Toggle vitamins and minerals">
        {showNutrients ? 'Hide vitamins & minerals' : 'Show vitamins & minerals'}
      </Button>
      {showNutrients ? (
        analysis.nutrients.length ? analysis.nutrients.map((nutrient, index) => (
          <View key={`${nutrient.id}-${index}`} style={styles.nutrientRow}>
            <AppText variant="caption">{nutrient.name}</AppText>
            <AppText variant="caption" color="secondary">
              {nutrient.amount === undefined ? 'Unknown' : `${nutrient.amount} ${nutrient.unit}`}
            </AppText>
          </View>
        )) : <AppText variant="caption" color="secondary">Micronutrients are unknown for this estimate.</AppText>
      ) : null}

      {analysis.recommendations.length ? <SectionHeader title="Suggestions" /> : null}
      {analysis.recommendations.map((recommendation) => (
        <View key={recommendation.id} style={styles.suggestion}>
          <AppText variant="callout">{recommendation.title}</AppText>
          <AppText variant="caption" color="secondary">{recommendation.body}</AppText>
        </View>
      ))}

      {analysis.sources.length ? <SectionHeader title="Sources" /> : null}
      {analysis.sources.map((source) => source.url ? (
        <Pressable key={source.id} onPress={() => Linking.openURL(source.url!)} accessibilityRole="link">
          <AppText variant="caption" color="accent">{source.title}</AppText>
        </Pressable>
      ) : <AppText key={source.id} variant="caption" color="secondary">{source.title}</AppText>)}

      <AppText variant="caption" color="tertiary" style={styles.disclaimer}>{analysis.disclaimer}</AppText>
      <AppText variant="caption" color="danger">
        AI and public menu data cannot guarantee allergen safety. Confirm ingredients with the restaurant or manufacturer.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  flex: { flex: 1 },
  reviewBanner: { padding: spacing.md, borderRadius: radii.md, backgroundColor: 'rgba(255, 170, 0, 0.12)', gap: spacing.xxs, marginVertical: spacing.md },
  itemCard: { padding: spacing.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(128,128,128,0.35)', marginBottom: spacing.md, gap: spacing.sm },
  nutrientRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.xs },
  suggestion: { gap: spacing.xxs, marginBottom: spacing.md },
  disclaimer: { marginTop: spacing.lg, marginBottom: spacing.sm },
});
