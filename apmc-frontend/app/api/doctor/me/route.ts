import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  // cookies() outside try/catch so prerender bail-out throw propagates
  const cookieStore = await cookies();
  const token = cookieStore.get('apmc_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'doctor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    officeName: payload.officeName ?? null,
    officeId: payload.officeId ?? null,
  });
}
