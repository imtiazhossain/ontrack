export interface TimeFieldProps {
  label?: string;
  /** Minutes from local midnight (0–1439), or null until a time is chosen. */
  value: number | null;
  onChange: (minutesFromMidnight: number) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

export function clampMinutesFromMidnight(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  return Math.min(1439, Math.max(0, rounded));
}

export function minutesToDate(minutesFromMidnight: number): Date {
  const clamped = clampMinutesFromMidnight(minutesFromMidnight);
  const date = new Date(2000, 0, 1);
  date.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0);
  return date;
}

export function dateToMinutes(date: Date): number {
  return clampMinutesFromMidnight(date.getHours() * 60 + date.getMinutes());
}
