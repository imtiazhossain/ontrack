import { useId, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Symbol } from '@/components/primitives';
import {
  FieldLeadingIcon,
  fieldLeadingIconRowStyle,
} from '@/components/primitives/field-leading-icon';
import { borders, radii, spacing, type AppIconName } from '@/design-system';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/utils/haptics';

import { normalizeCurrencyCode } from './format-money';

/** Display names for Frankfurter v1 currencies. */
export const CURRENCY_LABELS: Record<string, string> = {
  AUD: 'Australian Dollar',
  BRL: 'Brazilian Real',
  CAD: 'Canadian Dollar',
  CHF: 'Swiss Franc',
  CNY: 'Chinese Yuan',
  CZK: 'Czech Koruna',
  DKK: 'Danish Krone',
  EUR: 'Euro',
  GBP: 'British Pound',
  HKD: 'Hong Kong Dollar',
  HUF: 'Hungarian Forint',
  IDR: 'Indonesian Rupiah',
  ILS: 'Israeli Shekel',
  INR: 'Indian Rupee',
  ISK: 'Icelandic Króna',
  JPY: 'Japanese Yen',
  KRW: 'South Korean Won',
  MXN: 'Mexican Peso',
  MYR: 'Malaysian Ringgit',
  NOK: 'Norwegian Krone',
  NZD: 'New Zealand Dollar',
  PHP: 'Philippine Peso',
  PLN: 'Polish Złoty',
  RON: 'Romanian Leu',
  SEK: 'Swedish Krona',
  SGD: 'Singapore Dollar',
  THB: 'Thai Baht',
  TRY: 'Turkish Lira',
  USD: 'US Dollar',
  ZAR: 'South African Rand',
};

export function currencyDisplayLabel(code: string): string {
  const normalized = normalizeCurrencyCode(code);
  const name = CURRENCY_LABELS[normalized];
  return name ? `${normalized} · ${name}` : normalized;
}

/** ISO 3166-1 alpha-2 used for flag emoji (best-effort for FX codes). */
const CURRENCY_FLAG_REGION: Record<string, string> = {
  AUD: 'AU',
  BRL: 'BR',
  CAD: 'CA',
  CHF: 'CH',
  CNY: 'CN',
  CZK: 'CZ',
  DKK: 'DK',
  EUR: 'EU',
  GBP: 'GB',
  HKD: 'HK',
  HUF: 'HU',
  IDR: 'ID',
  ILS: 'IL',
  INR: 'IN',
  ISK: 'IS',
  JPY: 'JP',
  KRW: 'KR',
  MXN: 'MX',
  MYR: 'MY',
  NOK: 'NO',
  NZD: 'NZ',
  PHP: 'PH',
  PLN: 'PL',
  RON: 'RO',
  SEK: 'SE',
  SGD: 'SG',
  THB: 'TH',
  TRY: 'TR',
  USD: 'US',
  ZAR: 'ZA',
};

export function currencyFlagEmoji(code: string): string {
  const region = CURRENCY_FLAG_REGION[normalizeCurrencyCode(code)];
  if (!region) return '🏳️';
  if (region === 'EU') return '🇪🇺';
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[...region].map((char) => base + char.charCodeAt(0) - 65),
  );
}

/** Narrow currency glyph for circular badges ($ / € / kr). */
const CURRENCY_NARROW_SYMBOL: Record<string, string> = {
  AUD: '$',
  BRL: 'R$',
  CAD: '$',
  CHF: 'Fr',
  CNY: '¥',
  CZK: 'Kč',
  DKK: 'kr',
  EUR: '€',
  GBP: '£',
  HKD: '$',
  HUF: 'Ft',
  IDR: 'Rp',
  ILS: '₪',
  INR: '₹',
  ISK: 'kr',
  JPY: '¥',
  KRW: '₩',
  MXN: '$',
  MYR: 'RM',
  NOK: 'kr',
  NZD: '$',
  PHP: '₱',
  PLN: 'zł',
  RON: 'lei',
  SEK: 'kr',
  SGD: '$',
  THB: '฿',
  TRY: '₺',
  USD: '$',
  ZAR: 'R',
};

