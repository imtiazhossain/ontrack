const mockUpload = jest.fn(async () => ({ error: null }));
const mockCreateSignedUrl = jest.fn(async (_path: string, _expires: number) => ({
  data: {
    signedUrl:
      'https://example.supabase.co/storage/v1/object/sign/app-media/user-1/vision-board/abc.jpg?token=fresh',
  },
  error: null,
}));

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
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  }),
}));

// Jest must register the native module mocks before this module is imported.
// eslint-disable-next-line import/first
import { prepareCloudMedia, resolveCloudMedia } from '@/services/cloud/media';

describe('cloud media preparation', () => {
  beforeEach(() => {
    mockUpload.mockClear();
    mockCreateSignedUrl.mockClear();
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

  it('drops vision-board image items whose local file is gone', async () => {
    const prepared = await prepareCloudMedia('user-1', 'vision-board', {
      items: [
        {
          id: 'vision-image-1',
          kind: 'image',
          uri: 'file:///cache/missing-board.png',
          caption: 'Gone',
        },
        {
          id: 'vision-goal-1',
          kind: 'goal',
          title: 'Stay',
        },
      ],
    });

    expect(prepared).toEqual({
      items: [{ id: 'vision-goal-1', kind: 'goal', title: 'Stay' }],
    });
    expect(mockUpload).not.toHaveBeenCalled();
  });
});

describe('cloud media resolution', () => {
  beforeEach(() => {
    mockCreateSignedUrl.mockClear();
  });

  it('re-mints signed URLs from persisted storage paths', async () => {
    const stale =
      'https://example.supabase.co/storage/v1/object/sign/app-media/user-1/vision-board/abc.jpg?token=expired';

    const resolved = await resolveCloudMedia({
      items: [{ id: 'vision-image-1', kind: 'image', uri: stale }],
    });

    expect(resolved).toEqual({
      items: [
        {
          id: 'vision-image-1',
          kind: 'image',
          uri: 'https://example.supabase.co/storage/v1/object/sign/app-media/user-1/vision-board/abc.jpg?token=fresh',
        },
      ],
    });
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      'user-1/vision-board/abc.jpg',
      60 * 60 * 24 * 30,
    );
  });
});
