import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  AppState,
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Button, LoadingBlock, Symbol } from '@/components/primitives';
import { radii } from '@/design-system';
import { currencyPairForTrip } from '@/features/travel/currency-for-destination';
import { currencyDisplayLabel } from '@/features/travel/expenses/currency-dropdown';
import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import {
  convertAmount,
  currencyOptionsForTrip,
  loadFxRates,
  type FxRates,
} from '@/features/travel/expenses/fx-rates';
import {
  currencyAsItineraryChrome,
  currencySheetChrome,
} from '@/features/travel/travel-currency-chrome';
import { TravelCurrencyRatePanel } from '@/features/travel/travel-currency-rate-panel';
import { TravelCurrencySideCard } from '@/features/travel/travel-currency-side-card';
import { TravelSheetModal } from '@/features/travel/travel-sheet';
import type { TravelPlan } from '@/features/travel/types';
import { useResponsive } from '@/hooks/use-responsive';
import { useTheme } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { haptics } from '@/utils/haptics';
import { sanitizeNumericInput } from '@/utils/parse';

type ActiveSide = 'origin' | 'destination';

function formatAmountInput(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  const rounded = Math.round(amount * 100) / 100;
  try {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(rounded);
  } catch {
    return rounded.toFixed(2);
  }
}

