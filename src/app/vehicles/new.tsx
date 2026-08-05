import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  ErrorMessage,
  Input,
  Screen,
  SectionHeader,
} from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import { createEmptyVehicle, useVehicles } from '@/store/vehicles';
import { AgentUiIds } from '@/utils/agent-ui';
import { asFiniteNonNegative, asPositiveNumber } from '@/utils/parse';

export default function NewVehicleScreen() {
  const router = useRouter();
  const { spacing: gap } = useResponsive();
  const saveVehicle = useVehicles((state) => state.saveVehicle);
  const appendLocalActivity = useVehicles((state) => state.appendLocalActivity);
  const [nickname, setNickname] = useState('');
  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [trim, setTrim] = useState('');
  const [engine, setEngine] = useState('');
  const [vin, setVin] = useState('');
  const [plate, setPlate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [error, setError] = useState<string>();

  const save = () => {
    setError(undefined);
    const name = nickname.trim();
    if (!name && !make.trim() && !model.trim()) {
      setError('Add a nickname or at least a make and model.');
      return;
    }
    const vehicle = createEmptyVehicle({
      nickname: name || [year, make, model].filter(Boolean).join(' ') || 'My vehicle',
      year: asPositiveNumber(Number(year)) ?? undefined,
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      trim: trim.trim() || undefined,
      engine: engine.trim() || undefined,
      vin: vin.trim().toUpperCase() || undefined,
      plate: plate.trim().toUpperCase() || undefined,
      odometerMiles: asFiniteNonNegative(Number(odometer)),
    });
    saveVehicle(vehicle);
    appendLocalActivity(vehicle.id, {
      actorDisplayName: 'You',
      action: 'create',
      entityType: 'vehicle',
      entityId: vehicle.id,
      summary: `Added ${vehicle.nickname}`,
    });
    router.replace({ pathname: '/vehicles/[id]', params: { id: vehicle.id } });
  };

  return (
    <Screen contentStyle={{ gap: gap.lg }} refresh={false}>
      <View style={{ gap: gap.sm }}>
        <AppText variant="title" fit numberOfLines={1}>
          New vehicle
        </AppText>
        <AppText variant="callout" color="secondary">
          Start with basics — you can decode a VIN and shop parts later.
        </AppText>
      </View>

      <View style={{ gap: gap.md }}>
        <SectionHeader title="Basics" />
        <Input
          label="Nickname"
          testID={AgentUiIds.vehicles.new.nickname}
          value={nickname}
          onChangeText={setNickname}
          placeholder="Daily driver"
          autoCapitalize="words"
        />
        <View style={[styles.row, { gap: gap.md }]}>
          <View style={styles.half}>
            <Input
              label="Year"
              testID={AgentUiIds.vehicles.new.year}
              value={year}
              onChangeText={setYear}
              keyboardType="number-pad"
              placeholder="2018"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Make"
              testID={AgentUiIds.vehicles.new.make}
              value={make}
              onChangeText={setMake}
              placeholder="Honda"
              autoCapitalize="words"
            />
          </View>
        </View>
        <Input
          label="Model"
          testID={AgentUiIds.vehicles.new.model}
          value={model}
          onChangeText={setModel}
          placeholder="Civic"
          autoCapitalize="words"
        />
        <View style={[styles.row, { gap: gap.md }]}>
          <View style={styles.half}>
            <Input label="Trim" value={trim} onChangeText={setTrim} placeholder="EX" />
          </View>
          <View style={styles.half}>
            <Input
              label="Engine"
              value={engine}
              onChangeText={setEngine}
              placeholder="1.5L"
            />
          </View>
        </View>
      </View>

      <View style={{ gap: gap.md }}>
        <SectionHeader title="Identifiers" />
        <Input
          label="VIN"
          testID={AgentUiIds.vehicles.new.vin}
          value={vin}
          onChangeText={setVin}
          autoCapitalize="characters"
          placeholder="Optional — decode later"
        />
        <Input
          label="License plate"
          value={plate}
          onChangeText={setPlate}
          autoCapitalize="characters"
        />
        <Input
          label="Odometer (mi)"
          testID={AgentUiIds.vehicles.new.odometer}
          value={odometer}
          onChangeText={setOdometer}
          keyboardType="number-pad"
        />
      </View>

      {error ? <ErrorMessage message={error} /> : null}
      <Button
        testID={AgentUiIds.vehicles.new.save}
        onPress={save}
        accessibilityLabel="Save vehicle">
        Save vehicle
      </Button>
      <Button
        variant="ghost"
        testID={AgentUiIds.vehicles.new.cancel}
        onPress={() => router.back()}
        accessibilityLabel="Cancel">
        Cancel
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  half: { flex: 1, minWidth: 0 },
});
