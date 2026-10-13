import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Fail fast if required env vars are missing
    if (
      !process.env.ADMIN_USERNAME ||
      !process.env.ADMIN_PASSWORD ||
      !process.env.HEAD_USERNAME ||
      !process.env.HEAD_PASSWORD
    ) {
      console.error('Missing ADMIN_USERNAME, ADMIN_PASSWORD, HEAD_USERNAME, or HEAD_PASSWORD');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // --- Check admin ---
    let adminUsernameMatch = false;
    let adminPasswordMatch = false;
    try {
      const uBuf = Buffer.from(username);
      const eBuf = Buffer.from(process.env.ADMIN_USERNAME);
      adminUsernameMatch = uBuf.length === eBuf.length && timingSafeEqual(uBuf, eBuf);
    } catch { adminUsernameMatch = false; }
    try {
      const pBuf = Buffer.from(password);
      const eBuf = Buffer.from(process.env.ADMIN_PASSWORD);
      adminPasswordMatch = pBuf.length === eBuf.length && timingSafeEqual(pBuf, eBuf);
    } catch { adminPasswordMatch = false; }

    if (adminUsernameMatch && adminPasswordMatch) {
      const token = await signToken({ role: 'admin', username });
      const cookieStore = await cookies();
      cookieStore.set('apmc_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60,
      });
      return NextResponse.json({ success: true, role: 'admin', redirectTo: '/admin/dashboard' });
    }

    // --- Check OPD head ---
    let headUsernameMatch = false;
    let headPasswordMatch = false;
    try {
      const uBuf = Buffer.from(username);
      const eBuf = Buffer.from(process.env.HEAD_USERNAME);
      headUsernameMatch = uBuf.length === eBuf.length && timingSafeEqual(uBuf, eBuf);
    } catch { headUsernameMatch = false; }
    try {
      const pBuf = Buffer.from(password);
      const eBuf = Buffer.from(process.env.HEAD_PASSWORD);
      headPasswordMatch = pBuf.length === eBuf.length && timingSafeEqual(pBuf, eBuf);
    } catch { headPasswordMatch = false; }

    if (headUsernameMatch && headPasswordMatch) {
      const token = await signToken({ role: 'opd_head', username });
      const cookieStore = await cookies();
      cookieStore.set('apmc_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60,
      });
      return NextResponse.json({ success: true, role: 'opd_head', redirectTo: '/head/dashboard' });
    }

    // --- Check doctor (office) ---
    const { data, error } = await supabaseAdmin.rpc('verify_office_password', {
      p_username: username.trim().toUpperCase(),
      p_password: password,
    });

    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (data && (!Array.isArray(data) || data.length > 0)) {
      const office = Array.isArray(data) ? data[0] : data;
      const token = await signToken({
        role: 'doctor',
        username: username.trim(),
        officeId: office.id,
        officeName: office.name,
      });
      const cookieStore = await cookies();
      cookieStore.set('apmc_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 8 * 60 * 60,
      });
      return NextResponse.json({ success: true, role: 'doctor', redirectTo: '/doctor/dashboard' });
    }

    // None matched
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (err) {
    console.error('Unified login error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
