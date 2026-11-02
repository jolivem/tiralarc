import { NextResponse } from 'next/server';
import { getAuthedApi } from '@/lib/api';

/**
 * GET /{locale}/archer/journal/{id}/photos/{photoId}: one of the archer's event photos, read
 * through this server (same origin, no CORS on the storage) so the Instagram share dialog
 * (share-modal.tsx) can draw it on a canvas. The API checks the event is the archer's.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/[locale]/archer/journal/[id]/photos/[photoId]'>,
) {
  const { id, photoId } = await params;
  const api = await getAuthedApi();
  const { data: photos, response } = await api.GET('/api/v1/journal/sessions/{sessionId}/photos', {
    params: { path: { sessionId: id } },
  });
  if (!photos) return new NextResponse(null, { status: response.status });
  const photo = photos.find((p) => p.id === photoId);
  if (!photo) return new NextResponse(null, { status: 404 });

  const file = await fetch(photo.url, { cache: 'no-store' });
  if (!file.ok || !file.body) return new NextResponse(null, { status: 502 });
  return new NextResponse(file.body, {
    headers: {
      'Content-Type': file.headers.get('content-type') ?? 'image/webp',
      'Cache-Control': 'private, no-store',
    },
  });
}
