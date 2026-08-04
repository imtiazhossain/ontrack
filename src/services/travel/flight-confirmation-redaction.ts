export type RetainedFlightPrivateFields = {
  confirmationCodes: string[];
  seats: string[];
};

export type RedactedFlightConfirmation = {
  text: string;
  retained: RetainedFlightPrivateFields;
  redactionCount: number;
};

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim().toUpperCase()).filter(Boolean))];
}

/**
 * Removes identity and booking secrets before itinerary OCR text can leave the device.
 * Values needed by the flight editor are retained only in memory and merged locally.
 */
export function redactFlightConfirmationText(
  sourceText: string,
): RedactedFlightConfirmation {
  const confirmationCodes: string[] = [];
  const seats: string[] = [];
  let redactionCount = 0;

  const replaceSecret = (
    text: string,
    pattern: RegExp,
    kind: string,
    retain?: (value: string) => void,
  ) =>
    text.replace(pattern, (...args: unknown[]) => {
      const match = String(args[0]);
      const prefix = String(args[1] ?? '');
      const value = String(args[2] ?? '');
      if (!value || value.startsWith('[REDACTED_')) return match;
      retain?.(value);
      redactionCount += 1;
      return `${prefix}[REDACTED_${kind}]`;
    });

  let text = sourceText.replace(/\r\n?/g, '\n');
  text = replaceSecret(
    text,
    /((?:(?:airline\s+)?confirmation(?:\s+(?:code|number|#))?|booking\s+(?:reference|code|number)|record\s+locator|reservation\s+(?:code|number))\s*[:#-]?\s*)([A-Z0-9-]{3,20})\b/gi,
    'CONFIRMATION',
    (value) => confirmationCodes.push(value),
  );

  text = replaceSecret(
    text,
    /((?:seat|seat\s+assignment)(?:\s+(?:number|no\.?|#))?\s*[:#-]?\s*)([A-Z]?\d{1,3}[A-Z]?)\b/gi,
    'SEAT',
    (value) => seats.push(value),
  );

  const privatePatterns: [RegExp, string][] = [
    [
      /((?:e-?ticket|ticket)(?:\s+(?:number|no\.?|#))?\s*[:#-]?\s*)([A-Z0-9-]{6,24})\b/gi,
      'TICKET',
    ],
    [
      /((?:frequent\s+flyer|loyalty|mileage)(?:\s+(?:number|no\.?|#|id))?\s*[:#-]?\s*)([A-Z0-9-]{4,24})\b/gi,
      'LOYALTY',
    ],
    [
      /((?:phone|mobile|telephone|tel)\s*[:#-]?\s*)(\+?[\d(). -]{7,24}\d)/gi,
      'PHONE',
    ],
  ];
  for (const [pattern, kind] of privatePatterns) {
    text = replaceSecret(text, pattern, kind);
  }

  text = text.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    () => {
      redactionCount += 1;
      return '[REDACTED_EMAIL]';
    },
  );
  text = text.replace(
    /^(\s*(?:passenger|travell?er|guest)(?:\s+name)?\s*[:#-]\s*).+$/gim,
    (_, prefix: string) => {
      redactionCount += 1;
      return `${prefix}[REDACTED_NAME]`;
    },
  );
  text = text.replace(
    /^(\s*(?:first|last|full)\s+name\s*[:#-]\s*).+$/gim,
    (_, prefix: string) => {
      redactionCount += 1;
      return `${prefix}[REDACTED_NAME]`;
    },
  );
  text = text.replace(
    /^.{1,80}\s*<\[REDACTED_EMAIL\]>\s*$/gim,
    () => {
      redactionCount += 1;
      return '[REDACTED_SENDER] <[REDACTED_EMAIL]>';
    },
  );
  text = text.replace(
    /^\s*[A-Z][A-Z .'’-]{2,80}\s+has shared (?:their|a) trip details.*$/gm,
    () => {
      redactionCount += 1;
      return '[REDACTED_NAME] has shared trip details';
    },
  );

  return {
    text,
    retained: {
      confirmationCodes: unique(confirmationCodes),
      seats: unique(seats),
    },
    redactionCount,
  };
}
