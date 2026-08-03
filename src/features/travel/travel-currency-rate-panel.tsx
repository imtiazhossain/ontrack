import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { appTextStyle, fontFamilies, radii } from '@/design-system';
import { currencySheetChrome } from '@/features/travel/travel-currency-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';
import { numericOnChangeText, sanitizeNumericInput } from '@/utils/parse';

type TravelCurrencyRatePanelProps = {
  originCurrency: string;
  destinationCurrency: string;
  rateText: string;
  onRateChange: (text: string) => void;
  isCustom: boolean;
  marketRateLabel?: string;
  sourceLabel?: string;
  statusLabel?: string;
  refreshing?: boolean;
  unavailable?: boolean;
  inputAccessoryViewID?: string;
  onRefresh: () => void;
  onUseMarket: () => void;
  /** Called when rate edit focus begins or ends. */
  onEditingChange?: (editing: boolean) => void;
};

/**
 * Exchange-rate row — one nested Text equation (shared baseline) plus a
 * hidden TextInput so the rate stays editable without TextInput vertical drift.
 * Tapping away (keyboard dismiss / outside blur) ends edit mode.
 */
export function TravelCurrencyRatePanel({
  originCurrency,
  destinationCurrency,
  rateText,
  onRateChange,
  isCustom,
  marketRateLabel,
  sourceLabel,
  statusLabel,
  refreshing,
  unavailable,
  inputAccessoryViewID,
  onRefresh,
  onUseMarket,
  onEditingChange,
}: TravelCurrencyRatePanelProps) {
  const theme = useTheme();
  const chrome = currencySheetChrome(theme);
  const { s, spacing: rs, layout } = useResponsive();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const refreshSize = Math.max(40, s(44));
  const pillMin = Math.max(36, s(36));
  const rateSize = Math.max(16, s(17));
  const rateLine = Math.max(22, s(24));
  const showUnderline = focused || isCustom;
  const cleanRateText = sanitizeNumericInput(rateText);

  const setEditing = useCallback(
    (next: boolean) => {
      setFocused(next);
      onEditingChange?.(next);
    },
    [onEditingChange],
  );

  const endEditing = useCallback(() => {
    inputRef.current?.blur();
    setEditing(false);
    Keyboard.dismiss();
  }, [setEditing]);

  useEffect(() => {
    if (cleanRateText !== rateText) onRateChange(cleanRateText);
  }, [cleanRateText, onRateChange, rateText]);

  useEffect(() => {
    const event = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const sub = Keyboard.addListener(event, () => setEditing(false));
    return () => sub.remove();
  }, [setEditing]);

  const status = unavailable
    ? 'Enter a rate to convert offline'
    : isCustom
      ? marketRateLabel
        ? `Custom rate · Market is ${marketRateLabel}`
        : 'Custom rate'
      : focused
        ? 'Editing rate for this conversion'
        : statusLabel
          ? `${statusLabel} · Tap rate to edit`
          : 'Live rate · Tap rate to edit';

  const equationStyle = {
    fontFamily: fontFamilies.serif,
    fontSize: rateSize,
    lineHeight: rateLine,
  };

  const focusRate = () => {
    haptics.select();
    inputRef.current?.focus();
  };

  return (
    <View style={[styles.row, { gap: rs.md }]}>
      <View style={[styles.copy, { gap: rs.xs, flex: 1, minWidth: 0 }]}>
        <AppText
          variant="overline"
          fit
          numberOfLines={1}
          style={[styles.eyebrow, { color: chrome.label }]}>
          EXCHANGE RATE (Editable)
        </AppText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Exchange rate: one ${originCurrency} equals ${cleanRateText || '0.00'} ${destinationCurrency}. Tap to edit.`}
          onPress={focusRate}
          style={[
            styles.equationHit,
            { minHeight: Math.max(layout.minTapTarget - 8, rateLine + s(6)) },
          ]}>
          <Text
            numberOfLines={1}
            style={[
              equationStyle,
              {
                color: chrome.title,
                fontWeight: '600',
                flexShrink: 1,
                minWidth: 0,
              },
            ]}>
            <Text style={{ color: chrome.subtitle, fontWeight: '600' }}>
              {`1 ${originCurrency} = `}
            </Text>
            <Text
              style={{
                color: chrome.title,
                fontWeight: '600',
                textDecorationLine: showUnderline ? 'underline' : 'none',
                textDecorationColor: chrome.accent,
              }}>
              {cleanRateText || '0.00'}
            </Text>
            <Text style={{ color: chrome.title, fontWeight: '600' }}>
              {` ${destinationCurrency}`}
            </Text>
          </Text>
        </Pressable>

        <TextInput
          ref={inputRef}
          accessibilityLabel={`Exchange rate: one ${originCurrency} in ${destinationCurrency}`}
          value={cleanRateText}
          onChangeText={numericOnChangeText(onRateChange)}
          onFocus={() => setEditing(true)}
          onBlur={() => setEditing(false)}
          placeholder="0.00"
          placeholderTextColor={chrome.placeholder}
          keyboardType="decimal-pad"
          returnKeyType="done"
          blurOnSubmit
          selectTextOnFocus
          onSubmitEditing={endEditing}
          inputAccessoryViewID={
            Platform.OS === 'ios' ? inputAccessoryViewID : undefined
          }
          selectionColor={chrome.accent}
          style={styles.hiddenInput}
        />

        <AppText
          variant="caption"
          fit
          numberOfLines={1}
          style={{ color: chrome.subtitle, flexShrink: 1, minWidth: 0 }}>
          {status}
        </AppText>
      </View>

      <View style={[styles.actions, { gap: rs.sm }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            isCustom ? 'Use market exchange rate' : `${sourceLabel ?? 'Market'} rate`
          }
          hitSlop={6}
          onPress={() => {
            haptics.select();
            endEditing();
            if (isCustom) onUseMarket();
          }}
          style={({ pressed }) => [
            styles.marketPill,
            {
              minHeight: Math.max(layout.minTapTarget - 4, pillMin),
              paddingHorizontal: rs.md,
              borderRadius: radii.pill,
              backgroundColor: chrome.softBg,
              gap: rs.xs,
              opacity: pressed ? 0.75 : 1,
            },
          ]}>
          <Symbol
            name={isCustom ? 'edit' : 'insights'}
            size="sm"
            color={chrome.accent}
          />
          <AppText
            variant="caption"
            fit
            numberOfLines={1}
            style={{ color: chrome.accent, fontWeight: '600' }}>
            {isCustom ? 'Custom' : sourceLabel ?? 'Market'}
          </AppText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh exchange rates"
          hitSlop={8}
          disabled={refreshing}
          onPress={() => {
            haptics.tap();
            endEditing();
            onRefresh();
          }}
          style={({ pressed }) => [
            styles.refresh,
            {
              width: refreshSize,
              height: refreshSize,
              borderRadius: refreshSize / 2,
              backgroundColor: chrome.softBg,
              opacity: pressed || refreshing ? 0.7 : 1,
            },
          ]}>
          <Symbol name="repeat" size="sm" color={chrome.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copy: {
    flexShrink: 1,
  },
  eyebrow: {
    ...appTextStyle('overline'),
    letterSpacing: 1.2,
  },
  equationHit: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    justifyContent: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  marketPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  refresh: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
