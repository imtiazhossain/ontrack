import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AppText,
  Button,
  Card,
  DateField,
  EmptyState,
  ErrorMessage,
  IconButton,
  Input,
  Screen,
  SectionHeader,
} from '@/components/primitives';
import { featureFlags } from '@/constants/feature-flags';
import { spacing } from '@/design-system';
import { compareOnGoogleFlights } from '@/features/travel/provider';
import { travelOverlineStyle } from '@/features/travel/travel-chrome';
import { FeatureThemeProvider } from '@/hooks/use-theme';
import { usePreferences } from '@/store/preferences';
import { useTravel } from '@/store/travel';
import { formatDateKey } from '@/utils/date';

import { FlightSearchError, searchFlights } from './client';
import { getCurrentDepartureLocation } from './departure-location';
import type { FlightLeg, FlightSearchResponse } from './types';

function formatPrice(value: string, currency: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return `${currency} ${value}`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

function formatDuration(value: string): string {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(value);
  if (!match) return value;
  return [match[1] ? `${match[1]}h` : '', match[2] ? `${match[2]}m` : '']
    .filter(Boolean)
    .join(' ');
}

function formatDateTime(value: string, dateDisplayFormat: 'mdy' | 'iso'): string {
  const [date, rawTime = ''] = value.split('T');
  const time = rawTime.slice(0, 5);
  return `${formatDateKey(date, dateDisplayFormat)} · ${time}`;
}

function LegSummary({
  label,
  leg,
  dateDisplayFormat,
}: {
  label: string;
  leg: FlightLeg;
  dateDisplayFormat: 'mdy' | 'iso';
}) {
  return (
    <View style={styles.leg}>
      <AppText variant="overline" color="tertiary" style={travelOverlineStyle}>
        {label}
      </AppText>
      <View style={styles.route}>
        <View style={styles.flex}>
          <AppText variant="subheading">{leg.departureCode} → {leg.arrivalCode}</AppText>
          <AppText variant="caption" color="secondary">
            {formatDateTime(leg.departureAt, dateDisplayFormat)}
          </AppText>
        </View>
        <AppText variant="caption" color="secondary">
          {formatDuration(leg.duration)} · {leg.stops === 0 ? 'Nonstop' : `${leg.stops} stop${leg.stops === 1 ? '' : 's'}`}
        </AppText>
      </View>
    </View>
  );
}

export function FlightSearchScreen({ planId }: { planId: string }) {
  return (
    <FeatureThemeProvider feature="travel">
      <FlightSearchScreenContent planId={planId} />
    </FeatureThemeProvider>
  );
}

function FlightSearchScreenContent({ planId }: { planId: string }) {
  const plan = useTravel((state) => state.plans.find((item) => item.id === planId));
  const dateDisplayFormat = usePreferences((state) => state.dateDisplayFormat);
  const controllerRef = useRef<AbortController | undefined>(undefined);
  const mountedRef = useRef(true);
  const originEditedRef = useRef(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState(plan?.destination ?? '');
  const [departureDate, setDepartureDate] = useState(plan?.startDate ?? '');
  const [returnDate, setReturnDate] = useState(plan?.endDate ?? '');
  const [adults, setAdults] = useState('1');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [result, setResult] = useState<FlightSearchResponse>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [locatingDeparture, setLocatingDeparture] = useState(false);

  const fillDepartureFromLocation = useCallback(async () => {
    setLocatingDeparture(true);
    const suggestion = await getCurrentDepartureLocation();
    if (!mountedRef.current) return;
    if (suggestion.status === 'suggested') {
      setOrigin(suggestion.label);
    }
    setLocatingDeparture(false);
  }, []);

  useEffect(() => {
    let active = true;
    void getCurrentDepartureLocation().then((suggestion) => {
      if (!active) return;
      if (suggestion.status === 'suggested' && !originEditedRef.current) {
        setOrigin(suggestion.label);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  if (!plan) {
    return (
      <Screen>
        <EmptyState icon="flight" title="Trip Not Found" message="This trip may have been removed." />
      </Screen>
    );
  }

  const runSearch = async () => {
    const travelerCount = Number(adults);
    setError(undefined);
    if (
      origin.trim().length < 3 ||
      destination.trim().length < 3 ||
      !Number.isInteger(travelerCount) ||
      travelerCount < 1 ||
      travelerCount > 9 ||
      !/^[A-Z]{3}$/.test(currencyCode.trim().toUpperCase())
    ) {
      return setError('Enter both airports, 1–9 travelers, and a three-letter currency.');
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoading(true);
    try {
      setResult(await searchFlights({
        origin: origin.trim(),
        destination: destination.trim(),
        departureDate,
        returnDate,
        adults: travelerCount,
        currencyCode: currencyCode.trim().toUpperCase(),
      }, controller.signal));
    } catch (searchError) {
      if (searchError instanceof Error && searchError.name === 'AbortError') return;
      setError(
        searchError instanceof FlightSearchError
          ? searchError.message
          : 'Flight search is temporarily unavailable.',
      );
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  };

  const cancelSearch = () => {
    controllerRef.current?.abort();
  };

  const compareFlights = async () => {
    setError(undefined);
    setComparing(true);
    try {
      await compareOnGoogleFlights({
        origin,
        destination,
        departureDate,
        returnDate,
        adults: Math.max(1, Number(adults) || 1),
      });
    } catch {
      setError(
        'We could not find airports for one of those cities. Check the city names and try again.',
      );
    } finally {
      setComparing(false);
    }
  };

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.heading}>
        <AppText variant="overline" color="accent" style={travelOverlineStyle}>
          Flight Search
        </AppText>
        <AppText variant="title">Flights for {plan.title}</AppText>
        <AppText variant="body" color="secondary">
          Live availability and total prices without leaving onTrack.
        </AppText>
      </View>

      <Card variant="elevated" style={styles.searchCard}>
        <View style={styles.twoColumns}>
          <View style={styles.flex}>
            <Input
              label="From"
              value={origin}
              onChangeText={(value) => {
                originEditedRef.current = true;
                setOrigin(value);
              }}
              placeholder="JFK or New York"
              autoCapitalize="characters"
              trailing={
                <IconButton
                  icon="location"
                  background="transparent"
                  disabled={locatingDeparture}
                  onPress={() => void fillDepartureFromLocation()}
                  accessibilityLabel={
                    locatingDeparture
                      ? 'Finding current departure location'
                      : 'Use current location for departure'
                  }
                />
              }
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="To"
              value={destination}
              onChangeText={setDestination}
              placeholder="KEF or Reykjavik"
              autoCapitalize="words"
            />
          </View>
        </View>
        <View style={styles.twoColumns}>
          <View style={styles.flex}>
            <DateField
              label="Departure"
              value={departureDate}
              onChange={(value) => {
                setDepartureDate(value);
                if (returnDate < value) setReturnDate(value);
              }}
            />
          </View>
          <View style={styles.flex}>
            <DateField
              label="Return"
              value={returnDate}
              minimumDate={departureDate}
              onChange={setReturnDate}
            />
          </View>
        </View>
        <View style={styles.twoColumns}>
          <View style={styles.flex}>
            <Input
              label="Travelers"
              value={adults}
              onChangeText={setAdults}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="Currency"
              value={currencyCode}
              onChangeText={setCurrencyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={3}
              placeholder="USD"
            />
          </View>
        </View>
        {error ? <ErrorMessage message={error} /> : null}
        {featureFlags.liveFlightSearch ? (
          <Button
            icon={loading ? 'close' : 'search'}
            onPress={loading ? cancelSearch : () => void runSearch()}>
            {loading ? 'Cancel Live Price Check' : 'Search Flights'}
          </Button>
        ) : null}
        <Button
          icon="open-external"
          disabled={
            comparing ||
            origin.trim().length < 3 ||
            destination.trim().length < 3
          }
          onPress={() => void compareFlights()}>
          {comparing ? 'Finding nearby airports…' : 'Compare on Google Flights'}
        </Button>
      </Card>

      {result ? (
        <>
          <View style={styles.resultsHeader}>
            <SectionHeader
              title={`${result.originCode} → ${result.destinationCode}`}
              detail={`${result.offers.length} options`}
              titleStyle={travelOverlineStyle}
            />
            <AppText variant="caption" color={result.dataMode === 'live' ? 'success' : 'secondary'}>
              {result.dataMode === 'live' ? 'Live Prices' : 'Test Data'}
            </AppText>
          </View>
          <AppText variant="caption" color="secondary">
            Checked {new Date(result.searchedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            {' · '}Prices can change until ticketing.
          </AppText>
          {result.offers.length === 0 ? (
            <EmptyState
              icon="flight"
              title="No Flights Found"
              message="Try nearby airport codes or different dates."
              actionLabel="Search Again"
              onAction={() => void runSearch()}
            />
          ) : null}
          {result.offers.map((offer) => (
            <Card key={offer.id} variant="elevated" style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.flex}>
                  <AppText variant="subheading">{offer.outbound.carrier || 'Airline'}</AppText>
                  <AppText variant="caption" color="secondary">
                    {offer.outbound.flightNumber}
                    {offer.seatsAvailable ? ` · ${offer.seatsAvailable} seats left` : ''}
                  </AppText>
                </View>
                <View style={styles.price}>
                  <AppText variant="subheading" color="accent">
                    {formatPrice(offer.totalPrice, offer.currency)}
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    total · {adults} {Number(adults) === 1 ? 'traveler' : 'travelers'}
                  </AppText>
                </View>
              </View>
              <LegSummary
                label="Outbound"
                leg={offer.outbound}
                dateDisplayFormat={dateDisplayFormat}
              />
              {offer.inbound ? (
                <LegSummary
                  label="Return"
                  leg={offer.inbound}
                  dateDisplayFormat={dateDisplayFormat}
                />
              ) : null}
            </Card>
          ))}
          {result.offers.length > 0 ? (
            <Button variant="secondary" onPress={() => void runSearch()} disabled={loading}>
              Refresh prices
            </Button>
          ) : null}
        </>
      ) : (
        <AppText variant="caption" color="secondary">
          Your trip dates are prefilled: {formatDateKey(plan.startDate, dateDisplayFormat)} → {formatDateKey(plan.endDate, dateDisplayFormat)}.
        </AppText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  heading: { gap: spacing.sm },
  searchCard: { gap: spacing.lg },
  twoColumns: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  resultsHeader: { gap: spacing.xs },
  offerCard: { gap: spacing.lg },
  offerHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  price: { alignItems: 'flex-end', gap: spacing.xxs },
  leg: { gap: spacing.sm },
  route: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
});
