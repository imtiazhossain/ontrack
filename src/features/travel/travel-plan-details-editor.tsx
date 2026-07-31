import { StyleSheet, View } from 'react-native';

import { Button, ErrorMessage, Input } from '@/components/primitives';
import { spacing } from '@/design-system';

import type { TravelPlanDetailsDraft } from './travel-plan-details';

interface TravelPlanDetailsEditorProps extends TravelPlanDetailsDraft {
  error?: string;
  onTitleChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function TravelPlanDetailsEditor({
  title,
  destination,
  notes,
  error,
  onTitleChange,
  onDestinationChange,
  onNotesChange,
  onSave,
  onCancel,
}: TravelPlanDetailsEditorProps) {
  return (
    <View style={styles.editor}>
      <Input
        label="Trip Name"
        value={title}
        onChangeText={onTitleChange}
        placeholder="Birthday in Lisbon"
      />
      <Input
        label="Destination"
        value={destination}
        onChangeText={onDestinationChange}
        placeholder="Lisbon, Portugal"
      />
      <Input
        label="Notes"
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Ideas, budget, lodging, and anything the group should know…"
        multiline
        style={styles.notes}
      />
      {error ? <ErrorMessage message={error} selectable /> : null}
      <View style={styles.actions}>
        <Button onPress={onSave} style={styles.flex}>Save Details</Button>
        <Button variant="ghost" onPress={onCancel} style={styles.flex}>Cancel</Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: spacing.md },
  notes: { minHeight: 88, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
