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
import type { TravelParticipant } from '@/features/travel/types';
import { useTheme } from '@/hooks/use-theme';

interface TripPeopleProps {
  participants: TravelParticipant[];
  editing: boolean;
  name: string;
  email: string;
  error?: string;
  inviting: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onBeginInvite: () => void;
  onCancelInvite: () => void;
  onInvite: () => void;
  managingParticipantId?: string;
  onResend: (participant: TravelParticipant) => void;
  onRemove: (participant: TravelParticipant) => void;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function PersonRow({
  participant,
  accepted,
  managing,
  onResend,
  onRemove,
}: {
  participant: TravelParticipant;
  accepted: boolean;
  managing: boolean;
  onResend: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
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
              <AppText variant="subheading" selectable style={styles.friendName}>
                {participant.name}
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove friend ${participant.name}`}
                disabled={managing}
                onPress={onRemove}
                style={({ pressed }) => [
                  styles.inlineRemoveAction,
                  { opacity: managing ? 0.4 : pressed ? 0.6 : 1 },
                ]}>
                <Symbol name="xmark" size="sm" color={theme.danger} />
              </Pressable>
            </View>
          ) : (
            <AppText variant="subheading" selectable>{participant.name}</AppText>
          )}
          {participant.email ? (
            <AppText variant="caption" color="secondary" selectable>
              {participant.email}
            </AppText>
          ) : null}
        </View>
        {!accepted ? (
          <View style={[styles.status, { backgroundColor: theme.backgroundSunken }]}>
            <Symbol name="clock.fill" size="sm" color={theme.textTertiary} />
            <AppText variant="caption" color="secondary">Pending</AppText>
          </View>
        ) : null}
      </View>
      {!accepted ? (
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
            <Symbol name="paperplane.fill" size="sm" color={theme.accentPrimary} />
            <AppText variant="callout" color="accent">
              {managing ? 'Working…' : 'Resend'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove invite ${participant.name}`}
            disabled={managing}
            onPress={onRemove}
            style={({ pressed }) => [
              styles.personAction,
              { opacity: managing ? 0.4 : pressed ? 0.6 : 1 },
            ]}>
            <AppText variant="callout" color="danger">Remove invite</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function TripPeople({
  participants,
  editing,
  name,
  email,
  error,
  inviting,
  onNameChange,
  onEmailChange,
  onBeginInvite,
  onCancelInvite,
  onInvite,
  managingParticipantId,
  onResend,
  onRemove,
}: TripPeopleProps) {
  const accepted = participants.filter((person) => person.acceptedAt);
  const pending = participants.filter((person) => !person.acceptedAt);

  return (
    <View style={styles.container}>
      <SectionHeader
        title="Friends"
        detail={pending.length > 0 ? `${pending.length} pending` : undefined}
      />

      {accepted.length > 0 ? (
        <Card variant="sunken" style={styles.list}>
          {accepted.map((person) => (
            <PersonRow
              key={person.id}
              participant={person}
              accepted
              managing={managingParticipantId === person.id}
              onResend={() => onResend(person)}
              onRemove={() => onRemove(person)}
            />
          ))}
        </Card>
      ) : null}

      {pending.length > 0 ? (
        <Card variant="sunken" style={styles.list}>
          <AppText variant="overline" color="secondary">Invited</AppText>
          {pending.map((person) => (
            <PersonRow
              key={person.id}
              participant={person}
              accepted={false}
              managing={managingParticipantId === person.id}
              onResend={() => onResend(person)}
              onRemove={() => onRemove(person)}
            />
          ))}
        </Card>
      ) : null}

      {participants.length === 0 && !editing ? (
        <AppText variant="body" color="secondary">
          No friends are on this trip yet. Invite someone to start planning together.
        </AppText>
      ) : null}

      {editing ? (
        <Card style={styles.form}>
          <AppText variant="subheading">Invite a friend</AppText>
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
              {inviting ? 'Creating invite…' : 'Create invite'}
            </Button>
            <Button variant="ghost" disabled={inviting} onPress={onCancelInvite}>
              Cancel
            </Button>
          </View>
        </Card>
      ) : (
        <Button icon="person.badge.plus" onPress={onBeginInvite}>
          Invite a friend
        </Button>
      )}
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
  personDetails: { flex: 1, gap: spacing.xxs },
  acceptedNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  friendName: {
    flex: 1,
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
