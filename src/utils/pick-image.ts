import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';

import { appPrompt } from '@/components/primitives';

export type PickImageOptions = {
  quality?: number;
  allowsEditing?: boolean;
  aspect?: [number, number];
  /** Shown when camera permission is denied (settings prompt). */
  cameraDeniedMessage?: string;
  /** Shown when library permission is denied (settings prompt). */
  libraryDeniedMessage?: string;
  /**
   * When set, called instead of the Settings prompt on denial.
   * Use for screens that surface their own ErrorMessage.
   */
  onDenied?: () => void;
};

export type PickedImageAsset = {
  uri: string;
  fileName?: string;
  fileSize?: number;
};

export type PickLibraryImagesOptions = PickImageOptions & {
  /** Max images when multi-select is enabled. */
  selectionLimit?: number;
  allowsMultipleSelection?: boolean;
  orderedSelection?: boolean;
};

const DEFAULT_CAMERA_DENIED =
  'Allow camera access in Settings to take a photo.';
const DEFAULT_LIBRARY_DENIED =
  'Allow photo library access in Settings to choose an image.';

function launchOptions(options: PickImageOptions = {}) {
  return {
    mediaTypes: ['images'] as ImagePicker.MediaType[],
    quality: options.quality ?? 0.9,
    allowsEditing: options.allowsEditing ?? false,
    aspect: options.aspect,
    // Avoid FailedToReadImageException on iOS for some PNG/HEIC assets
    // ("Cannot load representation of type public.png").
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  };
}

function handleDenied(
  options: PickImageOptions,
  title: string,
  message: string,
) {
  if (options.onDenied) {
    options.onDenied();
    return;
  }
  appPrompt.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

function handlePickFailure(error: unknown, action: 'camera' | 'library') {
  if (__DEV__) {
    console.warn(`[pick-image] ${action} failed`, error);
  }
  appPrompt.alert(
    'Couldn’t add photo',
    'That image couldn’t be read. Try another photo, or take a new one.',
  );
}

/** Returns a local image URI from the camera, or undefined if cancelled/denied. */
export async function pickCameraImage(
  options: PickImageOptions = {},
): Promise<string | undefined> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      handleDenied(
        options,
        'Camera access needed',
        options.cameraDeniedMessage ?? DEFAULT_CAMERA_DENIED,
      );
      return undefined;
    }
    const result = await ImagePicker.launchCameraAsync(launchOptions(options));
    if (result.canceled) return undefined;
    return result.assets[0]?.uri;
  } catch (error) {
    handlePickFailure(error, 'camera');
    return undefined;
  }
}

/** Returns a local image URI from the library, or undefined if cancelled/denied. */
export async function pickLibraryImage(
  options: PickImageOptions = {},
): Promise<string | undefined> {
  const assets = await pickLibraryImages({
    ...options,
    allowsMultipleSelection: false,
    selectionLimit: 1,
  });
  return assets?.[0]?.uri;
}

/**
 * Returns one or more library images, or undefined if cancelled/denied.
 * Use for multi-select flows (e.g. flight confirmation screenshots).
 */
export async function pickLibraryImages(
  options: PickLibraryImagesOptions = {},
): Promise<PickedImageAsset[] | undefined> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      handleDenied(
        options,
        'Photos access needed',
        options.libraryDeniedMessage ?? DEFAULT_LIBRARY_DENIED,
      );
      return undefined;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      ...launchOptions(options),
      allowsMultipleSelection: options.allowsMultipleSelection ?? false,
      orderedSelection: options.orderedSelection ?? false,
      selectionLimit: options.selectionLimit,
    });
    if (result.canceled) return undefined;
    return result.assets.map((asset) => ({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      fileSize: asset.fileSize,
    }));
  } catch (error) {
    handlePickFailure(error, 'library');
    return undefined;
  }
}
