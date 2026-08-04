import type { PropsWithChildren, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { SheetHeader, SheetScaffold } from '@/components/primitives';
import type { AppIconName } from '@/design-system';
import type { ItinerarySheetChrome } from '@/features/travel/travel-itinerary-sheet-chrome';

type TravelSheetHeaderProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  onClose: () => void;
  closeAccessibilityLabel: string;
  closeTestID?: string;
  /** Kept for source compatibility; shared semantic chrome now owns presentation. */
  chrome?: ItinerarySheetChrome;
  paddingTop?: number;
};

/** Travel compatibility wrapper around the canonical shared sheet header. */
export function TravelSheetHeader({
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  onClose,
  closeAccessibilityLabel,
  closeTestID,
  paddingTop,
}: TravelSheetHeaderProps) {
  return (
    <SheetHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      subtitleIcon={subtitleIcon}
      onClose={onClose}
      closeAccessibilityLabel={closeAccessibilityLabel}
      closeTestID={closeTestID}
      style={paddingTop == null ? undefined : { paddingTop }}
    />
  );
}

type TravelSheetModalProps = PropsWithChildren<{
  visible: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  subtitleIcon?: AppIconName;
  onClose: () => void;
  closeAccessibilityLabel: string;
  closeTestID?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  maxHeight?: number;
  minHeight?: number;
  lockHeight?: boolean;
  scrollKey?: string | number;
  /** Kept for source compatibility; feature chrome no longer restyles controls. */
  chrome?: ItinerarySheetChrome;
}>;

/** Every Travel sheet now inherits the app-wide safe area, X, body, and footer contract. */
export function TravelSheetModal({
  visible,
  eyebrow,
  title,
  subtitle,
  subtitleIcon,
  onClose,
  closeAccessibilityLabel,
  closeTestID,
  contentContainerStyle,
  footer,
  maxHeight,
  minHeight,
  lockHeight,
  scrollKey,
  children,
}: TravelSheetModalProps) {
  return (
    <SheetScaffold
      visible={visible}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      subtitleIcon={subtitleIcon}
      onClose={onClose}
      closeAccessibilityLabel={closeAccessibilityLabel}
      closeTestID={closeTestID}
      contentContainerStyle={contentContainerStyle}
      footer={footer}
      maxHeight={maxHeight}
      minHeight={minHeight}
      lockHeight={lockHeight}
      scrollKey={scrollKey}>
      {children}
    </SheetScaffold>
  );
}
