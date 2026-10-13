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

    const expectedUsername = process.env.HEAD_USERNAME || '';
    const expectedPassword = process.env.HEAD_PASSWORD || '';

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

    const token = await signToken({ role: 'opd_head', username });

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
    console.error('Head login error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
