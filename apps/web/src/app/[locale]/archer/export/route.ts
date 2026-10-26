import { cookies } from 'next/headers';
import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/current-user';
import { exportQuery, parseExportOptions } from '@/lib/export-options';
import { renderPdf } from '@/lib/pdf';
import { ACCESS_COOKIE } from '@/lib/session';

/** Chromium may take a while over a season with photos. */
export const maxDuration = 180;

/**
 * GET /{locale}/archer/export?from&to[&rankings=1][&stats=1][&sheets=1][&photos=1]: the
 * journal's PDF extract (A5), as a download. The home page's export dialog calls it; the
 * pages come from print/journal, printed by Chromium (lib/pdf.ts).
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<'/[locale]/archer/export'>,
) {
  const { locale } = await params;
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value;
  const user = accessToken ? await getCurrentUser() : null;
  if (!accessToken || !user) return new NextResponse(null, { status: 401 });
  if (!user.roles.includes('ARCHER')) return new NextResponse(null, { status: 403 });
  const options = parseExportOptions(request.nextUrl.searchParams);
  if (!options) return new NextResponse(null, { status: 400 });

  try {
    const pdf = await renderPdf(
      `/${locale}/print/journal?${exportQuery(options).toString()}`,
      accessToken,
    );
    return new NextResponse(pdf as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="journal-${options.from}-${options.to}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('PDF export failed', error);
    return new NextResponse(null, { status: 502 });
  }
}
