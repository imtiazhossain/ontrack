import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorMessage,
  Input,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import type {
  TravelParticipant,
  TravelTripRosterPerson,
} from '@/features/travel/types';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { TravelSurfaceCard } from '@/features/travel/travel-surface';
import {
  TripFriendRow,
  tripFriendTargetKey,
  type TripFriendTarget,
} from '@/features/travel/trip-friend-row';
import { useTheme } from '@/hooks/use-theme';

export type TripHostPerson = {
  name: string;
  email?: string;
  isSelf?: boolean;
  userId?: string;
};

export type { TripFriendTarget };

interface TripPeopleProps {
  host?: TripHostPerson;
  participants: TravelParticipant[];
  /** Accepted members from the server roster (excludes host). */
  rosterMembers?: TravelTripRosterPerson[];
  /** Signed-in user id — marks “you” in the roster for self-rename. */
  selfUserId?: string;
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
  /** Sole host can transfer host / grant co-host. */
  canPromoteHost?: boolean;
  onMakeHost?: (member: TravelTripRosterPerson) => void;
  onMakeHostParticipant?: (participant: TravelParticipant) => void;
  onMakeCohost?: (member: TravelTripRosterPerson) => void;
  onRemoveCohost?: (member: TravelTripRosterPerson) => void;
  onRenameHost?: (name: string) => void;
  /** Rename the signed-in user’s own display name (any role). */
  onRenameSelf?: (name: string) => void;
  onRenameParticipant?: (participant: TravelParticipant, name: string) => void;
  onRenameRosterMember?: (member: TravelTripRosterPerson, name: string) => void;
}

export function TripPeople({
  host,
  participants,
  rosterMembers = [],
  selfUserId,
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
  canPromoteHost = false,
  onMakeHost,
  onMakeHostParticipant,
  onMakeCohost,
  onRemoveCohost,
  onRenameHost,
  onRenameSelf,
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
  const hostEmail = host?.email?.trim().toLowerCase();
  const hostName = host?.name.trim().toLowerCase();
  const acceptedWithoutRoster = localAccepted.filter((person) => {
    const emailKey = person.email?.toLowerCase();
    const nameKey = person.name.trim().toLowerCase();
    if (hostEmail && emailKey && emailKey === hostEmail) return false;
    if (hostName && nameKey === hostName) return false;
    return !emailKey || !rosterEmails.has(emailKey);
  });
  const hasPeople =
    Boolean(host) ||
    rosterMembers.length > 0 ||
    localAccepted.length > 0 ||
    pending.length > 0;

  const closePanels = () => {
    Keyboard.dismiss();
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
    if (renaming.kind === 'host') {
      if (onRenameHost) onRenameHost(next);
      else if (host?.isSelf) onRenameSelf?.(next);
    } else if (renaming.kind === 'roster') {
      if (selfUserId && renaming.member.userId === selfUserId) {
        onRenameSelf?.(next);
      } else {
        onRenameRosterMember?.(renaming.member, next);
      }
    } else {
      onRenameParticipant?.(renaming.participant, next);
    }
    // Dismiss keyboard before unmounting the focused input so the sheet
    // doesn’t keep an invisible touch blocker after rename.
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      setMenu(undefined);
      setRenaming(undefined);
      setRenameDraft('');
    });
  };

  const toggleMenu = (target: TripFriendTarget, currentName: string, accepted: boolean) => {
    // Allow opening even when !canManage — self rows still expose Rename.
    if (menu && tripFriendTargetKey(menu.target) === tripFriendTargetKey(target) && !renaming) {
      setMenu(undefined);
      return;
    }
    setRenaming(undefined);
    setRenameDraft('');
    setMenu({ target, name: currentName, accepted });
  };

  const isExpanded = (target: TripFriendTarget) =>
    Boolean(menu && tripFriendTargetKey(menu.target) === tripFriendTargetKey(target));

  const isRenaming = (target: TripFriendTarget) =>
    Boolean(renaming && tripFriendTargetKey(renaming) === tripFriendTargetKey(target));

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
                <TripFriendRow
                  displayName={hostLabel}
                  userId={host.userId}
                  isSelf={host.isSelf}
                  badge="host"
                canOpenMenu={
                  (canManage && Boolean(onRenameHost)) ||
                  Boolean(host.isSelf && onRenameSelf)
                }
                selfOnlyMenu={Boolean(host.isSelf && !canManage && onRenameSelf)}
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
            const isCohost = member.role === 'cohost';
            const isSelfMember = Boolean(
              selfUserId && member.userId === selfUserId,
            );
            const canOpen =
              canManage || Boolean(isSelfMember && onRenameSelf);
            return (
              <View key={member.userId} style={styles.rowPad}>
                <TripFriendRow
                  displayName={
                    isSelfMember && !/^you$/i.test(member.displayName.trim())
                      ? `${member.displayName.trim()} (You)`
                      : member.displayName
                  }
                  userId={member.userId}
                  isSelf={isSelfMember}
                  badge={isCohost ? 'cohost' : undefined}
                  busy={busy}
                  canOpenMenu={canOpen}
                  selfOnlyMenu={Boolean(isSelfMember && !canManage)}
                  expanded={isExpanded(target)}
                  showDivider={showDivider}
                  showMakeHost={canPromoteHost && !isSelfMember}
                  showMakeCohost={canPromoteHost && !isCohost && !isSelfMember}
                  showRemoveCohost={canPromoteHost && isCohost && !isSelfMember}
                  showRemove={!isSelfMember}
                  renaming={isRenaming(target)}
                  renameDraft={isRenaming(target) ? renameDraft : undefined}
                  onRenameDraftChange={setRenameDraft}
                  onPress={() => toggleMenu(target, member.displayName, true)}
                  onUpdateName={() => beginRename(target, member.displayName)}
                  onMakeHost={() => {
                    setMenu(undefined);
                    onMakeHost?.(member);
                  }}
                  onMakeCohost={() => {
                    setMenu(undefined);
                    onMakeCohost?.(member);
                  }}
                  onRemoveCohost={() => {
                    setMenu(undefined);
                    onRemoveCohost?.(member);
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
                <TripFriendRow
                  displayName={person.name}
                  busy={busy}
                  canOpenMenu={canManage}
                  expanded={isExpanded(target)}
                  showDivider={showDivider}
                  showMakeHost={canPromoteHost}
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
                <TripFriendRow
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

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  container: { gap: spacing.md },
  form: { gap: spacing.md },
  list: { gap: 0 },
  rowPad: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
