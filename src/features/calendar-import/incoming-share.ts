import { File } from 'expo-file-system';
import type { SharePayload } from 'expo-sharing';

import { recognizeDocumentText } from '@/services/document-text';

import { deduplicateDrafts, parseIcsEvents, parseNaturalLanguageEvents } from './parser';
import type { CalendarImportParsingOptions, SharedEventDraft } from './types';

interface NormalizeIncomingShareOptions extends CalendarImportParsingOptions {
  recognizeText?: (uri: string) => Promise<string>;
  readTextFile?: (uri: string) => Promise<string>;
}

function isCalendarPayload(payload: SharePayload): boolean {
  const mimeType = payload.mimeType?.toLowerCase();
  const path = payload.value.toLowerCase().split(/[?#]/, 1)[0];
  return (
    mimeType === 'text/calendar' ||
    mimeType === 'application/ics' ||
    path.endsWith('.ics') ||
    path.endsWith('.ical')
  );
}

function isImagePayload(payload: SharePayload): boolean {
  return (
    payload.shareType === 'image' ||
    (payload.mimeType?.toLowerCase().startsWith('image/') ?? false)
  );
}

function sourceForText(payload: SharePayload): 'text' | 'url' {
  return payload.shareType === 'url' || /^https?:\/\//i.test(payload.value.trim())
    ? 'url'
    : 'text';
}

async function defaultReadTextFile(uri: string): Promise<string> {
  return new File(uri).text();
}

export async function normalizeIncomingShare(
  payloads: SharePayload[],
  options: NormalizeIncomingShareOptions = {},
): Promise<SharedEventDraft[]> {
  if (payloads.length === 0) {
    throw new Error('No shared content is available. Share the event again and retry.');
  }

  const recognizeText = options.recognizeText ?? recognizeDocumentText;
  const readTextFile = options.readTextFile ?? defaultReadTextFile;
  const drafts: SharedEventDraft[] = [];

  for (const payload of payloads) {
    if (isCalendarPayload(payload)) {
      const text = await readTextFile(payload.value);
      drafts.push(...parseIcsEvents(text, options));
      continue;
    }
    if (isImagePayload(payload)) {
      const text = await recognizeText(payload.value);
      drafts.push(...parseNaturalLanguageEvents(text, 'image', options));
      continue;
    }
    if (payload.shareType === 'text' || payload.shareType === 'url') {
      drafts.push(
        ...parseNaturalLanguageEvents(payload.value, sourceForText(payload), options),
      );
      continue;
    }
    throw new Error('onTrack can import shared text, links, screenshots, and calendar files.');
  }

  return deduplicateDrafts(drafts);
}
