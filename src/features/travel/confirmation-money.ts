const CURRENCY_CODES = 'USD|EUR|GBP|CAD|ISK|CHF|AUD|JPY|NZD|MXN|BRL|SEK|NOK|DKK';

/** Shared money extraction for flight / rental / stay confirmation OCR text. */
export function findConfirmationMoney(text: string): {
  amount?: number;
  currency?: string;
} {
  const patterns: RegExp[] = [
    new RegExp(
      `(?:total\\s+cost|total\\s+price|stay\\s+total|lodging\\s+total|accommodation\\s+total|reservation\\s+total)\\s*[:#-]?\\s*(?:\\r?\\n\\s*)?(${CURRENCY_CODES})?\\s*([$€£])?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})\\s*(${CURRENCY_CODES})?\\b`,
      'i',
    ),
    new RegExp(
      `\\bflight\\s*(?:total|fare|price)?\\s*[:#-]?\\s*(?:\\r?\\n\\s*)?(${CURRENCY_CODES})?\\s*([$€£])?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})\\s*(${CURRENCY_CODES})?\\b`,
      'i',
    ),
    new RegExp(
      `(?:ticket|trip|airfare|air\\s*fare)\\s+total\\s*[:#-]?\\s*(?:\\r?\\n\\s*)?(${CURRENCY_CODES})?\\s*([$€£])?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})\\s*(${CURRENCY_CODES})?\\b`,
      'i',
    ),
    new RegExp(
      `(?:estimated\\s+)?(?:grand\\s+)?total(?:\\s+(?:charges?|due|amount|price|fare|cost))?\\s*[:#-]?\\s*(?:\\r?\\n\\s*)?(${CURRENCY_CODES})?\\s*([$€£])?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})\\s*(${CURRENCY_CODES})?\\b`,
      'i',
    ),
    new RegExp(
      `(?:amount\\s+(?:charged|due|paid)|you\\s+(?:paid|were\\s+charged)|rental\\s+total)\\s*[:#-]?\\s*(?:\\r?\\n\\s*)?(${CURRENCY_CODES})?\\s*([$€£])?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})\\s*(${CURRENCY_CODES})?\\b`,
      'i',
    ),
    new RegExp(
      `\\b(${CURRENCY_CODES})\\s*([$€£])?\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})\\b`,
      'i',
    ),
    new RegExp(
      `([$€£])\\s*(\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|\\d+\\.\\d{2})\\s*(${CURRENCY_CODES})?\\b`,
      'i',
    ),
  ];

  const codeRegex = new RegExp(`^(${CURRENCY_CODES})$`, 'i');

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const groups = match.slice(1).filter(Boolean);
    let currencyCode: string | undefined;
    let symbol: string | undefined;
    let amountText: string | undefined;
    for (const group of groups) {
      if (codeRegex.test(group)) currencyCode = group.toUpperCase();
      else if (/^[$€£]$/.test(group)) symbol = group;
      else if (/^\d/.test(group)) amountText = group;
    }
    if (!amountText) continue;
    const amount = Number(amountText.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const currency =
      currencyCode ??
      (symbol === '$'
        ? 'USD'
        : symbol === '€'
          ? 'EUR'
          : symbol === '£'
            ? 'GBP'
            : undefined);
    return { amount: Math.round(amount * 100) / 100, currency };
  }
  return {};
}
