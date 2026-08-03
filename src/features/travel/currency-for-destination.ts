import { normalizeCurrencyCode } from '@/features/travel/expenses/format-money';
import { isSupportedFxCurrency } from '@/features/travel/expenses/fx-rates';

/**
 * Country / region / city phrases → ISO currency for Frankfurter-supported codes.
 * Longer phrases first so "United Kingdom" wins over "Kingdom".
 */
const DESTINATION_CURRENCY_HINTS: ReadonlyArray<{ phrase: string; currency: string }> = [
  { phrase: 'united states', currency: 'USD' },
  { phrase: 'united kingdom', currency: 'GBP' },
  { phrase: 'great britain', currency: 'GBP' },
  { phrase: 'south korea', currency: 'KRW' },
  { phrase: 'south africa', currency: 'ZAR' },
  { phrase: 'new zealand', currency: 'NZD' },
  { phrase: 'hong kong', currency: 'HKD' },
  { phrase: 'czech republic', currency: 'CZK' },
  { phrase: 'portugal', currency: 'EUR' },
  { phrase: 'lisbon', currency: 'EUR' },
  { phrase: 'porto', currency: 'EUR' },
  { phrase: 'spain', currency: 'EUR' },
  { phrase: 'madrid', currency: 'EUR' },
  { phrase: 'barcelona', currency: 'EUR' },
  { phrase: 'france', currency: 'EUR' },
  { phrase: 'paris', currency: 'EUR' },
  { phrase: 'germany', currency: 'EUR' },
  { phrase: 'berlin', currency: 'EUR' },
  { phrase: 'munich', currency: 'EUR' },
  { phrase: 'italy', currency: 'EUR' },
  { phrase: 'rome', currency: 'EUR' },
  { phrase: 'milan', currency: 'EUR' },
  { phrase: 'florence', currency: 'EUR' },
  { phrase: 'venice', currency: 'EUR' },
  { phrase: 'netherlands', currency: 'EUR' },
  { phrase: 'amsterdam', currency: 'EUR' },
  { phrase: 'belgium', currency: 'EUR' },
  { phrase: 'brussels', currency: 'EUR' },
  { phrase: 'ireland', currency: 'EUR' },
  { phrase: 'dublin', currency: 'EUR' },
  { phrase: 'austria', currency: 'EUR' },
  { phrase: 'vienna', currency: 'EUR' },
  { phrase: 'finland', currency: 'EUR' },
  { phrase: 'helsinki', currency: 'EUR' },
  { phrase: 'greece', currency: 'EUR' },
  { phrase: 'athens', currency: 'EUR' },
  { phrase: 'iceland', currency: 'ISK' },
  { phrase: 'reykjavik', currency: 'ISK' },
  { phrase: 'reykjavík', currency: 'ISK' },
  { phrase: 'japan', currency: 'JPY' },
  { phrase: 'tokyo', currency: 'JPY' },
  { phrase: 'osaka', currency: 'JPY' },
  { phrase: 'kyoto', currency: 'JPY' },
  { phrase: 'canada', currency: 'CAD' },
  { phrase: 'toronto', currency: 'CAD' },
  { phrase: 'vancouver', currency: 'CAD' },
  { phrase: 'montreal', currency: 'CAD' },
  { phrase: 'australia', currency: 'AUD' },
  { phrase: 'sydney', currency: 'AUD' },
  { phrase: 'melbourne', currency: 'AUD' },
  { phrase: 'brisbane', currency: 'AUD' },
  { phrase: 'britain', currency: 'GBP' },
  { phrase: 'england', currency: 'GBP' },
  { phrase: 'scotland', currency: 'GBP' },
  { phrase: 'wales', currency: 'GBP' },
  { phrase: 'london', currency: 'GBP' },
  { phrase: 'edinburgh', currency: 'GBP' },
  { phrase: 'switzerland', currency: 'CHF' },
  { phrase: 'zurich', currency: 'CHF' },
  { phrase: 'geneva', currency: 'CHF' },
  { phrase: 'sweden', currency: 'SEK' },
  { phrase: 'stockholm', currency: 'SEK' },
  { phrase: 'norway', currency: 'NOK' },
  { phrase: 'oslo', currency: 'NOK' },
  { phrase: 'denmark', currency: 'DKK' },
  { phrase: 'copenhagen', currency: 'DKK' },
  { phrase: 'poland', currency: 'PLN' },
  { phrase: 'warsaw', currency: 'PLN' },
  { phrase: 'czech', currency: 'CZK' },
  { phrase: 'prague', currency: 'CZK' },
  { phrase: 'hungary', currency: 'HUF' },
  { phrase: 'budapest', currency: 'HUF' },
  { phrase: 'romania', currency: 'RON' },
  { phrase: 'bucharest', currency: 'RON' },
  { phrase: 'turkey', currency: 'TRY' },
  { phrase: 'türkiye', currency: 'TRY' },
  { phrase: 'istanbul', currency: 'TRY' },
  { phrase: 'mexico', currency: 'MXN' },
  { phrase: 'cancun', currency: 'MXN' },
  { phrase: 'cancún', currency: 'MXN' },
  { phrase: 'brazil', currency: 'BRL' },
  { phrase: 'rio', currency: 'BRL' },
  { phrase: 'são paulo', currency: 'BRL' },
  { phrase: 'sao paulo', currency: 'BRL' },
  { phrase: 'china', currency: 'CNY' },
  { phrase: 'beijing', currency: 'CNY' },
  { phrase: 'shanghai', currency: 'CNY' },
  { phrase: 'india', currency: 'INR' },
  { phrase: 'delhi', currency: 'INR' },
  { phrase: 'mumbai', currency: 'INR' },
  { phrase: 'korea', currency: 'KRW' },
  { phrase: 'seoul', currency: 'KRW' },
  { phrase: 'thailand', currency: 'THB' },
  { phrase: 'bangkok', currency: 'THB' },
  { phrase: 'phuket', currency: 'THB' },
  { phrase: 'singapore', currency: 'SGD' },
  { phrase: 'malaysia', currency: 'MYR' },
  { phrase: 'kuala lumpur', currency: 'MYR' },
  { phrase: 'indonesia', currency: 'IDR' },
  { phrase: 'bali', currency: 'IDR' },
  { phrase: 'jakarta', currency: 'IDR' },
  { phrase: 'philippines', currency: 'PHP' },
  { phrase: 'manila', currency: 'PHP' },
  { phrase: 'israel', currency: 'ILS' },
  { phrase: 'tel aviv', currency: 'ILS' },
  { phrase: 'america', currency: 'USD' },
  { phrase: 'usa', currency: 'USD' },
  { phrase: 'nyc', currency: 'USD' },
  { phrase: 'new york', currency: 'USD' },
  { phrase: 'los angeles', currency: 'USD' },
  { phrase: 'miami', currency: 'USD' },
  { phrase: 'chicago', currency: 'USD' },
  { phrase: 'hawaii', currency: 'USD' },
].slice()
  .sort((a, b) => b.phrase.length - a.phrase.length);

