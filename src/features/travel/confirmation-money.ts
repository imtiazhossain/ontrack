/** Shared money extraction for flight / rental confirmation OCR text. */
export function findConfirmationMoney(text: string): {
  amount?: number;
  currency?: string;
} {
  const patterns: RegExp[] = [
    /\bflight\s*(?:total|fare|price)?\s*[:#-]?\s*(USD|EUR|GBP|CAD|ISK|CHF)?\s*([$€£])?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})\s*(USD|EUR|GBP|CAD|ISK|CHF)?\b/i,
    /(?:ticket|trip|airfare|air\s*fare)\s+total\s*[:#-]?\s*(USD|EUR|GBP|CAD|ISK|CHF)?\s*([$€£])?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})\s*(USD|EUR|GBP|CAD|ISK|CHF)?\b/i,
    /(?:estimated\s+)?(?:grand\s+)?total(?:\s+(?:charges?|due|amount|price|fare))?\s*[:#-]?\s*(USD|EUR|GBP|CAD|ISK|CHF)?\s*([$€£])?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})\s*(USD|EUR|GBP|CAD|ISK|CHF)?\b/i,
    /(?:amount\s+(?:charged|due|paid)|you\s+(?:paid|were\s+charged)|rental\s+total)\s*[:#-]?\s*(USD|EUR|GBP|CAD|ISK|CHF)?\s*([$€£])?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})\s*(USD|EUR|GBP|CAD|ISK|CHF)?\b/i,
    /\b(USD|EUR|GBP|CAD|ISK|CHF)\s*([$€£])?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})\b/i,
    /([$€£])\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})\s*(USD|EUR|GBP|CAD|ISK|CHF)?\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) continue;
    const groups = match.slice(1).filter(Boolean);
    let currencyCode: string | undefined;
    let symbol: string | undefined;
    let amountText: string | undefined;
    for (const group of groups) {
      if (/^(USD|EUR|GBP|CAD|ISK|CHF)$/i.test(group)) currencyCode = group.toUpperCase();
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