function parseAmountText(text: string): number | undefined {
  const cleaned = text.replace(/,/g, '').trim();
  if (!cleaned) return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

/** `unitRate` is destination units per 1 origin unit. */
function convertWithUnitRate(
  amountText: string,
  from: string,
  to: string,
  originCurrency: string,
  destinationCurrency: string,
  unitRate: number,
): string {
  const amount = parseAmountText(amountText);
  if (amount === undefined || !(unitRate > 0)) return '';
  if (from === to) return formatAmountInput(amount);
  if (from === originCurrency && to === destinationCurrency) {
    return formatAmountInput(amount * unitRate);
  }
  if (from === destinationCurrency && to === originCurrency) {
    return formatAmountInput(amount / unitRate);
  }
  return '';
}

function formatFxMoney(amount: number, currency: string, locale?: string): string {
  const code = currency.trim().toUpperCase();
  if (!Number.isFinite(amount) || !/^[A-Z]{3}$/.test(code)) {
    return `${code || '?'} ${formatAmountInput(amount)}`;
  }
  try {
    return new Intl.NumberFormat(locale === 'system' ? undefined : locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${code} ${formatAmountInput(amount)}`;
  }
}

function formatRateDate(date: string, locale?: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'system' ? undefined : locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

function formatPlainAmount(amount: number, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale === 'system' ? undefined : locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return formatAmountInput(amount);
  }
}

export function TravelCurrencySheet({
  plan,
  visible,
  onClose,
}: {
  plan: TravelPlan;
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  const chrome = currencySheetChrome(theme);
  const sheetChrome = currencyAsItineraryChrome(theme);
  const { s, spacing: rs, layout } = useResponsive();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const dateLocale = usePreferences((state) => state.dateLocale);
  const accessoryId = useId().replace(/:/g, '');
  const pair = useMemo(
    () => currencyPairForTrip(plan.destination, plan.baseCurrency),
    [plan.destination, plan.baseCurrency],
  );
  const sheetMinHeight = Math.round(
    Math.max(320, windowHeight - insets.top - rs.sm) * 0.92,
  );
  const destinationLabel = plan.destination.trim() || undefined;

  const [rates, setRates] = useState<FxRates | undefined>();
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [originCurrency, setOriginCurrency] = useState(pair.origin);
  const [destinationCurrency, setDestinationCurrency] = useState(pair.destination);
  const [originText, setOriginText] = useState('100.00');
  const [destinationText, setDestinationText] = useState('');
  const [rateText, setRateText] = useState('');
  const [rateOverride, setRateOverride] = useState<number | undefined>();
  const [activeSide, setActiveSide] = useState<ActiveSide>('origin');
  const [openDropdown, setOpenDropdown] = useState<'origin' | 'destination' | null>(null);

  const marketRate = rates
    ? convertAmount(1, originCurrency, destinationCurrency, rates)
    : undefined;
  const effectiveRate = rateOverride ?? marketRate;
  const isCustomRate = rateOverride !== undefined;

  const recomputeAmounts = useCallback(
    (
      side: ActiveSide,
      nextOriginText: string,
      nextDestinationText: string,
      nextOriginCurrency: string,
      nextDestinationCurrency: string,
      unitRate: number | undefined,
    ) => {
      if (!(unitRate !== undefined && unitRate > 0)) {
        if (side === 'origin') setDestinationText('');
        else setOriginText('');
        return;
      }
      if (side === 'origin') {
        setDestinationText(
          convertWithUnitRate(
            nextOriginText,
            nextOriginCurrency,
            nextDestinationCurrency,
            nextOriginCurrency,
            nextDestinationCurrency,
            unitRate,
          ),
        );
        return;
      }
      setOriginText(
        convertWithUnitRate(
          nextDestinationText,
          nextDestinationCurrency,
          nextOriginCurrency,
          nextOriginCurrency,
          nextDestinationCurrency,
          unitRate,
        ),
      );
    },
    [],
  );

  const syncRateTextFromMarket = useCallback((nextMarket: number | undefined) => {
    if (nextMarket !== undefined && nextMarket > 0) {
      setRateText(formatAmountInput(nextMarket));
    } else {
      setRateText('');
    }
  }, []);

  const refreshRates = useCallback(
    async (options?: {
      force?: boolean;
      signal?: AbortSignal;
      soft?: boolean;
      clearOverride?: boolean;
    }) => {
      const force = options?.force ?? true;
      if (options?.soft) setRefreshing(true);
      else setLoading(true);
      try {
        if (force) {
          const cached = await loadFxRates({ force: false, signal: options?.signal });
          if (!options?.signal?.aborted && cached.rates) {
            setRates(cached.rates);
            setStale(true);
            setLoading(false);
          }
        }
        const result = await loadFxRates({ force, signal: options?.signal });
        if (options?.signal?.aborted) return;
        setRates(result.rates);
        setStale(result.stale);
        if (options?.clearOverride) setRateOverride(undefined);
      } catch {
        // Keep whatever rates we already show.
      } finally {
        if (!options?.signal?.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!visible) return;
    const next = currencyPairForTrip(plan.destination, plan.baseCurrency);
    setOriginCurrency(next.origin);
    setDestinationCurrency(next.destination);
    setOriginText('100.00');
    setDestinationText('');
    setRateText('');
    setRateOverride(undefined);
    setActiveSide('origin');
    setOpenDropdown(null);
  }, [visible, plan.id, plan.destination, plan.baseCurrency]);

  useEffect(() => {
    if (!visible) return;
    const controller = new AbortController();
    void refreshRates({ force: true, signal: controller.signal });
    return () => controller.abort();
  }, [visible, refreshRates]);

  useEffect(() => {
    if (!visible) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshRates({ force: true, soft: true });
      }
    });
    return () => sub.remove();
  }, [visible, refreshRates]);

  // Keep the rate field in sync with market unless the user has overridden it.
  useEffect(() => {
    if (rateOverride !== undefined) return;
    syncRateTextFromMarket(marketRate);
  }, [marketRate, rateOverride, syncRateTextFromMarket]);

  useEffect(() => {
    recomputeAmounts(
      activeSide,
      originText,
      destinationText,
      originCurrency,
      destinationCurrency,
      effectiveRate,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [
    effectiveRate,
    originCurrency,
    destinationCurrency,
    activeSide,
    recomputeAmounts,
  ]);

  const currencyOptions = useMemo(
    () =>
      currencyOptionsForTrip([
        originCurrency,
        destinationCurrency,
        plan.baseCurrency,
      ]).map((option) => ({
        value: option.value,
        label: currencyDisplayLabel(option.value),
      })),
    [originCurrency, destinationCurrency, plan.baseCurrency],
  );

  const swapCurrencies = () => {
    haptics.select();
    Keyboard.dismiss();
    setOpenDropdown(null);
    const nextOrigin = destinationCurrency;
    const nextDestination = originCurrency;
    const nextOriginText = destinationText;
    const nextDestinationText = originText;
    const nextOverride =
      rateOverride !== undefined && rateOverride > 0 ? 1 / rateOverride : undefined;
    setOriginCurrency(nextOrigin);
    setDestinationCurrency(nextDestination);
    setOriginText(nextOriginText);
    setDestinationText(nextDestinationText);
    if (nextOverride !== undefined) {
      setRateOverride(nextOverride);
      setRateText(formatAmountInput(nextOverride));
    } else {
      setRateOverride(undefined);
    }
    setActiveSide(activeSide === 'origin' ? 'destination' : 'origin');
  };

  const onOriginAmountChange = (text: string) => {
    const next = sanitizeNumericInput(text);
    setActiveSide('origin');
    setOriginText(next);
    if (effectiveRate !== undefined && effectiveRate > 0) {
      setDestinationText(
        convertWithUnitRate(
          next,
          originCurrency,
          destinationCurrency,
          originCurrency,
          destinationCurrency,
          effectiveRate,
        ),
      );
    }
  };

  const onDestinationAmountChange = (text: string) => {
    const next = sanitizeNumericInput(text);
    setActiveSide('destination');
    setDestinationText(next);
    if (effectiveRate !== undefined && effectiveRate > 0) {
      setOriginText(
        convertWithUnitRate(
          next,
          destinationCurrency,
          originCurrency,
          originCurrency,
          destinationCurrency,
          effectiveRate,
        ),
      );
    }
  };

  const onOriginCurrencyChange = (currency: string) => {
    const next = normalizeCurrencyCode(currency);
    setActiveSide('origin');
    setOriginCurrency(next);
    setRateOverride(undefined);
  };

  const onDestinationCurrencyChange = (currency: string) => {
    const next = normalizeCurrencyCode(currency);
    setActiveSide('origin');
    setDestinationCurrency(next);
    setRateOverride(undefined);
  };

  const onRateChange = (text: string) => {
    const next = sanitizeNumericInput(text);
    setRateText(next);
    const value = parseAmountText(next);
    if (value !== undefined && value > 0) {
      setRateOverride(value);
      recomputeAmounts(
        activeSide,
        originText,
        destinationText,
        originCurrency,
        destinationCurrency,
        value,
      );
      return;
    }
    if (!next.trim()) {
      setRateOverride(undefined);
    }
  };

  const useMarketRate = () => {
    setRateOverride(undefined);
    syncRateTextFromMarket(marketRate);
    recomputeAmounts(
      activeSide,
      originText,
      destinationText,
      originCurrency,
      destinationCurrency,
      marketRate,
    );
  };

  const originAmount = parseAmountText(originText);
  const convertedPreview =
    effectiveRate !== undefined &&
    effectiveRate > 0 &&
    originAmount !== undefined
      ? originAmount * effectiveRate
      : undefined;

  const summaryPrimary =
    convertedPreview !== undefined && originAmount !== undefined
      ? `${formatFxMoney(originAmount, originCurrency, dateLocale)} = ${formatPlainAmount(convertedPreview, dateLocale)} ${destinationCurrency}`
      : undefined;

  const rateDateLabel = rates ? formatRateDate(rates.date, dateLocale) : undefined;
  const statusLabel = stale
    ? `Cached rate${rateDateLabel ? ` · ${rateDateLabel}` : ''}`
    : rates
      ? `Live rate · Updated just now`
      : undefined;

  const softSurface = chrome.softBg;
  const badgeSize = Math.max(40, s(44));

  return (
    <TravelSheetModal
      visible={visible}
      eyebrow="CURRENCY"
      title="Convert Currency"
      subtitle={destinationLabel}
      subtitleIcon={destinationLabel ? 'location' : undefined}
      onClose={onClose}
      closeAccessibilityLabel="Close currency calculator"
      minHeight={sheetMinHeight}
      scrollKey={`${plan.id}-${visible ? 'open' : 'closed'}`}
      chrome={sheetChrome}
      footer={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => {
            haptics.tap();
            onClose();
          }}
          style={({ pressed }) => [
            styles.doneButton,
            {
              backgroundColor: chrome.accent,
              minHeight: Math.max(layout.minTapTarget, s(52)),
              borderRadius: radii.pill,
              opacity: pressed ? 0.88 : 1,
            },
          ]}>
          <AppText
            variant="callout"
            fit
            numberOfLines={1}
            style={{ color: chrome.onAccent, fontWeight: '600' }}>
            Done
          </AppText>
        </Pressable>
      }>
      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View
            style={[
              styles.accessory,
              {
                backgroundColor: chrome.softBg,
                borderTopColor: chrome.fieldBorder,
                paddingHorizontal: rs.md,
                paddingVertical: rs.sm,
              },
            ]}>
            <Button variant="secondary" onPress={() => Keyboard.dismiss()}>
              Done
            </Button>
          </View>
        </InputAccessoryView>
      ) : null}

      {loading && !rates && rateOverride === undefined ? (
        <LoadingBlock compact label="Loading rates…" />
      ) : (
        <Pressable
          accessible={false}
          onPress={() => Keyboard.dismiss()}
          style={{ gap: rs.lg }}>
          <View>
            <TravelCurrencySideCard
              sideLabel="From"
              amountLabel="You send"
              currency={originCurrency}
              options={currencyOptions}
              open={openDropdown === 'origin'}
              onOpenChange={(next) => {
                Keyboard.dismiss();
                setOpenDropdown(next ? 'origin' : null);
              }}
              onCurrencyChange={onOriginCurrencyChange}
              amountText={originText}
              onAmountChange={onOriginAmountChange}
              onAmountFocus={() => {
                setActiveSide('origin');
              }}
              inputAccessoryViewID={accessoryId}
            />

            <View style={[styles.swapRow, { marginVertical: -rs.sm }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Swap currencies"
                hitSlop={8}
                onPress={swapCurrencies}
                style={({ pressed }) => [
                  styles.swapButton,
                  {
                    width: Math.max(layout.minTapTarget, s(44)),
                    height: Math.max(layout.minTapTarget, s(44)),
                    borderRadius: Math.max(layout.minTapTarget, s(44)) / 2,
                    backgroundColor: chrome.cardBg,
                    borderColor: chrome.fieldBorder,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Symbol name="sort" size="md" color={chrome.accent} />
              </Pressable>
            </View>

            <TravelCurrencySideCard
              sideLabel="To"
              amountLabel="You receive"
              currency={destinationCurrency}
              options={currencyOptions}
              open={openDropdown === 'destination'}
              onOpenChange={(next) => {
                Keyboard.dismiss();
                setOpenDropdown(next ? 'destination' : null);
              }}
              onCurrencyChange={onDestinationCurrencyChange}
              amountText={destinationText}
              onAmountChange={onDestinationAmountChange}
              onAmountFocus={() => {
                setActiveSide('destination');
              }}
              inputAccessoryViewID={accessoryId}
            />
          </View>

          <TravelCurrencyRatePanel
            originCurrency={originCurrency}
            destinationCurrency={destinationCurrency}
            rateText={rateText}
            onRateChange={onRateChange}
            isCustom={isCustomRate}
            marketRateLabel={
              marketRate !== undefined ? formatAmountInput(marketRate) : undefined
            }
            sourceLabel={rates?.sourceLabel}
            statusLabel={statusLabel}
            refreshing={refreshing || (stale && loading)}
            unavailable={!rates && !isCustomRate}
            inputAccessoryViewID={accessoryId}
            onRefresh={() => {
              void refreshRates({ force: true, soft: true, clearOverride: true });
            }}
            onUseMarket={useMarketRate}
          />

          {summaryPrimary ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Summary: ${summaryPrimary}`}
              onPress={() => {
                haptics.select();
                Keyboard.dismiss();
              }}
              style={({ pressed }) => [
                styles.summary,
                {
                  backgroundColor: softSurface,
                  borderRadius: radii.lg,
                  paddingHorizontal: rs.md,
                  paddingVertical: rs.md,
                  gap: rs.md,
                  minHeight: Math.max(layout.minTapTarget, s(64)),
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <View
                style={[
                  styles.summaryBadge,
                  {
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: badgeSize / 2,
                    backgroundColor: chrome.accent,
                  },
                ]}>
                <Symbol name="calculator" size="sm" color={chrome.onAccent} />
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <AppText
                  variant="caption"
                  fit
                  numberOfLines={1}
                  style={{ color: chrome.label }}>
                  Summary
                </AppText>
                <AppText
                  variant="callout"
                  fit
                  numberOfLines={1}
                  style={{
                    color: chrome.title,
                    fontWeight: '600',
                    flexShrink: 1,
                    minWidth: 0,
                  }}>
                  {summaryPrimary}
                </AppText>
                <AppText
                  variant="caption"
                  fit
                  numberOfLines={1}
                  style={{ color: chrome.subtitle, flexShrink: 1, minWidth: 0 }}>
                  {isCustomRate
                    ? `Custom rate${rateDateLabel ? ` · ${rateDateLabel}` : ''}`
                    : `Rate may change${rateDateLabel ? ` · ${rateDateLabel}` : ''}`}
                </AppText>
              </View>
              <Symbol name="chevron-right" size="sm" color={chrome.label} />
            </Pressable>
          ) : null}
        </Pressable>
      )}
    </TravelSheetModal>
  );
}

const styles = StyleSheet.create({
  accessory: {
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  swapRow: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  swapButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderCurve: 'continuous',
    boxShadow: '0 5px 14px rgba(51, 39, 28, 0.12)',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderCurve: 'continuous',
  },
  summaryBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  doneButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderCurve: 'continuous',
    boxShadow: '0 8px 18px rgba(80, 104, 64, 0.22)',
  },
});
