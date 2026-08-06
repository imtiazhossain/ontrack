import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
    Button,
    DateField,
    DestructiveSection,
    ErrorMessage,
    HeaderBackButton,
    Input,
} from '@/components/primitives';
import {
    itinerarySheetChrome,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import {
    TravelRemoveConfirmModal,
    type TravelRemoveConfirmPayload,
} from '@/features/travel/travel-remove-confirm-modal';
import { TravelScreenHeader } from '@/features/travel/travel-screen-header';
import {
    TravelSurfaceCard,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentUiIds } from '@/utils/agent-ui';

import { TravelPlanModePicker } from './travel-mode-picker';
import { TravelPlanCoverField } from './travel-plan-cover-field';
import type { TravelPlan, TravelPlanMode } from './types';

interface TravelPlanDetailsEditorProps {
  plan: TravelPlan;
  title: string;
  mode: TravelPlanMode;
  origin: string;
  destination: string;
  notes: string;
  startDate: string;
  endDate: string;
  coverUri?: string;
  error?: string;
  onTitleChange: (value: string) => void;
  onModeChange: (value: TravelPlanMode) => void;
  onOriginChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCoverUriChange: (uri: string | undefined) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  /** DEV: auto-open Trip Cover Photo picker. */
  initialCoverPickerOpen?: boolean;
}

/** Dedicated Edit Trip page matching the travel mock. */
export function TravelPlanDetailsEditor({
  plan,
  title,
  mode,
  origin,
  destination,
  notes,
  startDate,
  endDate,
  coverUri,
  error,
  onTitleChange,
  onModeChange,
  onOriginChange,
  onDestinationChange,
  onNotesChange,
  onStartDateChange,
  onEndDateChange,
  onCoverUriChange,
  onSave,
  onCancel,
  onDelete,
  initialCoverPickerOpen = false,
}: TravelPlanDetailsEditorProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const [removeConfirm, setRemoveConfirm] =
    useState<TravelRemoveConfirmPayload | null>(null);
  const openDeleteTrip = () => {
    setRemoveConfirm({
      title: 'Delete Trip?',
      message: `This action will permanently remove “${plan.title}”.`,
      actionLabel: 'Delete Trip',
      onConfirm: onDelete,
    });
  };
  const field = (tone: keyof typeof chrome.icons) => {
    const icon = chrome.icons[tone];
    return {
      iconBackground: icon.bg,
      iconColor: icon.fg,
      fieldBackground: theme.backgroundSunken,
      stackedLabelColor: chrome.label,
      placeholderColor: chrome.placeholder,
      placeholderTextColor: chrome.placeholder,
    };
  };

  const changeStartDate = (value: string) => {
    onStartDateChange(value);
    if (endDate < value) onEndDateChange(value);
  };

  return (
    <>
    <View style={[styles.page, { gap: rs.lg }]}>
      <TravelScreenHeader
        title="Edit Trip"
        subtitle="Update your journey details"
        leading={
          <HeaderBackButton
            compact
            accessibilityLabel="Back to trips"
            testID={AgentUiIds.travel.editTrip.cancel}
            onPress={onCancel}
          />
        }
      />

      <TravelSurfaceCard padding={0}>
        <View style={[styles.cardBody, { padding: rs.lg, gap: rs.lg }]}>
          <View style={{ gap: rs.md }}>
            <TravelPlanCoverField
              plan={plan}
              coverUri={coverUri}
              onCoverUriChange={onCoverUriChange}
              initialPickerOpen={initialCoverPickerOpen}
            />
            <View style={[styles.divider, { backgroundColor: chrome.fieldBorder }]} />
          </View>

          <View style={{ gap: rs.sm }}>
            <Input
              testID={AgentUiIds.travel.editTrip.title}
              value={title}
              onChangeText={onTitleChange}
              icon="flight"
              stackedLabel="Trip Name"
              placeholder="e.g. Birthday in Lisbon"
              accessibilityLabel="Trip Name"
              {...field('flight')}
            />
            <TravelPlanModePicker value={mode} onChange={onModeChange} />
            <Input
              testID={AgentUiIds.travel.editTrip.origin}
              value={origin}
              onChangeText={onOriginChange}
              icon="route"
              stackedLabel="Starting Point"
              placeholder="e.g. New York, NY (optional)"
              accessibilityLabel="Starting Point, optional"
              {...field('location')}
            />
            <Input
              testID={AgentUiIds.travel.editTrip.destination}
              value={destination}
              onChangeText={onDestinationChange}
              icon="location"
              stackedLabel="Destination"
              placeholder="e.g. Lisbon, Portugal"
              accessibilityLabel="Destination"
              {...field('location')}
            />
            <View style={[styles.dateRow, { gap: rs.sm }]}>
              <View style={styles.dateCol}>
                <DateField
                  testID={AgentUiIds.travel.editTrip.startDate}
                  value={startDate}
                  stackedLabel="Departure"
                  placeholder="Select date"
                  onChange={changeStartDate}
                  accessibilityLabel="Departure date"
                  {...field('calendar')}
                />
              </View>
              <View style={styles.dateCol}>
                <DateField
                  testID={AgentUiIds.travel.editTrip.endDate}
                  value={endDate}
                  stackedLabel="Return"
                  placeholder="Select date"
                  minimumDate={startDate}
                  onChange={onEndDateChange}
                  accessibilityLabel="Return date"
                  {...field('calendar')}
                />
              </View>
            </View>
            <Input
              testID={AgentUiIds.travel.editTrip.notes}
              value={notes}
              onChangeText={onNotesChange}
              icon="note"
              stackedLabel="Notes"
              placeholder="Ideas, budgets, must-dos…"
              multiline
              textAlignVertical="top"
              style={{ minHeight: Math.max(32, s(36)) }}
              accessibilityLabel="Notes"
              {...field('note')}
            />
          </View>

          {error ? <ErrorMessage message={error} selectable /> : null}

          <View style={[styles.actions, { gap: rs.lg }]}>
            <Button
              variant="primary"
              testID={AgentUiIds.travel.editTrip.save}
              accessibilityLabel="Save Details"
              onPress={onSave}>
              Save Details
            </Button>
            <DestructiveSection
              label="Delete Trip"
              description="Permanently removes this trip and its itinerary from this device."
              testID={AgentUiIds.travel.removeConfirm.open}
              accessibilityLabel={`Delete ${plan.title}`}
              onPress={openDeleteTrip}
            />
          </View>
        </View>
      </TravelSurfaceCard>
    </View>
    <TravelRemoveConfirmModal
      payload={removeConfirm}
      onCancel={() => setRemoveConfirm(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
  },
  cardBody: {},
  actions: {
    width: '100%',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  dateRow: {
    flexDirection: 'row',
  },
  dateCol: {
    flex: 1,
    minWidth: 0,
  },
});
