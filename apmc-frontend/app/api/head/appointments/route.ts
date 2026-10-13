import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function requireHead() {
  const cookieStore = await cookies();
  const token = cookieStore.get('apmc_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'opd_head') return null;
  return payload;
}

export async function GET(request: Request) {
  // cookies() outside try/catch so prerender bail-out propagates
  const head = await requireHead();
  if (!head) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const officeParam = searchParams.get('office');
    const statusParam = searchParams.get('status');
    const categoryParam = searchParams.get('category');

    let query = supabaseAdmin
      .from('appointments')
      .select('*')
      .order('date', { ascending: false })
      .order('slot', { ascending: true });

    if (dateParam) query = query.eq('date', dateParam);
    if (officeParam) query = query.eq('office', officeParam);
    if (statusParam) query = query.eq('status', statusParam);
    if (categoryParam) query = query.eq('category', categoryParam);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Head appointments error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
