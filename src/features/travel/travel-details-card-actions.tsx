import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Symbol } from '@/components/primitives';
import { spacing } from '@/design-system';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';

export function TravelDetailsCardActions({
  itemTitle,
  saveLabel,
  onSave,
  onCancel,
  onRemove,
}: {
  itemTitle: string;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const ctaColor = theme.name === 'dark' ? '#95683F' : '#A57A4B';
  return (
    <View style={{ gap: rs.sm }}>
      <Button
        size="lg"
        icon="check"
        style={{
          width: '100%',
          minHeight: Math.max(52, s(52)),
          borderRadius: Math.max(14, s(16)),
          backgroundColor: ctaColor,
        }}
        onPress={onSave}>
        {saveLabel}
      </Button>
      <View
        style={[
          styles.secondaryActions,
          {
            borderTopColor: theme.separator,
            gap: rs.sm,
            paddingTop: rs.sm,
          },
        ]}>
        <Button variant="ghost" style={styles.flex} onPress={onCancel}>
          Cancel
        </Button>
        <AgentTestId
          testID={AgentUiIds.travel.removeConfirm.open}
          label={`Remove ${itemTitle}`}
          onPress={onRemove}
          style={styles.removeAction}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${itemTitle}`}
            hitSlop={8}
            onPress={onRemove}
            style={({ pressed }) => [
              styles.removeAction,
              pressed ? styles.pressed : undefined,
            ]}>
            <Symbol name="delete" size="sm" color={theme.danger} />
            <AppText variant="callout" color="danger" fit>
              Remove
            </AppText>
          </Pressable>
        </AgentTestId>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  secondaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  flex: { flex: 1, minWidth: 0 },
  removeAction: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.6 },
});
