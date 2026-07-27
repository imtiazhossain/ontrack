export const DAY_MS = 24 * 60 * 60 * 1000;
export type DateDisplayFormat = 'mdy' | 'iso';

/** YYYY-MM-DD in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = fromDateKey(value);
  return !Number.isNaN(parsed.valueOf()) && toDateKey(parsed) === value;
}

export function deviceLocale(): string {
  try {
    const formatter = Intl.DateTimeFormat();
    if (typeof formatter.resolvedOptions === 'function') {
      return formatter.resolvedOptions().locale || 'system';
    }
  } catch {
    // Older Hermes runtimes still support Date#toLocaleDateString but may not
    // expose the complete Intl formatter API.
  }
  return 'system';
}

export function dateDisplayFormatForLocale(locale?: string): DateDisplayFormat {
  const sample = new Date(2006, 10, 22, 12);
  try {
    const rendered = sample.toLocaleDateString(locale === 'system' ? undefined : locale);
    const firstNumber = rendered.match(/\d+/)?.[0];
    return Number(firstNumber) === 11 ? 'mdy' : 'iso';
  } catch {
    return 'iso';
  }
}

export function nativeDatePickerLocale(locale: unknown): string | undefined {
  return typeof locale === 'string' && locale !== 'system'
    ? locale.replace('-', '_')
    : undefined;
}

export function formatDateKey(value: string, format: DateDisplayFormat): string {
  if (!isDateKey(value)) return value;
  if (format === 'iso') return value;
  const [year, month, day] = value.split('-');
  return `${month}/${day}/${year}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function isToday(key: string): boolean {
  return key === todayKey();
}

export function isPast(key: string): boolean {
  return key < todayKey();
}

export function formatMinutes(minutesFromMidnight: number): string {
  const h24 = Math.floor(minutesFromMidnight / 60) % 24;
  const m = minutesFromMidnight % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${`${m}`.padStart(2, '0')} ${suffix}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function formatDateLong(key: string): string {
  const d = fromDateKey(key);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatWeekday(key: string): string {
  return WEEKDAYS[fromDateKey(key).getDay()];
}

export function formatMonthTitle(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** Minutes elapsed since local midnight for "now". */
export function nowMinutes(): number {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

export interface CalendarCell {
  key: string;
  day: number;
  inMonth: boolean;
}

/** 6x7 grid of cells for a month view, weeks starting Sunday. */
export function monthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({ key: toDateKey(d), day: d.getDate(), inMonth: d.getMonth() === month });
  }
  return cells;
}
