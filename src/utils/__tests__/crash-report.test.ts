import { ONTRACK_SUPPORT_EMAIL } from '@/constants/legal';

import {
  buildCrashLogText,
  crashReportBody,
  crashReportSubject,
  sendCrashReport,
} from '../crash-report';

const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockFileUri = 'file:///cache/ontrack-crash-report.txt';

jest.mock('expo-file-system', () => ({
  Paths: { cache: 'cache://' },
  File: jest.fn().mockImplementation(() => ({
    uri: mockFileUri,
    create: mockCreate,
    write: mockWrite,
  })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    nativeAppVersion: '1.0.0',
    nativeBuildVersion: '42',
    expoConfig: { version: '1.0.0' },
  },
}));

jest.mock('expo-device', () => ({
  brand: 'Apple',
  modelName: 'iPhone',
  osName: 'iOS',
  osVersion: '18.0',
}));

const mockIsSharingAvailable = jest.fn();
const mockShareAsync = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsSharingAvailable(),
  shareAsync: (uri: string, options?: unknown) => mockShareAsync(uri, options),
}));

const mockCanOpenURL = jest.fn();
const mockOpenURL = jest.fn();
jest.mock('expo-linking', () => ({
  canOpenURL: (url: string) => mockCanOpenURL(url),
  openURL: (url: string) => mockOpenURL(url),
}));

describe('crash-report', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsSharingAvailable.mockResolvedValue(false);
    mockCanOpenURL.mockResolvedValue(true);
    mockOpenURL.mockResolvedValue(undefined);
    mockShareAsync.mockResolvedValue(undefined);
  });

  it('builds a log with error stack and device/app fields', () => {
    const error = new Error('Boom');
    error.stack = 'Error: Boom\n    at screen';
    const text = buildCrashLogText({ error, context: 'travel/plan' });
    expect(text).toContain('onTrack crash report');
    expect(text).toContain('Boom');
    expect(text).toContain('Error: Boom');
    expect(text).toContain('Context: travel/plan');
    expect(text).toContain('Version: 1.0.0 (42)');
    expect(text).toContain('Model: iPhone');
  });

  it('keeps subject short and body mentions the attachment', () => {
    const error = new Error('x'.repeat(200));
    expect(crashReportSubject(error).length).toBeLessThanOrEqual(100);
    expect(crashReportBody(error)).toContain('crash log is attached');
    expect(crashReportBody(error)).toContain(ONTRACK_SUPPORT_EMAIL);
  });

  it('shares the crash log file so Mail can attach it', async () => {
    mockIsSharingAvailable.mockResolvedValue(true);
    const result = await sendCrashReport({ error: new Error('Share me') });
    expect(mockCreate).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalled();
    expect(mockShareAsync).toHaveBeenCalledWith(
      mockFileUri,
      expect.objectContaining({
        mimeType: 'text/plain',
        dialogTitle: expect.stringContaining(ONTRACK_SUPPORT_EMAIL),
      }),
    );
    expect(result).toEqual({ method: 'share' });
  });

  it('falls back to mailto with log body when share is unavailable', async () => {
    const result = await sendCrashReport({ error: new Error('Mailto path') });
    expect(mockOpenURL).toHaveBeenCalled();
    const url = mockOpenURL.mock.calls[0][0] as string;
    expect(url.startsWith(`mailto:${ONTRACK_SUPPORT_EMAIL}?`)).toBe(true);
    expect(url).toContain('Mailto+path');
    expect(result).toEqual({ method: 'mailto' });
  });
});
