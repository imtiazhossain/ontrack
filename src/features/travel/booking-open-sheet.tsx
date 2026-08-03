import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';

import type { StayBookingOpen } from '@/features/travel/booking-open';
import type { TravelSheetHeader } from '@/features/travel/travel-sheet';

type WebViewOpen = Extract<StayBookingOpen, { mode: 'webview' }>;

interface BookingOpenSheetProps {
  target: WebViewOpen | null;
  onClose: () => void;
}

export function BookingOpenSheet({ target, onClose }: BookingOpenSheetProps) {
  useEffect(() => {
    if (!target) return;
    let mounted = true;
    void WebBrowser.openBrowserAsync(target.url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    }).finally(() => {
      if (mounted) {
        onClose();
      }
    });
    return () => {
      mounted = false;
    };
  }, [target, onClose]);

  return null;
}

