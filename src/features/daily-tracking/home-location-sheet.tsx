import { useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  AppText,
  Button,
  ErrorMessage,
  GlassPrimaryAction,
  Input,
  SheetScaffold,
} from '@/components/primitives';
import {
  glassFieldBackground,
  glassFieldBorder,
  radii,
} from '@/design-system';
import { getDestinationCurrentWeather } from '@/features/travel/weather';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import type { DateDisplayFormat } from '@/utils/date';
import { AgentUiIds } from '@/utils/agent-ui';
import { getCurrentPlaceLabel } from '@/utils/device-location';
import { haptics } from '@/utils/haptics';

function unitForDateFormat(format: DateDisplayFormat) {
  return format === 'mdy' ? 'fahrenheit' : 'celsius';
}

export function HomeLocationSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { spacing, s } = useResponsive();
  const homeLocation = usePreferences((state) => state.homeLocation);
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const setHomeLocation = usePreferences((state) => state.setHomeLocation);

  const [draft, setDraft] = useState(homeLocation);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!visible) return;
    setDraft(homeLocation);
    setError(undefined);
    setSaving(false);
    setDetecting(false);
  }, [homeLocation, visible]);

  const persistValidatedPlace = async (place: string) => {
    const weather = await getDestinationCurrentWeather(
      place,
      unitForDateFormat(dateDisplayFormat),
    );
    setHomeLocation(weather.locationLabel);
    setDraft(weather.locationLabel);
    haptics.success();
    onClose();
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Enter a city or place, or use your current location.');
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await persistValidatedPlace(trimmed);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not find that place. Try a city and region.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setDetecting(true);
    setError(undefined);
    try {
      const result = await getCurrentPlaceLabel();
      if (result.status === 'denied') {
        setError('Location permission is off. Enable it in Settings, or type a city below.');
        return;
      }
      if (result.status !== 'suggested') {
        setError('Could not read your current location. Try typing a city instead.');
        return;
      }
      setDraft(result.label);
      await persistValidatedPlace(result.label);
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Could not use your current location. Try typing a city instead.',
      );
    } finally {
      setDetecting(false);
    }
  };

  const clear = () => {
    setHomeLocation('');
    setDraft('');
    setError(undefined);
    haptics.tap();
    onClose();
  };

  const busy = saving || detecting;
  const dark = theme.name === 'dark';

  return (
    <SheetScaffold
      visible={visible}
      title="Home location"
      subtitle="Used for weather on Today. Use your phone location or enter a city."
      onClose={onClose}
      closeAccessibilityLabel="Close"
      closeTestID={AgentUiIds.today.location.close}
      surface="glass"
      contentContainerStyle={{ gap: spacing.md }}
      footer={
        <View style={{ gap: spacing.sm }}>
          <GlassPrimaryAction
            label={saving ? 'Saving…' : 'Save'}
            onPress={() => void save()}
            disabled={busy}
            testID={AgentUiIds.today.location.save}
          />
          {homeLocation.trim() ? (
            <Button
              variant="ghost"
              onPress={clear}
              disabled={busy}
              testID={AgentUiIds.today.location.clear}
              accessibilityLabel="Clear home location">
              Clear location
            </Button>
          ) : null}
        </View>
      }>
      <GlassPrimaryAction
        icon="location"
        label={detecting ? 'Finding location…' : 'Use current location'}
        onPress={() => void handleUseCurrentLocation()}
        disabled={busy}
        testID={AgentUiIds.today.location.useCurrent}
      />

      <AppText variant="caption" color="tertiary" fit>
        Or enter a different city
      </AppText>

      <Input
        icon="location"
        stackedLabel="City or place"
        value={draft}
        onChangeText={setDraft}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => void save()}
        placeholder="e.g. Austin, TX"
        iconBackground={dark ? '#143F3C' : '#C9F2EC'}
        iconColor={dark ? '#68D7CC' : '#087E73'}
        fieldBackground={glassFieldBackground(theme.name)}
        fieldBorderColor={glassFieldBorder(theme.name)}
        fieldBorderRadius={radii.pill}
        testID={AgentUiIds.today.location.place}
        accessibilityLabel="Home location city or place"
      />
      {error ? <ErrorMessage message={error} /> : null}
      <AppText variant="caption" color="tertiary" style={{ marginTop: s(4) }}>
        Weather uses Open-Meteo with your saved place. You can change it anytime.
      </AppText>
    </SheetScaffold>
  );
}
