import { useCallback, useState } from 'react';
import type {
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
  TextStyle,
} from 'react-native';

/**
 * Grow a multiline note input with its own value. iOS also reports the
 * placeholder's content size, so an empty value must collapse back to the
 * stacked field row instead of reserving blank space.
 */
export function useAutoGrowingNote(value: string, minHeight: number) {
  const [height, setHeight] = useState(minHeight);
  const hasText = Boolean(value.trim());

  const onContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      if (!hasText) {
        setHeight(minHeight);
        return;
      }
      const measured = Math.max(
        minHeight,
        Math.ceil(event.nativeEvent.contentSize.height),
      );
      setHeight((current) => (measured === current ? current : measured));
    },
    [hasText, minHeight],
  );

  /** Call from `onChangeText` so clearing the field snaps back immediately. */
  const collapseWhenEmpty = useCallback(
    (next: string) => {
      if (!next.trim()) setHeight(minHeight);
    },
    [minHeight],
  );

  const style: TextStyle | undefined = hasText
    ? { minHeight: Math.max(minHeight, height) }
    : undefined;

  return { style, onContentSizeChange, collapseWhenEmpty };
}
