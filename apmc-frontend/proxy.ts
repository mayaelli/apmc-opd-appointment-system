import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// NOTE: proxy.ts runs in Node.js runtime (Next.js 16 default).
// We inline JWT verify here to avoid importing 'server-only' from lib/auth.ts.
// If JWT_SECRET is absent we return null (deny all), consistent with lib/auth.ts throwing.
async function getPayload(token: string): Promise<{ role?: string } | null> {
  if (!process.env.JWT_SECRET) return null;
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    return payload as { role?: string };
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('apmc_session')?.value;

  const loginRedirect = (path: string) =>
    NextResponse.redirect(new URL(path, request.url));

  if (pathname.startsWith('/doctor/dashboard')) {
    if (!token) return loginRedirect('/portal/staff-access');
    const payload = await getPayload(token);
    if (!payload || payload.role !== 'doctor') return loginRedirect('/portal/staff-access');
  }

  if (pathname.startsWith('/head/dashboard')) {
    if (!token) return loginRedirect('/portal/staff-access');
    const payload = await getPayload(token);
    if (!payload || payload.role !== 'opd_head') return loginRedirect('/portal/staff-access');
  }

  if (pathname.startsWith('/admin/dashboard')) {
    if (!token) return loginRedirect('/portal/staff-access');
    const payload = await getPayload(token);
    if (!payload || payload.role !== 'admin') return loginRedirect('/portal/staff-access');
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/doctor/dashboard/:path*',
    '/head/dashboard/:path*',
    '/admin/dashboard/:path*',
  ],
};
