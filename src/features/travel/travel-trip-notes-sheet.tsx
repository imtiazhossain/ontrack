import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Input } from '@/components/primitives';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import { useAutoGrowingNote } from '@/features/travel/use-auto-growing-note';
import { useResponsive } from '@/hooks/use-responsive';
import { AgentUiIds } from '@/utils/agent-ui';

/** Silent cap for trip notes (no counter in the UI). */
const TRIP_NOTES_MAX_LENGTH = 2000;

interface TravelTripNotesSheetProps {
  visible: boolean;
  tripTitle: string;
  notes: string;
  onClose: () => void;
  onSave: (notes: string | undefined) => void;
}

/** Travel-themed sheet for editing freeform trip notes on plan detail. */
export function TravelTripNotesSheet({
  visible,
  tripTitle,
  notes,
  onClose,
  onSave,
}: TravelTripNotesSheetProps) {
  const { spacing, s } = useResponsive();
  const [draft, setDraft] = useState(notes);
  const [draftSource, setDraftSource] = useState(notes);
  const minHeight = Math.max(96, s(108));
  const growing = useAutoGrowingNote(draft, minHeight);
  const draftIsCurrent = draftSource === notes;
  const trimmedDraft = draft.trim();
  const trimmedSaved = notes.trim();
  const hasChanges = draftIsCurrent && trimmedDraft !== trimmedSaved;

  useEffect(() => {
    if (!visible) return;
    setDraft(notes);
    setDraftSource(notes);
  }, [notes, visible]);

  const save = () => {
    if (!draftIsCurrent || !hasChanges) return;
    onSave(trimmedDraft || undefined);
  };

  return (
    <TravelSheetModal
      visible={visible}
      eyebrow="Trip notes"
      title="Edit Notes"
      subtitle={tripTitle}
      onClose={onClose}
      closeAccessibilityLabel="Close trip notes"
      closeTestID={AgentUiIds.travel.planNotes.close}
      footer={
        <Button
          variant="primary"
          shape="rounded"
          icon="check"
          onPress={save}
          disabled={!hasChanges}
          accessibilityLabel="Save trip notes"
          testID={AgentUiIds.travel.planNotes.save}>
          Save Notes
        </Button>
      }>
      <View style={{ gap: spacing.md }}>
        <Input
          testID={AgentUiIds.travel.planNotes.field}
          value={draft}
          onChangeText={(next) => {
            const capped = next.slice(0, TRIP_NOTES_MAX_LENGTH);
            growing.collapseWhenEmpty(capped);
            setDraft(capped);
          }}
          onContentSizeChange={growing.onContentSizeChange}
          stackedLabel="Notes"
          placeholder="Ideas, budgets, must-dos…"
          multiline
          textAlignVertical="top"
          style={[{ minHeight }, growing.style]}
          accessibilityLabel="Notes"
        />
      </View>
    </TravelSheetModal>
  );
}
