import { flightConfirmationAIMemory } from '@/services/travel/flight-confirmation-ai-memory';

jest.mock('@/services/storage', () => {
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
  };
  return {
    STORAGE_KEYS: {
      flightParserMemory: 'ontrack/travel-flight-parser-memory/v1',
    },
    mockStorage,
    createSensitivePersistStorage: () => mockStorage,
  };
});
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => 'a'.repeat(64)),
}));

const { mockStorage } = jest.requireMock('@/services/storage') as {
  mockStorage: {
    getItem: jest.Mock;
    setItem: jest.Mock;
  };
};

describe('flight confirmation AI memory', () => {
  beforeEach(() => {
    mockStorage.getItem.mockReset().mockResolvedValue(null);
    mockStorage.setItem.mockReset().mockResolvedValue(undefined);
  });

  it('stores a fingerprint and validated result without storing OCR text', async () => {
    const redactedText = 'Secret route text [REDACTED_NAME] GUA to LGA';
    const result = {
      itineraryDates: ['2026-09-27'],
      segments: [
        {
          departureAirport: 'GUA',
          arrivalAirport: 'LGA',
          departureDate: '2026-09-27',
          confidence: 0.98,
        },
      ],
    };

    await flightConfirmationAIMemory.write(redactedText, result);

    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    const saved = mockStorage.setItem.mock.calls[0][1];
    expect(JSON.stringify(saved)).not.toContain('Secret route text');
    expect(saved.state.entries[0].fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(saved.state.entries[0].result).toEqual(result);
  });
});
