const mockUpload = jest.fn(async () => ({ error: null }));

jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    exists: !uri.includes('missing'),
    arrayBuffer: async () => new ArrayBuffer(4),
  })),
}));

jest.mock('@/services/cloud/supabase', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
      }),
    },
  }),
}));

// Jest must register the native module mocks before this module is imported.
// eslint-disable-next-line import/first
import { prepareCloudMedia } from '@/services/cloud/media';

describe('cloud media preparation', () => {
  beforeEach(() => {
    mockUpload.mockClear();
  });

  it('uploads readable local media and replaces it with a storage marker', async () => {
    const prepared = await prepareCloudMedia('user-1', 'schedule', {
      meal: { photo: 'file:///documents/meal.jpg' },
    });

    expect(prepared).toEqual({
      meal: { photo: expect.stringMatching(/^ontrack-media:user-1\/schedule\/.+\.jpg$/) },
    });
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it('omits expired local media without blocking the rest of the payload', async () => {
    const prepared = await prepareCloudMedia('user-1', 'schedule', {
      title: 'Lunch',
      meal: {
        photo: 'file:///cache/missing.png',
        notes: 'Keep this',
      },
      gallery: ['file:///cache/missing-2.png', 'https://example.com/remote.jpg'],
    });

    expect(prepared).toEqual({
      title: 'Lunch',
      meal: { notes: 'Keep this' },
      gallery: ['https://example.com/remote.jpg'],
    });
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
