import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { ONTRACK_SUPPORT_EMAIL } from '@/constants/legal';

const CRASH_LOG_FILENAME = 'ontrack-crash-report.txt';
const MAX_MAILTO_BODY_CHARS = 1_800;

export type CrashReportInput = {
  error: Error;
  /** Optional route / screen hint when known. */
  context?: string;
};

export type CrashReportSendResult =
  | { method: 'share' }
  | { method: 'mailto' }
  | { method: 'unavailable'; reason: string };

function safeComponent(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '—';
}

/** Build plain-text crash diagnostics for support email attachment / body. */
export function buildCrashLogText(input: CrashReportInput): string {
  const { error, context } = input;
  const appVersion = safeComponent(
    Constants.nativeAppVersion ?? Constants.expoConfig?.version,
  );
  const build = safeComponent(
    Constants.nativeBuildVersion ??
      Constants.expoConfig?.ios?.buildNumber ??
      Constants.expoConfig?.android?.versionCode,
  );
  const lines = [
    'onTrack crash report',
    `Generated: ${new Date().toISOString()}`,
    '',
    '— App —',
    `Version: ${appVersion} (${build})`,
    `Platform: ${Platform.OS} ${safeComponent(Platform.Version)}`,
    context ? `Context: ${context}` : null,
    '',
    '— Device —',
    `Brand: ${safeComponent(Device.brand)}`,
    `Model: ${safeComponent(Device.modelName)}`,
    `OS: ${safeComponent(Device.osName)} ${safeComponent(Device.osVersion)}`,
    '',
    '— Error —',
    `Name: ${safeComponent(error.name)}`,
    `Message: ${safeComponent(error.message)}`,
    '',
    '— Stack —',
    error.stack?.trim() || '(no stack)',
  ];
  return lines.filter((line) => line !== null).join('\n');
}

export function crashReportSubject(error: Error): string {
  const short = (error.message || error.name || 'Unknown error')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `onTrack crash: ${short || 'Unknown error'}`;
}

export function crashReportBody(error: Error): string {
  return [
    'I hit a crash in onTrack. The crash log is attached.',
    '',
    `Error: ${error.message || error.name || 'Unknown error'}`,
    '',
    `Please send to: ${ONTRACK_SUPPORT_EMAIL}`,
    '',
    'What I was doing:',
    '(please describe)',
    '',
  ].join('\n');
}

/** Write / overwrite the crash log under the app cache directory. */
export function writeCrashLogFile(text: string): File {
  const file = new File(Paths.cache, CRASH_LOG_FILENAME);
  file.create({ overwrite: true, intermediates: true });
  file.write(text);
  return file;
}

function mailtoUrl(subject: string, body: string): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body.slice(0, MAX_MAILTO_BODY_CHARS));
  return `mailto:${ONTRACK_SUPPORT_EMAIL}?${params.toString()}`;
}

/**
 * Share a crash log file (Mail can attach it) or fall back to mailto with the
 * log inlined. Uses modules already in the shipped native binary.
 */
export async function sendCrashReport(
  input: CrashReportInput,
): Promise<CrashReportSendResult> {
  const text = buildCrashLogText(input);
  const subject = crashReportSubject(input.error);
  const body = crashReportBody(input.error);

  let fileUri: string | undefined;
  try {
    fileUri = writeCrashLogFile(text).uri;
  } catch {
    fileUri = undefined;
  }

  try {
    if (fileUri && (await Sharing.isAvailableAsync())) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Send crash log to ${ONTRACK_SUPPORT_EMAIL}`,
        UTI: 'public.plain-text',
      });
      return { method: 'share' };
    }
  } catch {
    // Fall through to mailto.
  }

  const mailtoBody = [
    body,
    fileUri
      ? '(Could not attach the log file automatically. Paste is included below.)'
      : null,
    text,
  ]
    .filter(Boolean)
    .join('\n\n');
  try {
    const url = mailtoUrl(subject, mailtoBody);
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      return { method: 'unavailable', reason: 'No mail or share target available.' };
    }
    await Linking.openURL(url);
    return { method: 'mailto' };
  } catch (error) {
    return {
      method: 'unavailable',
      reason: error instanceof Error ? error.message : 'Unable to open mail.',
    };
  }
}
