import { apiCorsHeaders, apiOptionsResponse } from '@/services/http/cors';
import {
  DESTINATION_COVER_UA,
  lookupDestinationCoverUrl,
} from '@/features/travel/destination-cover-lookup';

export function OPTIONS(request: Request) {
  return apiOptionsResponse(request, 'GET, OPTIONS');
}

/** Free Wikimedia destination cover for travel trip thumbnails. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (query.length < 2 || query.length > 120) {
    return Response.json(
      { error: 'Destination must be between 2 and 120 characters.' },
      { status: 400, headers: apiCorsHeaders(request, 'GET, OPTIONS') },
    );
  }

  const uri = await lookupDestinationCoverUrl(query, {
    userAgent: DESTINATION_COVER_UA,
  });
  if (!uri) {
    return Response.json(
      { error: 'No destination photo found.' },
      { status: 404, headers: apiCorsHeaders(request, 'GET, OPTIONS') },
    );
  }

  return Response.json(
    { uri },
    {
      headers: {
        ...apiCorsHeaders(request, 'GET, OPTIONS'),
        'Cache-Control': 'public, max-age=86400',
      },
    },
  );
}
