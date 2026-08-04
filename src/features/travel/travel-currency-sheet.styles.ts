import { StyleSheet } from 'react-native';

export const travelCurrencySheetStyles = StyleSheet.create({
  accessory: { alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth },
  swapRow: { alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  swapButton: {
    alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
  },
  summary: { flexDirection: 'row', alignItems: 'center', borderCurve: 'continuous' },
  summaryBadge: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doneButton: {
    alignItems: 'center', justifyContent: 'center', borderCurve: 'continuous',
  },
});
