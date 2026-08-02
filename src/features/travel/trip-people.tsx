import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorMessage,
  Input,
  Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import type {
  TravelParticipant,
  TravelTripRosterPerson,
} from '@/features/travel/types';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { TravelSurfaceCard } from '@/features/travel/travel-surface';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export type TripHostPerson = {
  name: string;
  email?: string;
  isSelf?: boolean;
};

export type TripFriendTarget =
  | { kind: 'host' }
  | { kind: 'roster'; member: TravelTripRosterPerson }
  | { kind: 'participant'; participant: TravelParticipant };

interface TripPeopleProps {
  host?: TripHostPerson;
  participants: TravelParticipant[];
  /** Accepted members from the server roster (excludes host). */
  rosterMembers?: TravelTripRosterPerson[];
  /** When false, hide invite/remove/transfer controls (member read-only). */
  canManage?: boolean;
  editing: boolean;
  name: string;
  email: string;
  error?: string;
  inviting: boolean;
  /** When false, omit the Friends section header (e.g. sheet already titles the surface). */
  showHeader?: boolean;
  /** When false, Invite is expected in the sheet footer instead. */
  showInviteButton?: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onBeginInvite: () => void;
  onCancelInvite: () => void;
  onInvite: () => void;
  managingParticipantId?: string;
  transferringUserId?: string;
  onResend: (participant: TravelParticipant) => void;
  onRemove: (participant: TravelParticipant) => void;
  onRemoveRosterMember?: (member: TravelTripRosterPerson) => void;
  onMakeHost?: (member: TravelTripRosterPerson) => void;
  onMakeHostParticipant?: (participant: TravelParticipant) => void;
  onRenameHost?: (name: string) => void;
  onRenameParticipant?: (participant: TravelParticipant, name: string) => void;
  onRenameRosterMember?: (member: TravelTripRosterPerson, name: string) => void;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function targetKey(target: TripFriendTarget): string {
  if (target.kind === 'host') return 'host';
  if (target.kind === 'roster') return `roster:${target.member.userId}`;
  return `participant:${target.participant.id}`;
}

function FriendActionChip({
  label,
  danger,
  disabled,
  onPress,
}: {
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: theme.backgroundElevated,
          borderColor: theme.separator,
          minHeight: Math.max(32, s(32)),
          paddingHorizontal: rs.sm,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}>
      <AppText
        variant="caption"
        color={danger ? 'danger' : 'primary'}
        fit
        numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

function FriendRow({
  displayName,
  badge,
  busy,
  canOpenMenu,
  expanded,
  showDivider,
  showMakeHost,
  showResend,
  showRemove,
  renaming,
  renameDraft,
  onRenameDraftChange,
  onPress,
  onUpdateName,
  onMakeHost,
  onResend,
  onRemove,
  onSaveRename,
  onCancelRename,
}: {
  displayName: string;
  badge?: 'host' | 'pending';
  busy?: boolean;
  canOpenMenu: boolean;
  expanded?: boolean;
  showDivider?: boolean;
  showMakeHost?: boolean;
  showResend?: boolean;
  showRemove?: boolean;
  renaming?: boolean;
  renameDraft?: string;
  onRenameDraftChange?: (value: string) => void;
  onPress?: () => void;
  onUpdateName?: () => void;
  onMakeHost?: () => void;
  onResend?: () => void;
  onRemove?: () => void;
  onSaveRename?: () => void;
  onCancelRename?: () => void;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const header = (
    <View style={styles.personHeader}>
      <View style={[styles.avatar, { backgroundColor: theme.backgroundSunken }]}>
        <AppText variant="callout" color="accent">
          {initials(displayName)}
        </AppText>
      </View>
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
      {canOpenMenu && onPress ? (
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
        <View style={[styles.inlineActions, { marginLeft: AVATAR + rs.md }]}>
          <FriendActionChip
            label="Update Name"
            disabled={busy}
            onPress={() => onUpdateName?.()}
          />
          {showMakeHost ? (
            <FriendActionChip
              label="Make Host"
              disabled={busy}
              onPress={() => onMakeHost?.()}
            />
          ) : null}
          {showResend ? (
            <FriendActionChip
              label="Resend"
              disabled={busy}
              onPress={() => onResend?.()}
            />
          ) : null}
          {showRemove ? (
            <FriendActionChip
              label="Remove"
              danger
              disabled={busy}
              onPress={() => onRemove?.()}
            />
          ) : null}
        </View>
      ) : null}

      {renaming ? (
        <View style={[styles.renameInline, { marginLeft: AVATAR + rs.md }]}>
          <Input
            label="Name"
            value={renameDraft ?? ''}
            onChangeText={onRenameDraftChange}
            placeholder="Friend’s name"
            autoCapitalize="words"
            autoFocus
          />
          <View style={styles.actions}>
            <Button
              disabled={!renameDraft?.trim()}
              onPress={() => onSaveRename?.()}
              accessibilityLabel="Save name">
              Save
            </Button>
            <Button variant="ghost" onPress={() => onCancelRename?.()}>
              Cancel
            </Button>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function TripPeople({
  host,
  participants,
  rosterMembers = [],
  canManage = true,
  editing,
  name,
  email,
  error,
  inviting,
  showHeader = true,
  showInviteButton = true,
  onNameChange,
  onEmailChange,
  onBeginInvite,
  onCancelInvite,
  onInvite,
  managingParticipantId,
  transferringUserId,
  onResend,
  onRemove,
  onRemoveRosterMember,
  onMakeHost,
  onMakeHostParticipant,
  onRenameHost,
  onRenameParticipant,
  onRenameRosterMember,
}: TripPeopleProps) {
  const [menu, setMenu] = useState<{
    target: TripFriendTarget;
    name: string;
    accepted: boolean;
  }>();
  const [renaming, setRenaming] = useState<TripFriendTarget>();
  const [renameDraft, setRenameDraft] = useState('');
  const pending = participants.filter((person) => !person.acceptedAt);
  const localAccepted = participants.filter((person) => person.acceptedAt);
  const rosterEmails = new Set(
    rosterMembers
      .map((person) => person.email?.toLowerCase())
      .filter((value): value is string => Boolean(value)),
  );
  const acceptedWithoutRoster = localAccepted.filter((person) => {
    const emailKey = person.email?.toLowerCase();
    return !emailKey || !rosterEmails.has(emailKey);
  });
  const hasPeople =
    Boolean(host) ||
    rosterMembers.length > 0 ||
    localAccepted.length > 0 ||
    pending.length > 0;

  const closePanels = () => {
    setMenu(undefined);
    setRenaming(undefined);
    setRenameDraft('');
  };

  const beginRename = (target: TripFriendTarget, currentName: string) => {
    setMenu({ target, name: currentName, accepted: true });
    setRenaming(target);
    setRenameDraft(currentName);
  };

  const saveRename = () => {
    const next = renameDraft.trim();
    if (!next || !renaming) return;
    if (renaming.kind === 'host') onRenameHost?.(next);
    else if (renaming.kind === 'roster') onRenameRosterMember?.(renaming.member, next);
    else onRenameParticipant?.(renaming.participant, next);
    closePanels();
  };

  const toggleMenu = (target: TripFriendTarget, currentName: string, accepted: boolean) => {
    if (!canManage) return;
    if (menu && targetKey(menu.target) === targetKey(target) && !renaming) {
      setMenu(undefined);
      return;
    }
    setRenaming(undefined);
    setRenameDraft('');
    setMenu({ target, name: currentName, accepted });
  };

  const isExpanded = (target: TripFriendTarget) =>
    Boolean(menu && targetKey(menu.target) === targetKey(target));

  const isRenaming = (target: TripFriendTarget) =>
    Boolean(renaming && targetKey(renaming) === targetKey(target));

  const hostLabel = host
    ? host.isSelf && !/^you$/i.test(host.name.trim())
      ? `${host.name.trim()} (You)`
      : host.name.trim() || 'Host'
    : '';

  const rowCount =
    (host ? 1 : 0) +
    rosterMembers.length +
    acceptedWithoutRoster.length +
    pending.length;
  let rowIndex = 0;

  return (
    <View style={styles.container}>
      {showHeader && rowCount > 0 ? (
        <AppText variant="overline" color="tertiary" style={travelOverlineStyle} fit>
          Friends
        </AppText>
      ) : null}

      {rowCount > 0 ? (
        <TravelSurfaceCard bodyStyle={styles.list} padding={0}>
          {host ? (
            <View style={styles.rowPad}>
              <FriendRow
                displayName={hostLabel}
                badge="host"
                canOpenMenu={canManage && Boolean(onRenameHost)}
                expanded={isExpanded({ kind: 'host' })}
                showDivider={++rowIndex < rowCount}
                renaming={isRenaming({ kind: 'host' })}
                renameDraft={isRenaming({ kind: 'host' }) ? renameDraft : undefined}
                onRenameDraftChange={setRenameDraft}
                onPress={() =>
                  toggleMenu({ kind: 'host' }, host.name.trim() || hostLabel, true)
                }
                onUpdateName={() =>
                  beginRename({ kind: 'host' }, host.name.trim() || hostLabel)
                }
                onSaveRename={saveRename}
                onCancelRename={closePanels}
              />
            </View>
          ) : null}
          {rosterMembers.map((member) => {
            const target: TripFriendTarget = { kind: 'roster', member };
            const busy = transferringUserId === member.userId;
            const showDivider = ++rowIndex < rowCount;
            return (
              <View key={member.userId} style={styles.rowPad}>
                <FriendRow
                  displayName={member.displayName}
                  busy={busy}
                  canOpenMenu={canManage}
                  expanded={isExpanded(target)}
                  showDivider={showDivider}
                  showMakeHost
                  showRemove
                  renaming={isRenaming(target)}
                  renameDraft={isRenaming(target) ? renameDraft : undefined}
                  onRenameDraftChange={setRenameDraft}
                  onPress={() => toggleMenu(target, member.displayName, true)}
                  onUpdateName={() => beginRename(target, member.displayName)}
                  onMakeHost={() => {
                    setMenu(undefined);
                    onMakeHost?.(member);
                  }}
                  onRemove={() => {
                    setMenu(undefined);
                    onRemoveRosterMember?.(member);
                  }}
                  onSaveRename={saveRename}
                  onCancelRename={closePanels}
                />
              </View>
            );
          })}
          {acceptedWithoutRoster.map((person) => {
            const target: TripFriendTarget = {
              kind: 'participant',
              participant: person,
            };
            const busy =
              managingParticipantId === person.id ||
              transferringUserId === person.id;
            const showDivider = ++rowIndex < rowCount;
            return (
              <View key={person.id} style={styles.rowPad}>
                <FriendRow
                  displayName={person.name}
                  busy={busy}
                  canOpenMenu={canManage}
                  expanded={isExpanded(target)}
                  showDivider={showDivider}
                  showMakeHost
                  showRemove
                  renaming={isRenaming(target)}
                  renameDraft={isRenaming(target) ? renameDraft : undefined}
                  onRenameDraftChange={setRenameDraft}
                  onPress={() => toggleMenu(target, person.name, true)}
                  onUpdateName={() => beginRename(target, person.name)}
                  onMakeHost={() => {
                    setMenu(undefined);
                    onMakeHostParticipant?.(person);
                  }}
                  onRemove={() => {
                    setMenu(undefined);
                    onRemove(person);
                  }}
                  onSaveRename={saveRename}
                  onCancelRename={closePanels}
                />
              </View>
            );
          })}
          {pending.map((person) => {
            const target: TripFriendTarget = {
              kind: 'participant',
              participant: person,
            };
            const busy = managingParticipantId === person.id;
            const showDivider = ++rowIndex < rowCount;
            return (
              <View key={person.id} style={styles.rowPad}>
                <FriendRow
                  displayName={person.name}
                  badge="pending"
                  busy={busy}
                  canOpenMenu={canManage}
                  expanded={isExpanded(target)}
                  showDivider={showDivider}
                  showResend
                  showRemove
                  renaming={isRenaming(target)}
                  renameDraft={isRenaming(target) ? renameDraft : undefined}
                  onRenameDraftChange={setRenameDraft}
                  onPress={() => toggleMenu(target, person.name, false)}
                  onUpdateName={() => beginRename(target, person.name)}
                  onResend={() => {
                    setMenu(undefined);
                    onResend(person);
                  }}
                  onRemove={() => {
                    setMenu(undefined);
                    onRemove(person);
                  }}
                  onSaveRename={saveRename}
                  onCancelRename={closePanels}
                />
              </View>
            );
          })}
        </TravelSurfaceCard>
      ) : null}

      {!hasPeople && !editing ? (
        <AppText variant="body" color="secondary">
          {canManage
            ? 'No friends are on this trip yet. Invite someone to start planning together.'
            : 'Trip friends will show up here once everyone has joined.'}
        </AppText>
      ) : null}

      {canManage && editing ? (
        <Card style={styles.form}>
          <AppText variant="subheading" fit>
            Invite a Friend
          </AppText>
          <Input
            label="Name"
            value={name}
            onChangeText={onNameChange}
            placeholder="Friend’s name"
            autoCapitalize="words"
          />
          <Input
            label="onTrack account email"
            value={email}
            onChangeText={onEmailChange}
            placeholder="friend@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AppText variant="caption" color="secondary">
            Only this signed-in account can open and view the trip.
          </AppText>
          {error ? <ErrorMessage message={error} selectable /> : null}
          <View style={styles.actions}>
            <Button disabled={inviting} onPress={onInvite}>
              {inviting ? 'Creating invite…' : 'Create Invite'}
            </Button>
            <Button variant="ghost" disabled={inviting} onPress={onCancelInvite}>
              Cancel
            </Button>
          </View>
        </Card>
      ) : null}

      {canManage && showInviteButton && !editing ? (
        <Button icon="invite" onPress={onBeginInvite}>
          Invite a Friend
        </Button>
      ) : null}
    </View>
  );
}

const AVATAR = 42;

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  list: { gap: 0 },
  rowPad: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  person: {
    gap: spacing.xs,
  },
  personHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameColumn: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
    height: AVATAR,
    justifyContent: 'center',
  },
  friendName: {
    width: '100%',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  chip: {
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.pill,
  },
  renameInline: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  form: { gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
