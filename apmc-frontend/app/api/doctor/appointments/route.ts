import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  // cookies() called outside try/catch so prerender bail-out propagates
  const cookieStore = await cookies();
  const token = cookieStore.get('apmc_session')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'doctor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const date = dateParam || new Date().toISOString().split('T')[0];

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('office', payload.officeName)
      .eq('date', date)
      .order('slot', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Doctor appointments error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
