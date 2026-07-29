export type SharedEventSource = 'text' | 'url' | 'image' | 'ics';

export interface SharedEventDraft {
  id: string;
  source: SharedEventSource;
  title: string;
  /** YYYY-MM-DD, or blank until the user chooses a date. */
  date: string;
  /** Minutes from local midnight, or null until the user chooses a time. */
  startMinutes: number | null;
  durationMinutes: number;
  notes: string;
  categoryId: string;
  warnings: string[];
}

export interface CalendarImportParsingOptions {
  referenceDate?: Date;
  locale?: string;
  defaultCategoryId?: string;
}
