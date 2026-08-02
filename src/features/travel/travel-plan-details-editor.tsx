import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText, DateField, ErrorMessage, Input, Symbol } from '@/components/primitives';
import { fontFamilies, radii, spacing } from '@/design-system';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import { TravelSheetIconControl } from '@/features/travel/travel-list-actions';
import {
  TravelSurfaceCard,
} from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

import type { TravelPlanDetailsDraft } from './travel-plan-details';
import type { TravelPlan } from './types';
import { TravelPlanCoverField } from './travel-plan-cover-field';

interface TravelPlanDetailsEditorProps extends Omit<TravelPlanDetailsDraft, 'notes'> {
  plan: TravelPlan;
  startDate: string;
  endDate: string;
  coverUri?: string;
  error?: string;
  onTitleChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onCoverUriChange: (uri: string | undefined) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

/** Dedicated Edit Trip page matching the travel mock. */
export function TravelPlanDetailsEditor({
  plan,
  title,
  destination,
  startDate,
  endDate,
  coverUri,
  error,
  onTitleChange,
  onDestinationChange,
  onStartDateChange,
  onEndDateChange,
  onCoverUriChange,
  onSave,
  onCancel,
  onDelete,
}: TravelPlanDetailsEditorProps) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs, layout, typography } = useResponsive();
  const field = (tone: keyof typeof chrome.icons) => {
    const icon = chrome.icons[tone];
    return {
      iconBackground: icon.bg,
      iconColor: icon.fg,
      fieldBackground: chrome.fieldBg,
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
          </View>

          {error ? <ErrorMessage message={error} selectable /> : null}

          <View style={{ gap: rs.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Details"
              onPress={() => {
                haptics.tap();
                onSave();
              }}
              style={({ pressed }) => [
                styles.saveWrap,
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  minHeight: Math.max(layout.minTapTarget, s(52)),
                  borderColor: chrome.fieldBorder,
                  backgroundColor:
                    theme.name === 'light' ? '#FFFFFF' : chrome.fieldBg,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}>
              <AppText
                variant="callout"
                fit
                numberOfLines={1}
                style={[styles.cancelLabel, { color: chrome.title }]}>
                Cancel
              </AppText>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${plan.title}`}
            hitSlop={8}
            onPress={() =>
              confirmDestructiveAction({
                title: 'Delete Trip?',
                message: `Remove “${plan.title}”?`,
                onConfirm: onDelete,
              })
            }
            style={({ pressed }) => [
              styles.deleteAction,
              { gap: rs.xs, opacity: pressed ? 0.7 : 1 },
            ]}>
            <Symbol name="delete" size="sm" color={theme.danger} />
            <AppText
              style={[styles.deleteLabel, { color: theme.danger }]}
              fit
              numberOfLines={1}>
              Delete Trip
            </AppText>
          </Pressable>
        </View>
      </TravelSurfaceCard>
    </View>
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
    fontWeight: '600',
  },
  cancelBtn: {
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: fontFamilies.serif,
    fontWeight: '600',
  },
  deleteAction: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deleteLabel: {
    fontFamily: fontFamilies.serif,
    fontSize: 15,
    fontWeight: '500',
  },
});
