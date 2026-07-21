import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen } from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/store/plants';
import { formatDateLong, toDateKey, todayKey } from '@/utils/date';

export default function PlantsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const plants = usePlants((state) => state.plants);

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="title">Plants</AppText>
          <AppText variant="callout" color="secondary">Care plans that learn from your check-ins.</AppText>
        </View>
        <Button onPress={() => router.push('/plants/new')} accessibilityLabel="Add a plant">Add</Button>
      </View>

      {plants.length === 0 ? (
        <EmptyState
          icon="leaf.fill"
          title="Grow your plant shelf"
          message="Photograph a plant to identify it, assess its health, and build a watering plan for your room."
          actionLabel="Analyze a plant"
          onAction={() => router.push('/plants/new')}
        />
      ) : plants
        .slice()
        .sort((a, b) => a.nextWateringAt.localeCompare(b.nextWateringAt))
        .map((plant) => {
          const dueKey = toDateKey(new Date(plant.nextWateringAt));
          const dueLabel = dueKey < todayKey() ? 'Overdue' : dueKey === todayKey() ? 'Due today' : `Due ${formatDateLong(dueKey)}`;
          return (
            <Card
              key={plant.id}
              padded={false}
              onPress={() => router.push({ pathname: '/plants/[id]', params: { id: plant.id } })}
              accessibilityLabel={`${plant.nickname}, ${plant.identity.commonName}, ${dueLabel}`}>
              <View style={styles.cardRow}>
                <Image source={plant.photoUri} style={styles.photo} contentFit="cover" />
                <View style={styles.cardBody}>
                  <AppText variant="heading" numberOfLines={1}>{plant.nickname}</AppText>
                  <AppText variant="caption" color="secondary" numberOfLines={1}>
                    {plant.identity.commonName} · {plant.identity.identificationSource === 'user-corrected'
                      ? 'corrected by you'
                      : plant.identity.identificationSource === 'user-confirmed'
                        ? 'confirmed by you'
                        : `${Math.round(plant.identity.confidence * 100)}% AI match`}
                  </AppText>
                  <AppText variant="callout" color={dueKey <= todayKey() ? 'accent' : 'secondary'}>{dueLabel}</AppText>
                  <AppText variant="caption" color={plant.health.status === 'healthy' ? 'success' : plant.health.status === 'urgent' ? 'danger' : 'secondary'}>
                    {plant.health.status === 'healthy' ? 'Looking healthy' : plant.health.status === 'urgent' ? 'Needs attention' : 'Keep watching'}
                  </AppText>
                </View>
              </View>
            </Card>
          );
        })}

      {plants.length ? (
        <View style={[styles.note, { backgroundColor: theme.backgroundSunken }]}>
          <AppText variant="caption" color="secondary">
            Watering amounts are starting ranges. Always check the soil and drainage before watering.
          </AppText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, marginBottom: spacing.lg },
  headerCopy: { flex: 1, gap: spacing.xs },
  cardRow: { flexDirection: 'row', gap: spacing.md },
  photo: { width: 112, minHeight: 138, borderTopLeftRadius: radii.lg, borderBottomLeftRadius: radii.lg },
  cardBody: { flex: 1, justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.lg, paddingRight: spacing.lg },
  note: { padding: spacing.md, borderRadius: radii.md, marginTop: spacing.md },
});
