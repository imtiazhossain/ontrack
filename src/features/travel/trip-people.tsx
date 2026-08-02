import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  ErrorMessage,
  Input,
  SectionHeader,
  Symbol,
} from '@/components/primitives';
import { radii, spacing } from '@/design-system';
import type {
  TravelParticipant,
  TravelTripRosterPerson,
} from '@/features/travel/types';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';

export type TripHostPerson = {
  name: string;
  email?: string;
  isSelf?: boolean;
};

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
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onBeginInvite: () => void;
  onCancelInvite: () => void;
  onInvite: () => void;
  managingParticipantId?: string;
  transferringUserId?: string;
  onResend: (participant: TravelParticipant) => void;
  onRemove: (participant: TravelParticipant) => void;
  onMakeHost?: (member: TravelTripRosterPerson) => void;
  onTransferAndLeave?: (member: TravelTripRosterPerson) => void;
  onMakeHostParticipant?: (participant: TravelParticipant) => void;
  onTransferAndLeaveParticipant?: (participant: TravelParticipant) => void;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function HostRow({ host }: { host: TripHostPerson }) {
  const theme = useTheme();
  const { s } = useResponsive();
  const displayName = host.name.trim() || 'Host';
  const label =
    host.isSelf && !/^you$/i.test(displayName)
      ? `${displayName} (You)`
      : displayName;
  return (
    <View style={styles.person}>
      <View
        accessibilityLabel={`${label}, trip host`}
        style={styles.personRow}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSunken }]}>
          <AppText variant="callout" color="accent">
            {initials(displayName)}
          </AppText>
        </View>
        <View style={styles.personDetails}>
          <View style={styles.acceptedNameRow}>
            <AppText
              variant="subheading"
              selectable
              fit
              style={styles.friendName}>
              {label}
            </AppText>
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
          </View>
        </View>
      </View>
    </View>
  );
}

