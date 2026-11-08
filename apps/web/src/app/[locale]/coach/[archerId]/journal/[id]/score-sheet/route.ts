import { NextResponse } from 'next/server';
import { getAuthedApi } from '@/lib/api';

/** GET /{locale}/coach/{archerId}/journal/{id}/score-sheet: an archer's score sheet, a PDF. */
export async function GET(
  _request: Request,
  { params }: RouteContext<'/[locale]/coach/[archerId]/journal/[id]/score-sheet'>,
) {
  const { archerId, id } = await params;
  const { data, response } = await (
    await getAuthedApi()
  ).GET('/api/v1/coach/athletes/{archerId}/sessions/{id}/score-sheet', {
    params: { path: { archerId, id } },
    parseAs: 'arrayBuffer',
  });
  if (!data) return new NextResponse(null, { status: response.status });
  return new NextResponse(data, {
    headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'private, no-store' },
  });
}
