import { StyleSheet, View } from 'react-native';

import { Button, DestructiveSection, IconButton } from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

export function TravelDetailsCardActions({
  itemId,
  itemTitle,
  saveLabel,
  onSave,
  onCancel,
  onRemove,
}: {
  itemId: string;
  itemTitle: string;
  saveLabel: string;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const { spacing } = useResponsive();
  return (
    <View style={{ gap: spacing.lg }}>
      <View style={styles.closeRow}>
        <IconButton
          icon="close"
          testID={AgentUiIds.travel.detailsEditor.cancel(itemId)}
          accessibilityLabel={`Cancel editing ${itemTitle}`}
          onPress={onCancel}
          background={theme.backgroundSunken}
          borderColor={theme.separator}
        />
      </View>
      <Button
        variant="primary"
        icon="check"
        testID={AgentUiIds.travel.detailsEditor.save(itemId)}
        accessibilityLabel={saveLabel}
        onPress={onSave}>
        {saveLabel}
      </Button>
      <DestructiveSection
        label="Remove Item"
        testID={AgentUiIds.travel.detailsEditor.remove(itemId)}
        accessibilityLabel={`Remove ${itemTitle}`}
        onPress={onRemove}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  closeRow: { width: '100%', flexDirection: 'row', justifyContent: 'flex-end' },
});
