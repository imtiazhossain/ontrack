import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  ErrorMessage,
  LoadingBlock,
  Screen,
} from '@/components/primitives';
import { useAuthSession } from '@/features/auth/auth-provider';
import { FeatureThemeProvider } from '@/hooks/use-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  acceptVehicleShareLink,
  resolveVehicleShareLink,
} from '@/services/vehicles/collaboration';

export default function VehicleJoinRoute() {
  return (
    <FeatureThemeProvider feature="vehicles">
      <VehicleJoinScreen />
    </FeatureThemeProvider>
  );
}

function VehicleJoinScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { spacing: gap } = useResponsive();
  const { user } = useAuthSession();
  const [nickname, setNickname] = useState<string>();
  const [ownerName, setOwnerName] = useState<string>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code || !user) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void resolveVehicleShareLink(code)
      .then((resolved) => {
        if (!active) return;
        setNickname(resolved.nickname);
        setOwnerName(resolved.ownerName);
        setError(undefined);
      })
      .catch((caught) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Invalid invite.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code, user]);

  const join = async () => {
    if (!code) return;
    setBusy(true);
    setError(undefined);
    try {
      const vehicleId = await acceptVehicleShareLink(code);
      router.replace({ pathname: '/vehicles/[id]', params: { id: vehicleId } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join.');
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <Screen contentStyle={{ gap: gap.lg }}>
        <AppText variant="title" fit numberOfLines={1}>
          Join a vehicle
        </AppText>
        <AppText variant="body" color="secondary">
          Sign in to accept this collaborative vehicle invite.
        </AppText>
        <Button
          onPress={() =>
            router.push({
              pathname: '/account',
              params: { returnTo: `/v/${code ?? ''}` },
            } as never)
          }>
          Sign in
        </Button>
      </Screen>
    );
  }

  if (loading) {
    return (
      <Screen>
        <LoadingBlock label="Checking invite…" />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={{ gap: gap.lg }}>
      <View style={{ gap: gap.sm }}>
        <AppText variant="title" fit numberOfLines={1}>
          Join vehicle
        </AppText>
        <AppText variant="body" color="secondary">
          {nickname
            ? `${ownerName ?? 'Someone'} invited you to collaborate on ${nickname}.`
            : 'This invite could not be loaded.'}
        </AppText>
      </View>
      {error ? <ErrorMessage message={error} /> : null}
      {nickname ? (
        <Button disabled={busy} onPress={() => void join()} accessibilityLabel="Join vehicle">
          {busy ? 'Joining…' : 'Join vehicle'}
        </Button>
      ) : null}
      <Button variant="ghost" onPress={() => router.replace('/(tabs)/vehicles')}>
        Cancel
      </Button>
    </Screen>
  );
}