/** Best-effort destination currency from a free-text destination. */
export function currencyForDestination(
  destination: string,
  fallback?: string,
): string | undefined {
  const haystack = destination.trim().toLowerCase();
  if (!haystack) {
    return fallback ? normalizeCurrencyCode(fallback) : undefined;
  }

  for (const hint of DESTINATION_CURRENCY_HINTS) {
    if (!haystack.includes(hint.phrase)) continue;
    const code = normalizeCurrencyCode(hint.currency);
    if (isSupportedFxCurrency(code)) return code;
  }

  return fallback ? normalizeCurrencyCode(fallback) : undefined;
}

/**
 * Pair home (origin) currency with a destination currency for the calculator.
 * Avoids identical defaults when the destination cannot be inferred.
 */
export function currencyPairForTrip(
  destination: string,
  homeCurrency: string,
): { origin: string; destination: string } {
  const origin = normalizeCurrencyCode(homeCurrency);
  const inferred = currencyForDestination(destination);
  if (inferred && inferred !== origin) {
    return { origin, destination: inferred };
  }
  // Prefer EUR as a travel default when home is USD/GBP/etc.; otherwise USD.
  const alternate = origin === 'EUR' ? 'USD' : 'EUR';
  return { origin, destination: inferred ?? alternate };
}
