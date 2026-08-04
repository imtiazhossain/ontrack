import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppText,
  Button,
  ErrorMessage,
  IconButton,
  Input,
} from '@/components/primitives';
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
  const insets = useSafeAreaInsets();
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.backgroundPrimary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.headerPad,
            {
              paddingTop: insets.top + spacing.sm,
              paddingHorizontal: spacing.lg,
            },
          ]}>
          <View style={[styles.header, { marginBottom: spacing.md }]}>
            <View style={styles.headerCopy}>
              <AppText variant="heading" fit>
                Home location
              </AppText>
              <AppText variant="callout" color="secondary" numberOfLines={2}>
                Used for weather on Today. Use your phone location or enter a city.
              </AppText>
            </View>
            <IconButton
              icon="close"
              accessibilityLabel="Close"
              testID={AgentUiIds.today.location.close}
              onPress={onClose}
            />
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
            gap: spacing.md,
          }}>
          <Button
            icon="location"
            onPress={() => void handleUseCurrentLocation()}
            loading={detecting}
            disabled={saving}
            testID={AgentUiIds.today.location.useCurrent}
            accessibilityLabel="Use current location">
            Use current location
          </Button>

          <AppText variant="caption" color="tertiary" fit>
            Or enter a different city
          </AppText>

          <Input
            label="City or place"
            value={draft}
            onChangeText={setDraft}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
            placeholder="e.g. Austin, TX"
            testID={AgentUiIds.today.location.place}
            accessibilityLabel="Home location city or place"
          />
          {error ? <ErrorMessage message={error} /> : null}
          <Button
            variant="secondary"
            onPress={() => void save()}
            loading={saving}
            disabled={detecting}
            testID={AgentUiIds.today.location.save}
            accessibilityLabel="Save home location">
            Save
          </Button>
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
          <AppText variant="caption" color="tertiary" style={{ marginTop: s(4) }}>
            Weather uses Open-Meteo with your saved place. You can change it anytime.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerPad: {},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
});
