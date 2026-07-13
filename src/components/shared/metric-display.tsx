import { StyleSheet } from 'react-native';

import { AppText, Card } from '@/components/primitives';
import { spacing } from '@/design-system';

interface MetricDisplayProps {
  label: string;
  value: string;
  detail?: string;
  accent?: string;
}

export function MetricDisplay({ label, value, detail, accent }: MetricDisplayProps) {
  return (
    <Card style={styles.card}>
      <AppText variant="overline" color="tertiary">
        {label}
      </AppText>
      <AppText variant="metric" style={accent ? { color: accent } : undefined}>
        {value}
      </AppText>
      {detail ? (
        <AppText variant="caption" color="secondary">
          {detail}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: spacing.xs,
  },
});
