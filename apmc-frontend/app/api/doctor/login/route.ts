import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { signToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Verify credentials via pgcrypto RPC (login with office code)
    const { data, error } = await supabaseAdmin.rpc('verify_office_password', {
      p_code: username.trim().toUpperCase(),
      p_password: password,
    });

    if (error) {
      console.error('RPC error:', error);
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const office = Array.isArray(data) ? data[0] : data;

    const token = await signToken({
      role: 'doctor',
      username: username.trim(),
      officeName: office.name,
      officeId: office.id,
    });

    const cookieStore = await cookies();
    cookieStore.set('apmc_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return NextResponse.json({ success: true, officeName: office.name });
  } catch (err) {
    console.error('Doctor login error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
