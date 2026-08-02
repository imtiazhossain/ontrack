import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Symbol, appPrompt } from '@/components/primitives';
import { fontFamilies } from '@/design-system';
import {
  fetchDestinationCoverUri,
  localTripCoverUri,
} from '@/features/travel/destination-cover';
import { TravelSheetIconControl } from '@/features/travel/travel-list-actions';
import { itinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { pickCameraImage, pickLibraryImage } from '@/utils/pick-image';
import { haptics } from '@/utils/haptics';

/** Cover thumbnail control used while editing trip details. */
export function TravelPlanCoverField({
  plan,
  coverUri,
  onCoverUriChange,
}: {
  plan: TravelPlan;
  coverUri?: string;
  onCoverUriChange: (uri: string | undefined) => void;
}) {
  const theme = useTheme();
  const chrome = itinerarySheetChrome(theme);
  const { s, spacing: rs } = useResponsive();
  const size = Math.max(72, s(76));
  const localFallback = localTripCoverUri({ ...plan, coverUri: undefined });
  const [remoteFallback, setRemoteFallback] = useState<string | undefined>();
  const preview = coverUri ?? localFallback ?? remoteFallback;

  useEffect(() => {
    if (coverUri || localFallback) {
      setRemoteFallback(undefined);
      return;
    }
    let active = true;
    void fetchDestinationCoverUri({ ...plan, coverUri: undefined }).then((uri) => {
      if (active) setRemoteFallback(uri);
    });
    return () => {
      active = false;
    };
  }, [coverUri, localFallback, plan]);

  const chooseLibrary = async () => {
    const uri = await pickLibraryImage({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (uri) onCoverUriChange(uri);
  };

  const chooseCamera = async () => {
    const uri = await pickCameraImage({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (uri) onCoverUriChange(uri);
  };

  const openPicker = () => {
    haptics.tap();
    if (Platform.OS === 'ios') {
      appPrompt.actionSheet(
        {
          title: 'Trip Cover Photo',
          options: coverUri
            ? ['Cancel', 'Choose from Photos', 'Take Photo', 'Remove Photo']
            : ['Cancel', 'Choose from Photos', 'Take Photo'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: coverUri ? 3 : undefined,
        },
        (index) => {
          if (index === 1) void chooseLibrary();
          if (index === 2) void chooseCamera();
          if (coverUri && index === 3) onCoverUriChange(undefined);
        },
      );
      return;
    }
    appPrompt.alert('Trip Cover Photo', undefined, [
      { text: 'Choose from Photos', onPress: () => void chooseLibrary() },
      { text: 'Take Photo', onPress: () => void chooseCamera() },
      ...(coverUri
        ? [
            {
              text: 'Remove Photo',
              style: 'destructive' as const,
              onPress: () => onCoverUriChange(undefined),
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={[styles.row, { gap: rs.md }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change trip cover photo"
        onPress={openPicker}
        style={({ pressed }) => [
          styles.thumb,
          {
            width: size,
            height: size,
            borderRadius: Math.max(16, s(16)),
            backgroundColor: chrome.icons.flight.bg,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        {preview ? (
          <Image
            source={{ uri: preview }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            recyclingKey={preview}
          />
        ) : (
          <Symbol name="flight" size="md" color={chrome.icons.flight.fg} />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change trip cover photo"
        onPress={openPicker}
        style={({ pressed }) => [styles.copy, { opacity: pressed ? 0.7 : 1 }]}>
        <AppText
          style={[styles.label, { color: chrome.title }]}
          fit
          numberOfLines={1}>
          Cover Photo
        </AppText>
        <AppText variant="caption" style={{ color: chrome.subtitle }} numberOfLines={2}>
          Shown on your trip card. Tap to change.
        </AppText>
      </Pressable>
      <TravelSheetIconControl
        icon="edit"
        size={36}
        tone="accent"
        accessibilityLabel="Change trip cover photo"
        onPress={openPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontFamily: fontFamilies.serif,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
});