export function currencyNarrowSymbol(code: string): string {
  const normalized = normalizeCurrencyCode(code);
  if (CURRENCY_NARROW_SYMBOL[normalized]) return CURRENCY_NARROW_SYMBOL[normalized];
  try {
    const part = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: normalized,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((entry) => entry.type === 'currency');
    if (part?.value && part.value !== normalized) return part.value;
  } catch {
    // fall through
  }
  return normalized;
}

type DropdownOption = { value: string; label: string };

/**
 * Inline expandable dropdown with a scrollable option list.
 * Prefer this over centered action-sheet menus for long lists.
 */
export function ScrollableDropdown({
  label,
  value,
  options,
  onChange,
  open,
  onOpenChange,
  icon,
  iconBackground,
  iconColor,
  fieldBackground,
  labelColor,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  /** Controlled open state — when set, parent coordinates exclusive open. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  icon?: AppIconName;
  iconBackground?: string;
  iconColor?: string;
  fieldBackground?: string;
  labelColor?: string;
}) {
  const theme = useTheme();
  const { s, spacing: rs } = useResponsive();
  const listId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = open ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (open === undefined) setUncontrolledOpen(next);
  };

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  const toggle = () => {
    haptics.select();
    setOpen(!isOpen);
  };

  const choose = (next: string) => {
    haptics.select();
    if (next !== value) onChange(next);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel}`}
        accessibilityHint="Opens a scrollable list of options"
        accessibilityState={{ expanded: isOpen }}
        onPress={toggle}
        style={({ pressed }) => [
          styles.field,
          fieldLeadingIconRowStyle({
            minHeight: icon ? Math.max(56, s(60)) : 58,
            paddingHorizontal: icon ? rs.md : spacing.md,
            paddingVertical: icon ? rs.sm : spacing.sm,
            backgroundColor: fieldBackground ?? theme.backgroundSunken,
            borderColor: isOpen
              ? theme.accentPrimary
              : icon
                ? 'transparent'
                : theme.separator,
            opacity: pressed ? 0.86 : 1,
          }),
        ]}>
        {icon ? (
          <FieldLeadingIcon
            name={icon}
            backgroundColor={iconBackground}
            color={iconColor}
          />
        ) : null}
        <View style={styles.fieldCopy}>
          <AppText
            variant={icon ? 'caption' : 'overline'}
            color={icon ? undefined : 'tertiary'}
            fit
            numberOfLines={1}
            style={icon ? { color: labelColor, fontWeight: '600' } : travelOverlineStyle}>
            {label}
          </AppText>
          <AppText variant={icon ? 'body' : 'callout'} fit numberOfLines={1}>
            {selectedLabel}
          </AppText>
        </View>
        <Symbol
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size="sm"
          color={theme.textTertiary}
        />
      </Pressable>

      {isOpen ? (
        <View
          style={[
            styles.menu,
            {
              backgroundColor: theme.backgroundElevated,
              borderColor: theme.separator,
            },
          ]}>
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={styles.menuScroll}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={`${listId}-${option.value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => choose(option.value)}
                  style={({ pressed }) => [
                    styles.option,
                    {
                      backgroundColor: active
                        ? theme.accentFaint
                        : pressed
                          ? theme.backgroundSunken
                          : 'transparent',
                    },
                  ]}>
                  <AppText
                    variant="callout"
                    color={active ? 'accent' : 'primary'}
                    numberOfLines={1}>
                    {option.label}
                  </AppText>
                  {active ? (
                    <Symbol name="check" size="sm" color={theme.accentPrimary} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

export function CurrencyDropdown({
  label,
  value,
  options,
  onChange,
  open,
  onOpenChange,
  ...chromeProps
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (currency: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & Pick<
  Parameters<typeof ScrollableDropdown>[0],
  'icon' | 'iconBackground' | 'iconColor' | 'fieldBackground' | 'labelColor'
>) {
  return (
    <ScrollableDropdown
      label={label}
      value={normalizeCurrencyCode(value)}
      options={options}
      onChange={onChange}
      open={open}
      onOpenChange={onOpenChange}
      {...chromeProps}
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    zIndex: 2,
  },
  field: {
    minHeight: 58,
    borderWidth: borders.thin,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  fieldCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  menu: {
    borderWidth: borders.thin,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: 220,
  },
  menuContent: {
    paddingVertical: spacing.xs,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
