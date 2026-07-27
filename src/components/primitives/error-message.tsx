import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  type Text,
} from 'react-native';

import { AppText, type AppTextProps } from './app-text';

export interface ErrorMessageProps
  extends Omit<AppTextProps, 'accessibilityLabel' | 'accessibilityRole' | 'children' | 'color'> {
  message: string;
}

export function ErrorMessage({
  message,
  variant = 'callout',
  ...rest
}: ErrorMessageProps) {
  const ref = useRef<Text>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const reactTag = findNodeHandle(ref.current);
      if (reactTag) AccessibilityInfo.setAccessibilityFocus(reactTag);
      AccessibilityInfo.announceForAccessibility(`Error: ${message}`);
    }, 100);

    return () => clearTimeout(timeout);
  }, [message]);

  return (
    <AppText
      ref={ref}
      variant={variant}
      color="danger"
      accessibilityLabel={`Error: ${message}`}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      {...rest}
    >
      {message}
    </AppText>
  );
}
