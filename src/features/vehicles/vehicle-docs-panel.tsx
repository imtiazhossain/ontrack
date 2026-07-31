import { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, DateField, Input, SectionHeader } from '@/components/primitives';
import type { Vehicle, VehicleInsurance, VehicleRegistration } from '@/features/vehicles/types';
import { useResponsive } from '@/hooks/use-responsive';

export function VehicleDocsPanel({
  vehicle,
  onChange,
}: {
  vehicle: Vehicle;
  onChange: (
    next: Vehicle,
    summary: string,
    entityType: 'registration' | 'insurance',
  ) => void;
}) {
  const { spacing: gap } = useResponsive();
  const [regState, setRegState] = useState(vehicle.registration?.state ?? '');
  const [regNumber, setRegNumber] = useState(vehicle.registration?.number ?? '');
  const [regExpires, setRegExpires] = useState(vehicle.registration?.expiresOn ?? '');
  const [regNotes, setRegNotes] = useState(vehicle.registration?.notes ?? '');
  const [insProvider, setInsProvider] = useState(vehicle.insurance?.provider ?? '');
  const [insPolicy, setInsPolicy] = useState(vehicle.insurance?.policyNumber ?? '');
  const [insExpires, setInsExpires] = useState(vehicle.insurance?.expiresOn ?? '');
  const [insNotes, setInsNotes] = useState(vehicle.insurance?.notes ?? '');

  const saveRegistration = () => {
    const registration: VehicleRegistration = {
      state: regState.trim() || undefined,
      number: regNumber.trim() || undefined,
      expiresOn: regExpires.trim() || undefined,
      notes: regNotes.trim() || undefined,
    };
    onChange(
      {
        ...vehicle,
        registration,
        updatedAt: new Date().toISOString(),
      },
      'Updated registration',
      'registration',
    );
  };

  const saveInsurance = () => {
    const insurance: VehicleInsurance = {
      provider: insProvider.trim() || undefined,
      policyNumber: insPolicy.trim() || undefined,
      expiresOn: insExpires.trim() || undefined,
      notes: insNotes.trim() || undefined,
    };
    onChange(
      {
        ...vehicle,
        insurance,
        updatedAt: new Date().toISOString(),
      },
      'Updated insurance',
      'insurance',
    );
  };

  return (
    <View style={{ gap: gap.lg }}>
      <View style={{ gap: gap.md }}>
        <SectionHeader title="Registration" />
        <Input label="State" value={regState} onChangeText={setRegState} autoCapitalize="characters" />
        <Input label="Plate / reg #" value={regNumber} onChangeText={setRegNumber} />
        <DateField label="Expires" value={regExpires} onChange={setRegExpires} />
        <Input label="Notes" value={regNotes} onChangeText={setRegNotes} />
        <Button onPress={saveRegistration} accessibilityLabel="Save registration">
          Save registration
        </Button>
      </View>

      <View style={{ gap: gap.md }}>
        <SectionHeader title="Insurance" />
        <Input label="Provider" value={insProvider} onChangeText={setInsProvider} />
        <Input label="Policy number" value={insPolicy} onChangeText={setInsPolicy} />
        <DateField label="Expires" value={insExpires} onChange={setInsExpires} />
        <Input label="Notes" value={insNotes} onChangeText={setInsNotes} />
        <Button onPress={saveInsurance} accessibilityLabel="Save insurance">
          Save insurance
        </Button>
      </View>

      <AppText variant="caption" color="secondary">
        Expiry dates help you spot renewals alongside maintenance due items.
      </AppText>
    </View>
  );
}
