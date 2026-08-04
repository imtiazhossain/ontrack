import { Pressable, View } from 'react-native';

import { AppText, Button, Card, Input, SectionHeader } from '@/components/primitives';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import type { Vehicle } from '@/features/vehicles/types';
import { vehicleFitmentLabel } from '@/features/vehicles/types';
import { AgentUiIds, useAgentUiTarget } from '@/utils/agent-ui';
import { formatDateLong } from '@/utils/date';

export function VehicleOverviewPanel({
  vehicle,
  odometerDraft,
  onOdometerDraftChange,
  onSaveOdometer,
  onDecodeVin,
  onOpenSettings,
  decoding,
  decodeError,
}: {
  vehicle: Vehicle;
  odometerDraft: string;
  onOdometerDraftChange: (value: string) => void;
  onSaveOdometer: () => void;
  onDecodeVin: () => void;
  onOpenSettings: () => void;
  decoding: boolean;
  decodeError?: string;
}) {
  const theme = useTheme();
  const { spacing: gap, s } = useResponsive();
  const fitment = vehicleFitmentLabel(vehicle);
  const settingsTip = useAgentUiTarget(AgentUiIds.vehicles.overviewSettingsTip(vehicle.id), {
    label: 'Open vehicle settings',
    onPress: onOpenSettings,
  });

  return (
    <View style={{ gap: gap.lg }}>
      <Card>
        <View style={{ gap: gap.sm }}>
          <AppText variant="title" fit numberOfLines={1}>
            {vehicle.nickname}
          </AppText>
          <AppText variant="callout" color="secondary" numberOfLines={2}>
            {fitment || 'Add year, make, and model for parts fitment.'}
          </AppText>
          {vehicle.vin ? (
            <AppText variant="caption" color="tertiary" fit numberOfLines={1}>
              VIN {vehicle.vin}
            </AppText>
          ) : null}
          {vehicle.plate ? (
            <AppText variant="caption" color="tertiary" fit numberOfLines={1}>
              Plate {vehicle.plate}
            </AppText>
          ) : null}
          {vehicle.mode === 'shared' ? (
            <AppText variant="caption" color="accent" fit numberOfLines={1}>
              Shared · {vehicle.role === 'owner' ? 'Owner' : 'Collaborator'}
            </AppText>
          ) : null}
        </View>
      </Card>

      <View style={{ gap: gap.md }}>
        <SectionHeader title="Odometer" />
        <Input
          label="Current miles"
          value={odometerDraft}
          onChangeText={onOdometerDraftChange}
          keyboardType="number-pad"
        />
        {vehicle.odometerUpdatedAt ? (
          <AppText variant="caption" color="secondary">
            Updated {formatDateLong(vehicle.odometerUpdatedAt.slice(0, 10))}
          </AppText>
        ) : null}
        <Button
          onPress={onSaveOdometer}
          accessibilityLabel="Save odometer"
          testID={AgentUiIds.vehicles.saveOdometer}>
          Save mileage
        </Button>
      </View>

      <View style={{ gap: gap.md }}>
        <SectionHeader title="VIN decode" />
        <AppText variant="caption" color="secondary">
          Fill year, make, model, trim, and engine from NHTSA using the VIN on this vehicle.
        </AppText>
        <Button
          variant="secondary"
          onPress={onDecodeVin}
          disabled={!vehicle.vin || decoding}
          accessibilityLabel="Decode VIN">
          {decoding ? 'Decoding…' : 'Decode VIN'}
        </Button>
        {decodeError ? (
          <AppText variant="caption" color="danger">
            {decodeError}
          </AppText>
        ) : null}
      </View>

      <Pressable
        ref={settingsTip.ref}
        testID={AgentUiIds.vehicles.overviewSettingsTip(vehicle.id)}
        onLayout={settingsTip.onLayout}
        onPress={onOpenSettings}
        accessibilityRole="button"
        accessibilityLabel="Open vehicle settings"
        style={{
          minHeight: Math.max(44, s(48)),
          borderRadius: s(14),
          paddingHorizontal: gap.lg,
          justifyContent: 'center',
          backgroundColor: theme.backgroundSunken,
        }}>
        <AppText variant="caption" color="secondary">
          Tip: open Settings to share this vehicle with household collaborators.
        </AppText>
      </Pressable>
    </View>
  );
}
