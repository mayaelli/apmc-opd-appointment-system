import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const expectedUsername = process.env.ADMIN_USERNAME || '';
    const expectedPassword = process.env.ADMIN_PASSWORD || '';

    // Timing-safe comparison (buffers must be same length)
    let usernameMatch = false;
    let passwordMatch = false;

    try {
      const uBuf = Buffer.from(username);
      const eBuf = Buffer.from(expectedUsername);
      usernameMatch = uBuf.length === eBuf.length && timingSafeEqual(uBuf, eBuf);
    } catch {
      usernameMatch = false;
    }

    try {
      const pBuf = Buffer.from(password);
      const eBuf = Buffer.from(expectedPassword);
      passwordMatch = pBuf.length === eBuf.length && timingSafeEqual(pBuf, eBuf);
    } catch {
      passwordMatch = false;
    }

    if (!usernameMatch || !passwordMatch) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signToken({ role: 'admin', username });

    const cookieStore = await cookies();
    cookieStore.set('apmc_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
