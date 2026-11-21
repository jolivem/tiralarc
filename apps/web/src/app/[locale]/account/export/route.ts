import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ACCESS_COOKIE } from '@/lib/session';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** The archive may take a while with many photos. */
export const maxDuration = 180;

/**
 * GET /{locale}/account/export: the account's data (`GET /users/me/export`, a ZIP archive of the
 * JSON and the photos), passed on to the browser as a download as it comes.
 */
export async function GET() {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!accessToken) return new NextResponse(null, { status: 401 });
  const response = await fetch(`${API_URL}/api/v1/users/me/export`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: response.status === 401 ? 401 : 502 });
  }
  return new NextResponse(response.body, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition':
        response.headers.get('content-disposition') ?? 'attachment; filename="myarcherydiary.zip"',
      'Cache-Control': 'no-store',
    },
  });
}
