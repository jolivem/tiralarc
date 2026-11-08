import { NextResponse } from 'next/server';
import { getAuthedApi } from '@/lib/api';

/** GET /{locale}/archer/journal/{id}/score-sheet: the event's score sheet, a PDF to read. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/[locale]/archer/journal/[id]/score-sheet'>,
) {
  const { id } = await params;
  const { data, response } = await (
    await getAuthedApi()
  ).GET('/api/v1/journal/sessions/{id}/score-sheet', {
    params: { path: { id } },
    parseAs: 'arrayBuffer',
  });
  if (!data) return new NextResponse(null, { status: response.status });
  return new NextResponse(data, {
    headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' },
  });
}