function PersonRow({
  participant,
  accepted,
  managing,
  transferring,
  canManage,
  onResend,
  onRemove,
  onMakeHost,
  onTransferAndLeave,
}: {
  participant: TravelParticipant;
  accepted: boolean;
  managing: boolean;
  transferring?: boolean;
  canManage: boolean;
  onResend: () => void;
  onRemove: () => void;
  onMakeHost?: () => void;
  onTransferAndLeave?: () => void;
}) {
  const theme = useTheme();
  const { spacing: rs, s } = useResponsive();
  return (
    <View style={styles.person}>
      <View
        accessibilityLabel={accepted ? participant.name : `${participant.name}, invite pending`}
        style={styles.personRow}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSunken }]}>
          <AppText variant="callout" color="accent">
            {initials(participant.name)}
          </AppText>
        </View>
        <View style={styles.personDetails}>
          {accepted ? (
            <View style={styles.acceptedNameRow}>
              <AppText
                variant="subheading"
                selectable
                fit
                style={styles.friendName}>
                {participant.name}
              </AppText>
              {canManage ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove friend ${participant.name}`}
                  disabled={managing || transferring}
                  onPress={onRemove}
                  style={({ pressed }) => [
                    styles.inlineRemoveAction,
                    {
                      opacity:
                        managing || transferring ? 0.4 : pressed ? 0.6 : 1,
                    },
                  ]}>
                  <Symbol name="close" size="sm" color={theme.danger} />
                </Pressable>
              ) : null}
            </View>
          ) : (
            <AppText variant="subheading" selectable fit>
              {participant.name}
            </AppText>
          )}
        </View>
        {!accepted ? (
          <View style={[styles.status, { backgroundColor: theme.backgroundSunken }]}>
            <Symbol name="clock" size="sm" color={theme.textTertiary} />
            <AppText variant="caption" color="secondary" fit>
              Pending
            </AppText>
          </View>
        ) : null}
      </View>
      {accepted && canManage && onMakeHost && onTransferAndLeave ? (
        <View style={[styles.personActions, { gap: rs.sm }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Make ${participant.name} the trip host`}
            disabled={Boolean(transferring)}
            onPress={onMakeHost}
            style={({ pressed }) => [
              styles.personAction,
              {
                minHeight: Math.max(44, s(44)),
                opacity: transferring ? 0.4 : pressed ? 0.6 : 1,
              },
            ]}>
            <AppText variant="callout" color="accent" fit>
              {transferring ? 'Working…' : 'Make host'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Transfer host to ${participant.name} and leave`}
            disabled={Boolean(transferring)}
            onPress={onTransferAndLeave}
            style={({ pressed }) => [
              styles.personAction,
              {
                minHeight: Math.max(44, s(44)),
                opacity: transferring ? 0.4 : pressed ? 0.6 : 1,
              },
            ]}>
            <AppText variant="callout" color="danger" fit>
              Transfer & leave
            </AppText>
          </Pressable>
        </View>
      ) : null}
      {!accepted && canManage ? (
        <View style={styles.personActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Resend invite to ${participant.name}`}
            disabled={managing}
            onPress={onResend}
            style={({ pressed }) => [
              styles.personAction,
              { opacity: managing ? 0.4 : pressed ? 0.6 : 1 },
            ]}>
            <Symbol name="send" size="sm" color={theme.accentPrimary} />
            <AppText variant="callout" color="accent" fit>
              {managing ? 'Working…' : 'Resend'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove Invite ${participant.name}`}
            disabled={managing}
            onPress={onRemove}
            style={({ pressed }) => [
              styles.personAction,
              { opacity: managing ? 0.4 : pressed ? 0.6 : 1 },
            ]}>
            <AppText variant="callout" color="danger" fit>
              Remove Invite
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function RosterMemberRow({
  member,
  canManage,
  transferring,
  onMakeHost,
  onTransferAndLeave,
}: {
  member: TravelTripRosterPerson;
  canManage: boolean;
  transferring: boolean;
  onMakeHost?: () => void;
  onTransferAndLeave?: () => void;
}) {
  const theme = useTheme();
  const { spacing: rs, s } = useResponsive();
  return (
    <View style={styles.person}>
      <View
        accessibilityLabel={`${member.displayName}, trip friend`}
        style={styles.personRow}>
        <View style={[styles.avatar, { backgroundColor: theme.backgroundSunken }]}>
          <AppText variant="callout" color="accent">
            {initials(member.displayName)}
          </AppText>
        </View>
        <View style={styles.personDetails}>
          <AppText variant="subheading" selectable fit style={styles.friendName}>
            {member.displayName}
          </AppText>
        </View>
      </View>
      {canManage && onMakeHost && onTransferAndLeave ? (
        <View style={[styles.personActions, { gap: rs.sm }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Make ${member.displayName} the trip host`}
            disabled={transferring}
            onPress={onMakeHost}
            style={({ pressed }) => [
              styles.personAction,
              {
                minHeight: Math.max(44, s(44)),
                opacity: transferring ? 0.4 : pressed ? 0.6 : 1,
              },
            ]}>
            <AppText variant="callout" color="accent" fit>
              {transferring ? 'Working…' : 'Make host'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Transfer host to ${member.displayName} and leave`}
            disabled={transferring}
            onPress={onTransferAndLeave}
            style={({ pressed }) => [
              styles.personAction,
              {
                minHeight: Math.max(44, s(44)),
                opacity: transferring ? 0.4 : pressed ? 0.6 : 1,
              },
            ]}>
            <AppText variant="callout" color="danger" fit>
              Transfer & leave
            </AppText>
          </Pressable>
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
  onNameChange,
  onEmailChange,
  onBeginInvite,
  onCancelInvite,
  onInvite,
  managingParticipantId,
  transferringUserId,
  onResend,
  onRemove,
  onMakeHost,
  onTransferAndLeave,
  onMakeHostParticipant,
  onTransferAndLeaveParticipant,
}: TripPeopleProps) {
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

  return (
    <View style={styles.container}>
      {showHeader ? (
        <SectionHeader
          title="Friends"
          detail={pending.length > 0 ? `${pending.length} pending` : undefined}
          titleStyle={travelOverlineStyle}
        />
      ) : null}

      {host || rosterMembers.length > 0 || acceptedWithoutRoster.length > 0 ? (
        <Card variant="sunken" style={styles.list}>
          {host ? <HostRow host={host} /> : null}
          {rosterMembers.map((member) => (
            <RosterMemberRow
              key={member.userId}
              member={member}
              canManage={canManage}
              transferring={transferringUserId === member.userId}
              onMakeHost={
                onMakeHost ? () => onMakeHost(member) : undefined
              }
              onTransferAndLeave={
                onTransferAndLeave
                  ? () => onTransferAndLeave(member)
                  : undefined
              }
            />
          ))}
          {acceptedWithoutRoster.map((person) => (
            <PersonRow
              key={person.id}
              participant={person}
              accepted
              managing={managingParticipantId === person.id}
              transferring={transferringUserId === person.id}
              canManage={canManage}
              onResend={() => onResend(person)}
              onRemove={() => onRemove(person)}
              onMakeHost={
                onMakeHostParticipant
                  ? () => onMakeHostParticipant(person)
                  : undefined
              }
              onTransferAndLeave={
                onTransferAndLeaveParticipant
                  ? () => onTransferAndLeaveParticipant(person)
                  : undefined
              }
            />
          ))}
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <Card variant="sunken" style={styles.list}>
          <AppText variant="overline" color="secondary" style={travelOverlineStyle} fit>
            Invited
          </AppText>
          {pending.map((person) => (
            <PersonRow
              key={person.id}
              participant={person}
              accepted={false}
              managing={managingParticipantId === person.id}
              canManage={canManage}
              onResend={() => onResend(person)}
              onRemove={() => onRemove(person)}
            />
          ))}
        </Card>
      ) : null}

      {!hasPeople && !editing ? (
        <AppText variant="body" color="secondary">
          {canManage
            ? 'No friends are on this trip yet. Invite someone to start planning together.'
            : 'Trip friends will show up here once everyone has joined.'}
        </AppText>
      ) : null}

      {canManage ? (
        editing ? (
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
        ) : (
          <Button icon="invite" onPress={onBeginInvite}>
            Invite a Friend
          </Button>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  list: { gap: spacing.md },
  person: { gap: spacing.xs },
  personRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  personActions: {
    minHeight: 44,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  personAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personDetails: { flex: 1, minWidth: 0, flexShrink: 1, gap: spacing.xxs },
  acceptedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  friendName: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  inlineRemoveAction: {
    width: 44,
    height: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  form: { gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
