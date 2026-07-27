import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Recovers an image selection that was lost because Android destroyed the
 * activity while the system picker was open. Runs once on mount and calls
 * `onRecovered` with the picked image URI, if one is pending.
 *
 * See https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/#imagepickergetpendingresultasync
 */
export function usePendingImagePickerResult(onRecovered: (uri: string) => void) {
  const callbackRef = useRef(onRecovered);
  useEffect(() => {
    callbackRef.current = onRecovered;
  });

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = true;
    void ImagePicker.getPendingResultAsync().then((pending) => {
      if (!active || !pending || 'code' in pending || pending.canceled) return;
      const uri = pending.assets[0]?.uri;
      if (uri) callbackRef.current(uri);
    });
    return () => {
      active = false;
    };
  }, []);
}
