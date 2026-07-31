import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  appPrompt,
  Button,
  Card,
  ErrorMessage,
  Screen,
  SectionHeader,
} from '@/components/primitives';
import { useAuthSession } from '@/features/auth/auth-provider';
import { shareVehicleInvite } from '@/features/vehicles/share';
import { vehicleDisplayTitle } from '@/features/vehicles/types';
import { FeatureThemeProvider } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  createVehicleShareLink,
  deleteSharedVehicle,
  leaveVehicle,
  publishVehicle,
  removeVehicleMember,
  revokeVehicleShareLink,
  transferVehicleOwnership,
} from '@/services/vehicles/collaboration';
import { useVehicles } from '@/store/vehicles';
import { confirmDestructiveAction } from '@/utils/confirm-destructive';

export default function VehicleSettingsRoute() {
  return (
    <FeatureThemeProvider feature="vehicles">
      <VehicleSettingsScreen />
    </FeatureThemeProvider>
  );
}

function VehicleSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { spacing: gap } = useResponsive();
  const { user } = useAuthSession();
  const vehicle = useVehicles((state) => state.vehicles.find((item) => item.id === id));
  const removeVehicle = useVehicles((state) => state.removeVehicle);
  const [working, setWorking] = useState<string>();
  const [error, setError] = useState<string>();

  if (!vehicle) {
    return (
      <Screen>
        <AppText variant="title">Vehicle unavailable</AppText>
        <Button onPress={() => router.replace('/(tabs)/vehicles')}>Back</Button>
      </Screen>
    );
  }

  const owner = vehicle.role === 'owner';
  const title = vehicleDisplayTitle(vehicle);

  const run = async (key: string, action: () => Promise<void>) => {
    setWorking(key);
    setError(undefined);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Something went wrong.');
    } finally {
      setWorking(undefined);
    }
  };

  const requireSignIn = () => {
    router.push({
      pathname: '/account',
      params: { returnTo: `/vehicles/${vehicle.id}/settings` },
    } as never);
  };

  const beginSharing = () => {
    if (!user) return requireSignIn();
    void run('publish', async () => {
      await publishVehicle(vehicle.id);
      const code = await createVehicleShareLink(vehicle.id);
      await shareVehicleInvite(
        useVehicles.getState().vehicles.find((item) => item.id === vehicle.id) ?? vehicle,
        code,
      );
    });
  };

  const shareLink = () => {
    if (!user) return requireSignIn();
    void run('link', async () => {
      const code = vehicle.shareCode ?? (await createVehicleShareLink(vehicle.id));
      await shareVehicleInvite(vehicle, code);
    });
  };

  const transferTo = (userId: string, leaveAfter: boolean) => {
    confirmDestructiveAction({
      title: leaveAfter ? 'Transfer & leave?' : 'Make owner?',
      message: leaveAfter
        ? 'They become the owner and you leave this vehicle.'
        : 'They become the owner. You stay as a collaborator.',
      actionLabel: leaveAfter ? 'Transfer & leave' : 'Make owner',
      onConfirm: () => {
        void run('transfer', async () => {
          await transferVehicleOwnership(vehicle.id, userId);
          if (leaveAfter) {
            await leaveVehicle(vehicle.id);
            router.replace('/(tabs)/vehicles');
          }
        });
      },
    });
  };

  const leave = () => {
    confirmDestructiveAction({
      title: 'Leave vehicle?',
      message: 'You will lose access until invited again.',
      actionLabel: 'Leave',
      onConfirm: () => {
        void run('leave', async () => {
          await leaveVehicle(vehicle.id);
          router.replace('/(tabs)/vehicles');
        });
      },
    });
  };

  const remove = () => {
    confirmDestructiveAction({
      title: 'Delete vehicle?',
      message: 'Maintenance, mileage, expenses, parts, and history will be permanently deleted.',
      actionLabel: 'Delete',
      onConfirm: () => {
        void run('delete', async () => {
          if (vehicle.mode === 'shared') await deleteSharedVehicle(vehicle.id);
          else removeVehicle(vehicle.id);
          router.replace('/(tabs)/vehicles');
        });
      },
    });
  };

  return (
    <Screen contentStyle={{ gap: gap.lg }}>
      <View style={{ gap: gap.xs }}>
        <AppText variant="overline" color="accent" fit numberOfLines={1}>
          {vehicle.mode === 'shared' ? 'Shared vehicle' : 'Private vehicle'}
        </AppText>
        <AppText variant="title" fit numberOfLines={1}>
          {title}
        </AppText>
      </View>

      {owner ? (
        <>
          <SectionHeader title="Sharing" />
          {vehicle.mode === 'private' ? (
            <Card>
              <AppText variant="heading" fit numberOfLines={1}>
                Work together live
              </AppText>
              <AppText variant="body" color="secondary">
                Sharing moves this vehicle to a protected collaborative space. Collaborators can
                edit mileage, maintenance, expenses, parts, and docs. History tracks who changed
                what.
              </AppText>
              <Button
                icon="people"
                disabled={Boolean(working)}
                onPress={beginSharing}
                accessibilityLabel="Share this vehicle">
                {working === 'publish' ? 'Preparing…' : 'Share this vehicle'}
              </Button>
            </Card>
          ) : (
            <Card>
              <AppText variant="heading" fit numberOfLines={1}>
                Secure join link
              </AppText>
              <AppText variant="body" color="secondary">
                Any signed-in onTrack user with the link can join until you revoke it.
              </AppText>
              <Button
                icon="send"
                disabled={Boolean(working)}
                onPress={shareLink}
                accessibilityLabel="Share join link">
                {working === 'link' ? 'Preparing…' : 'Share join link'}
              </Button>
              {vehicle.shareCode ? (
                <Button
                  variant="ghost"
                  disabled={Boolean(working)}
                  onPress={() =>
                    void run('revoke', () => revokeVehicleShareLink(vehicle.id))
                  }>
                  Revoke link
                </Button>
              ) : null}
            </Card>
          )}
        </>
      ) : (
        <Card>
          <AppText variant="heading" fit numberOfLines={1}>
            Shared with you
          </AppText>
          <AppText variant="body" color="secondary">
            You can edit this vehicle’s data. Only the owner can invite people, transfer ownership,
            or delete it.
          </AppText>
        </Card>
      )}

      {vehicle.mode === 'shared' ? (
        <>
          <SectionHeader title="Collaborators" />
          {vehicle.members.map((member) => (
            <Card key={member.userId}>
              <AppText variant="heading" fit numberOfLines={1}>
                {member.displayName}
              </AppText>
              <AppText variant="caption" color="secondary" fit numberOfLines={1}>
                {member.role === 'owner' ? 'Owner' : 'Collaborator'}
              </AppText>
              {owner && member.role === 'member' ? (
                <View style={{ gap: gap.sm, marginTop: gap.sm }}>
                  <Button
                    variant="secondary"
                    disabled={Boolean(working)}
                    onPress={() => transferTo(member.userId, false)}>
                    Make owner
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={Boolean(working)}
                    onPress={() => transferTo(member.userId, true)}>
                    Transfer & leave
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={Boolean(working)}
                    onPress={() =>
                      confirmDestructiveAction({
                        title: 'Remove collaborator?',
                        message: `${member.displayName} will lose access.`,
                        actionLabel: 'Remove',
                        onConfirm: () => {
                          void run('remove', () =>
                            removeVehicleMember(vehicle.id, member.userId),
                          );
                        },
                      })
                    }>
                    Remove
                  </Button>
                </View>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      {error ? <ErrorMessage message={error} /> : null}

      <SectionHeader title="Danger zone" />
      {vehicle.mode === 'shared' && !owner ? (
        <Button variant="danger" disabled={Boolean(working)} onPress={leave}>
          Leave vehicle
        </Button>
      ) : null}
      {owner ? (
        <Button variant="danger" disabled={Boolean(working)} onPress={remove}>
          Delete vehicle
        </Button>
      ) : null}

      <Button
        variant="ghost"
        onPress={() =>
          appPrompt.alert(
            'Collaborative editing',
            'Owners and members can all edit vehicle data. Every change is recorded in History.',
          )
        }>
        How sharing works
      </Button>
    </Screen>
  );
}
