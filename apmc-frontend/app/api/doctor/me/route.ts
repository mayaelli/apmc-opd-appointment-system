import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  // cookies() outside try/catch so prerender bail-out propagates
  const cookieStore = await cookies();
  const token = cookieStore.get('apmc_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'doctor') {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    return NextResponse.json({
      officeName: payload.officeName,
      officeId: payload.officeId,
      username: payload.username,
    });
  } catch (err) {
    console.error('Doctor me error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
