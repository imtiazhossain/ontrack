import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText, DateField, ErrorMessage, Input } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import {
    itinerarySheetChrome,
    travelInputFieldBackground,
} from '@/features/travel/travel-itinerary-sheet-chrome';
import { travelDialogPalette } from '@/features/travel/travel-dialog-chrome';
import { TravelSheetIconControl } from '@/features/travel/travel-list-actions';
import {
    TravelRemoveConfirmModal,
    type TravelRemoveConfirmPayload,
} from '@/features/travel/travel-remove-confirm-modal';
import {
  TravelSurfaceCard,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { AgentTestId, AgentUiIds } from '@/utils/agent-ui';
import { haptics } from '@/utils/haptics';

import { TravelPlanCoverField } from './travel-plan-cover-field';
import type { TravelPlan } from './types';

interface TravelPlanDetailsEditorProps {
  plan: TravelPlan;
  title: string;
  destination: string;
  notes: string;
  startDate: string;
  endDate: string;
  coverUri?: string;
  error?: string;
  onTitleChange: (value: string) => void;
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
  destination,
  notes,
  startDate,
  endDate,
  coverUri,
  error,
  onTitleChange,
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
  const dialog = travelDialogPalette(theme);
  const { s, spacing: rs, layout, typography } = useResponsive();
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
      fieldBackground: travelInputFieldBackground(theme),
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
      <View style={[styles.header, { gap: rs.md }]}>
        <View style={{ paddingTop: rs.xs }}>
          <TravelSheetIconControl
            icon="back"
            size={40}
            tone="accent"
            accessibilityLabel="Back to trips"
            onPress={onCancel}
          />
        </View>
        <View style={styles.headerCopy}>
          {/*
            Display serif is clipped by RN Text’s line box on iOS. Keep the
            lineHeight at the font size and add explicit top padding so
            ascenders sit inside the layout box (not above it).
          */}
          <Text
            allowFontScaling={false}
            style={[
              styles.title,
              {
                color: chrome.title,
                fontSize: Math.max(32, s(34)),
                lineHeight: Math.max(32, s(34)),
                paddingTop: Math.max(10, s(12)),
                paddingBottom: Math.max(2, s(2)),
              },
            ]}>
            Edit Trip
          </Text>
          <Text
            allowFontScaling
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            style={[
              styles.subtitle,
              {
                color: chrome.subtitle,
                fontSize: Math.max(15, s(16)),
                lineHeight: Math.max(20, s(21)),
              },
            ]}>
            Update your journey details
          </Text>
        </View>
      </View>

      <TravelSurfaceCard stripe padding={0}>
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
              value={title}
              onChangeText={onTitleChange}
              icon="flight"
              stackedLabel="Trip Name"
              placeholder="e.g. Birthday in Lisbon"
              accessibilityLabel="Trip Name"
              {...field('flight')}
            />
            <Input
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

          <View style={[styles.actions, { gap: rs.sm }]}>
            <View style={{ gap: rs.sm }}>
              <AgentTestId
                testID={AgentUiIds.travel.editTrip.save}
                label="Save Details"
                onPress={onSave}
                style={styles.actionTarget}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save Details"
                  onPress={() => {
                    haptics.tap();
                    onSave();
                  }}
                  style={({ pressed }) => [
                    styles.saveWrap,
                    styles.compactAction,
                    {
                      opacity: pressed ? 0.88 : 1,
                      minHeight: Math.max(layout.minTapTarget, s(52)),
                    },
                  ]}>
                  <LinearGradient
                    colors={[chrome.ctaFrom, chrome.ctaTo]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={[
                      styles.saveGradient,
                      {
                        minHeight: Math.max(layout.minTapTarget, s(52)),
                        paddingHorizontal: rs.lg,
                      },
                    ]}>
                    <AppText
                      variant="callout"
                      fit
                      numberOfLines={1}
                      style={[
                        styles.saveLabel,
                        { color: chrome.ctaText, fontSize: typography.callout.fontSize },
                      ]}>
                      Save Details
                    </AppText>
                  </LinearGradient>
                </Pressable>
              </AgentTestId>

            </View>

            <View style={[styles.secondaryActions, { gap: rs.sm }]}>
              <AgentTestId
                testID={AgentUiIds.travel.editTrip.cancel}
                label="Cancel edit trip"
                onPress={onCancel}
                style={styles.actionTarget}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  onPress={onCancel}
                  style={({ pressed }) => [
                    styles.compactButton,
                    styles.compactAction,
                    {
                      minHeight: Math.max(layout.minTapTarget, s(52)),
                      borderColor: dialog.outlineBorder,
                      backgroundColor: dialog.outlineBg,
                      paddingHorizontal: rs.lg,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}>
                  <AppText
                    variant="callout"
                    fit
                    numberOfLines={1}
                    style={[styles.cancelLabel, { color: dialog.cancelText }]}>
                    Cancel
                  </AppText>
                </Pressable>
              </AgentTestId>

              <AgentTestId
                testID={AgentUiIds.travel.removeConfirm.open}
                label={`Delete ${plan.title}`}
                onPress={openDeleteTrip}
                style={styles.actionTarget}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${plan.title}`}
                  onPress={openDeleteTrip}
                  style={({ pressed }) => [
                    styles.compactButton,
                    styles.compactAction,
                    {
                      minHeight: Math.max(layout.minTapTarget, s(52)),
                      borderColor: dialog.dangerTo,
                      backgroundColor: dialog.dangerFrom,
                      paddingHorizontal: rs.lg,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}>
                  <AppText
                    variant="callout"
                    fit
                    numberOfLines={1}
                    style={[styles.deleteLabel, { color: dialog.dangerText }]}>
                    Delete Trip
                  </AppText>
                </Pressable>
              </AgentTestId>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerCopy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
    letterSpacing: -0.65,
  },
  subtitle: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
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
  saveWrap: {
    width: '100%',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  saveGradient: {
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
  secondaryActions: {
    alignItems: 'center',
  },
  actionTarget: {
    width: '100%',
    alignItems: 'center',
  },
  compactAction: {
    alignSelf: 'center',
    width: '72%',
    maxWidth: 260,
  },
  compactButton: {
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '600',
  },
  deleteLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '400',
  },
});
