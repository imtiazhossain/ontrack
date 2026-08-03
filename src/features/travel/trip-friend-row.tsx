import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Input,
  Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import { ProfileAvatar } from '@/features/account/profile-avatar';
import type {
  TravelParticipant,
  TravelTripRosterPerson,
} from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

/** Matches the default trip-roster avatar plate used in static layout styles. */
const AVATAR = 42;

export type TripFriendTarget =
  | { kind: 'host' }
  | { kind: 'roster'; member: TravelTripRosterPerson }
  | { kind: 'participant'; participant: TravelParticipant };

export function tripFriendTargetKey(target: TripFriendTarget): string {
  if (target.kind === 'host') return 'host';
  if (target.kind === 'roster') return `roster:${target.member.userId}`;
  return `participant:${target.participant.id}`;
}

function FriendActionChip({
  label,
  accessibilityLabel,
  danger,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.separator,
          minHeight: Math.max(32, s(32)),
          paddingHorizontal: Math.max(6, rs.xs),
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}>
      <AppText
        variant="callout"
        color={danger ? 'danger' : 'primary'}
        numberOfLines={1}
        style={styles.chipLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TripFriendRow({
  displayName,
  userId,
  isSelf,
  badge,
  busy,
  canOpenMenu,
  expanded,
  showDivider,
  showMakeHost,
  showMakeCohost,
  showRemoveCohost,
  showResend,
  showRemove,
  selfOnlyMenu,
  renaming,
  renameDraft,
  onRenameDraftChange,
  onPress,
  onUpdateName,
  onMakeHost,
  onMakeCohost,
  onRemoveCohost,
  onResend,
  onRemove,
  onSaveRename,
  onCancelRename,
}: {
  displayName: string;
  userId?: string;
  isSelf?: boolean;
  badge?: 'host' | 'cohost' | 'pending';
  busy?: boolean;
  canOpenMenu: boolean;
  expanded?: boolean;
  showDivider?: boolean;
  showMakeHost?: boolean;
  showMakeCohost?: boolean;
  showRemoveCohost?: boolean;
  showResend?: boolean;
  showRemove?: boolean;
  /** Only Rename — used when the row is you but you can’t manage the trip. */
  selfOnlyMenu?: boolean;
  renaming?: boolean;
  renameDraft?: string;
  onRenameDraftChange?: (value: string) => void;
  onPress?: () => void;
  onUpdateName?: () => void;
  onMakeHost?: () => void;
  onMakeCohost?: () => void;
  onRemoveCohost?: () => void;
  onResend?: () => void;
  onRemove?: () => void;
  onSaveRename?: () => void;
  onCancelRename?: () => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const avatarLabel = (renaming ? renameDraft : displayName)?.trim() || displayName;
  // "(You)" is chrome on the name row — never feed it to initials.
  const avatarName =
    avatarLabel.replace(/\s*\(You\)\s*$/i, '').trim() || avatarLabel;
  const avatarSize = Math.max(40, s(42));
  const header = (
    <View
      style={[
        styles.personHeader,
        renaming ? styles.personHeaderEditing : null,
      ]}>
      <ProfileAvatar
        displayName={avatarName}
        userId={userId}
        isSelf={isSelf}
        size={avatarSize}
      />
      {renaming ? (
        <View style={styles.renameRow}>
          <View style={styles.renameField}>
            <Input
              value={renameDraft ?? ''}
              onChangeText={onRenameDraftChange}
              placeholder="Friend’s name"
              autoCapitalize="words"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => {
                if (renameDraft?.trim()) onSaveRename?.();
              }}
              accessibilityLabel="Friend name"
              style={{
                minHeight: Math.max(44, s(44)),
                paddingVertical: rs.sm,
                paddingHorizontal: rs.md,
                borderRadius: radii.md,
              }}
            />
            <View style={styles.renameActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save name"
                disabled={busy || !renameDraft?.trim()}
                hitSlop={6}
                onPress={() => onSaveRename?.()}
                style={({ pressed }) => [
                  styles.renameAction,
                  {
                    backgroundColor: theme.accentPrimary,
                    minHeight: Math.max(36, s(36)),
                    paddingHorizontal: rs.md,
                    opacity: busy || !renameDraft?.trim() ? 0.45 : pressed ? 0.75 : 1,
                  },
                ]}>
                <AppText variant="callout" color="onAccent" fit>
                  Save
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel rename"
                disabled={busy}
                hitSlop={6}
                onPress={() => onCancelRename?.()}
                style={({ pressed }) => [
                  styles.renameAction,
                  {
                    minHeight: Math.max(36, s(36)),
                    paddingHorizontal: rs.sm,
                    opacity: busy ? 0.45 : pressed ? 0.7 : 1,
                  },
                ]}>
                <AppText variant="callout" fit>
                  Cancel
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.nameColumn}>
            <AppText variant="subheading" fit numberOfLines={1} style={styles.friendName}>
              {displayName}
            </AppText>
          </View>
          {badge === 'host' ? (
            <View
              style={[
                styles.status,
                {
                  backgroundColor: theme.accentFaint,
                  minHeight: Math.max(28, s(28)),
                },
              ]}>
              <AppText variant="caption" color="accent" fit>
                Host
              </AppText>
            </View>
          ) : null}
          {badge === 'cohost' ? (
            <View
              style={[
                styles.status,
                {
                  backgroundColor: theme.backgroundSunken,
                  minHeight: Math.max(28, s(28)),
                },
              ]}>
              <AppText variant="caption" color="secondary" fit>
                Co-host
              </AppText>
            </View>
          ) : null}
          {badge === 'pending' ? (
            <View style={[styles.status, { backgroundColor: theme.backgroundSunken }]}>
              <Symbol name="clock" size="sm" color={theme.textTertiary} />
              <AppText variant="caption" color="secondary" fit>
                Pending
              </AppText>
            </View>
          ) : null}
          {canOpenMenu ? (
            <Symbol name="chevron-right" size="sm" color={theme.textTertiary} />
          ) : null}
        </>
      )}
    </View>
  );

  return (
    <View
      style={[
        styles.person,
        showDivider
          ? {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.separator,
            }
          : null,
      ]}>
      {canOpenMenu && onPress && !renaming ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${displayName}, manage`}
          accessibilityState={{ expanded: Boolean(expanded) }}
          disabled={busy}
          onPress={onPress}
          style={({ pressed }) => [{ opacity: busy ? 0.5 : pressed ? 0.72 : 1 }]}>
          {header}
        </Pressable>
      ) : (
        header
      )}

      {expanded && !renaming ? (
        <View style={styles.inlineActions}>
          <FriendActionChip
            label="Rename"
            accessibilityLabel="Update name"
            disabled={busy}
            onPress={() => onUpdateName?.()}
          />
          {!selfOnlyMenu && showMakeCohost ? (
            <FriendActionChip
              label="Co-host"
              accessibilityLabel="Make co-host"
              disabled={busy}
              onPress={() => onMakeCohost?.()}
            />
          ) : null}
          {!selfOnlyMenu && showRemoveCohost ? (
            <FriendActionChip
              label="Demote"
              accessibilityLabel="Remove co-host"
              disabled={busy}
              onPress={() => onRemoveCohost?.()}
            />
          ) : null}
          {!selfOnlyMenu && showMakeHost ? (
            <FriendActionChip
              label="Host"
              accessibilityLabel="Make host"
              disabled={busy}
              onPress={() => onMakeHost?.()}
            />
          ) : null}
          {!selfOnlyMenu && showResend ? (
            <FriendActionChip
              label="Resend"
              disabled={busy}
              onPress={() => onResend?.()}
            />
          ) : null}
          {!selfOnlyMenu && showRemove ? (
            <FriendActionChip
              label="Remove"
              danger
              disabled={busy}
              onPress={() => onRemove?.()}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  chip: {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  chipLabel: {
    textAlign: 'center',
  },
  friendName: {
    width: '100%',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    width: '100%',
  },
  nameColumn: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    height: AVATAR,
    justifyContent: 'center',
  },
  person: {
    gap: spacing.xs,
  },
  personHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  personHeaderEditing: {
    alignItems: 'flex-start',
  },
  renameAction: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    flexShrink: 0,
  },
  renameActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'nowrap',
    gap: spacing.sm,
    width: '100%',
  },
  renameField: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    gap: spacing.sm,
  },
  renameRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});

