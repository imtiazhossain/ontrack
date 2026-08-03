import { useId, useState } from 'react';
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import { fontFamilies, radii } from '@/design-system';
import {
  currencyDisplayLabel,
  currencyFlagEmoji,
  currencyNarrowSymbol,
} from '@/features/travel/expenses/currency-dropdown';
import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import { currencySheetChrome } from '@/features/travel/travel-currency-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';
import { numericOnChangeText, sanitizeNumericInput } from '@/utils/parse';

type CurrencyOption = { value: string; label: string };

type TravelCurrencySideCardProps = {
  sideLabel: string;
  amountLabel: string;
  currency: string;
  options: CurrencyOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCurrencyChange: (currency: string) => void;
  amountText: string;
  onAmountChange: (text: string) => void;
  onAmountFocus: () => void;
  inputAccessoryViewID?: string;
};

/**
 * Unified From/To card: currency picker row + amount row (Convert Currency mock).
 */
export function TravelCurrencySideCard({
  sideLabel,
  amountLabel,
  currency,
  options,
  open,
  onOpenChange,
  onCurrencyChange,
  amountText,
  onAmountChange,
  onAmountFocus,
  inputAccessoryViewID,
}: TravelCurrencySideCardProps) {
  const theme = useTheme();
  const chrome = currencySheetChrome(theme);
  const { s, spacing: rs, layout, typography } = useResponsive();
  const listId = useId();
  const [amountFocused, setAmountFocused] = useState(false);
  const code = normalizeCurrencyCode(currency);
  const badgeSize = Math.max(40, s(44));
  const flagSize = Math.max(28, s(32));
  const symbol = currencyNarrowSymbol(code);
  const amountSize = Math.max(28, s(32));
  const amountLine = Math.max(34, s(38));

  const toggle = () => {
    haptics.select();
    Keyboard.dismiss();
    onOpenChange(!open);
  };

  const choose = (next: string) => {
    haptics.select();
    if (next !== code) onCurrencyChange(next);
    onOpenChange(false);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: chrome.cardBg,
          borderColor: chrome.fieldBorder,
          borderRadius: radii.lg,
          zIndex: open ? 4 : 1,
        },
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${sideLabel}: ${currencyDisplayLabel(code)}`}
        accessibilityHint="Opens a scrollable list of currencies"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ pressed }) => [
          styles.currencyRow,
          {
            paddingHorizontal: rs.lg,
            paddingVertical: rs.md,
            gap: rs.md,
            minHeight: Math.max(layout.minTapTarget, s(56)),
            opacity: pressed ? 0.86 : 1,
          },
        ]}>
        <View
          style={[
            styles.flag,
            {
              width: flagSize,
              height: flagSize,
              borderRadius: radii.sm,
              backgroundColor: chrome.softBg,
            },
          ]}>
          <Text style={{ fontSize: Math.max(16, s(18)), lineHeight: Math.max(20, s(22)) }}>
            {currencyFlagEmoji(code)}
          </Text>
        </View>
        <View style={[styles.currencyCopy, { gap: 2, flex: 1, minWidth: 0 }]}>
          <AppText
            variant="caption"
            fit
            numberOfLines={1}
            style={{ color: chrome.label }}>
            {sideLabel}
          </AppText>
          <AppText
            variant="callout"
            fit
            numberOfLines={1}
            style={{ color: chrome.title, fontWeight: '600', flexShrink: 1, minWidth: 0 }}>
            {currencyDisplayLabel(code)}
          </AppText>
        </View>
        <Symbol
          name={open ? 'chevron-up' : 'chevron-down'}
          size="sm"
          color={chrome.label}
        />
      </Pressable>

      {open ? (
        <View
          style={[
            styles.menu,
            {
              borderTopColor: chrome.fieldBorder,
              backgroundColor: chrome.cardBg,
            },
          ]}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.menuScroll}
            contentContainerStyle={{ paddingVertical: rs.xs }}
            showsVerticalScrollIndicator>
            {options.map((option) => {
              const active = option.value === code;
              return (
                <Pressable
                  key={`${listId}-${option.value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => choose(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      minHeight: Math.max(44, s(44)),
                      paddingHorizontal: rs.lg,
                      paddingVertical: rs.sm,
                      gap: rs.sm,
                      backgroundColor: active
                        ? chrome.softBg
                        : pressed
                          ? chrome.softBg
                          : 'transparent',
                    },
                  ]}>
                  <Text style={{ fontSize: Math.max(15, s(16)) }}>
                    {currencyFlagEmoji(option.value)}
                  </Text>
                  <AppText
                    variant="callout"
                    fit
                    numberOfLines={1}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      color: active ? chrome.accent : chrome.title,
                    }}>
                    {option.label}
                  </AppText>
                  {active ? (
                    <Symbol name="check" size="sm" color={chrome.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View
        style={[
          styles.amountRow,
          {
            borderTopColor: chrome.fieldBorder,
            paddingHorizontal: rs.lg,
            paddingVertical: rs.md,
            gap: rs.md,
            minHeight: Math.max(64, s(72)),
          },
        ]}>
        <View
          style={[
            styles.symbolBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: chrome.accent,
            },
          ]}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{
              color: chrome.onAccent,
              fontFamily: fontFamilies.serif,
              fontSize: symbol.length > 2 ? Math.max(11, s(12)) : Math.max(16, s(18)),
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {symbol}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText
            variant="caption"
            fit
            numberOfLines={1}
            style={{ color: chrome.label }}>
            {amountLabel}
          </AppText>
          <TextInput
            accessibilityLabel={amountLabel}
            value={sanitizeNumericInput(amountText)}
            onChangeText={numericOnChangeText(onAmountChange)}
            onFocus={() => {
              setAmountFocused(true);
              onAmountFocus();
            }}
            onBlur={() => setAmountFocused(false)}
            placeholder="0.00"
            placeholderTextColor={chrome.placeholder}
            keyboardType="decimal-pad"
            returnKeyType="done"
            blurOnSubmit
            selectTextOnFocus
            onSubmitEditing={Keyboard.dismiss}
            selectionColor={chrome.accent}
            inputAccessoryViewID={
              Platform.OS === 'ios' ? inputAccessoryViewID : undefined
            }
            style={[
              typography.title,
              {
                padding: 0,
                paddingBottom: amountFocused ? s(2) : 0,
                margin: 0,
                color: chrome.accent,
                fontFamily: fontFamilies.serif,
                fontSize: amountSize,
                lineHeight: amountLine,
                minWidth: 0,
                alignSelf: 'stretch',
                borderBottomWidth: 1.5,
                borderBottomColor: amountFocused
                  ? chrome.accent
                  : 'transparent',
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    borderCurve: 'continuous',
  },
  currencyCopy: {
    flexShrink: 1,
  },
  menu: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuScroll: {
    maxHeight: 200,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  symbolBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
