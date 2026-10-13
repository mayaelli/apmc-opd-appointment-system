import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('apmc_session')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

export async function GET() {
  // cookies() outside try/catch so prerender bail-out propagates
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('holidays')
      .select('*')
      .order('date');

    if (error) {
      console.error('Error fetching holidays:', error);
      return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Admin holidays GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { date, label } = body as { date?: string; label?: string };

    if (!date || !label) {
      return NextResponse.json({ error: 'Date and label are required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('holidays')
      .insert({ date, label: label.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A holiday already exists on this date' }, { status: 409 });
      }
      console.error('Error inserting holiday:', error);
      return NextResponse.json({ error: 'Failed to add holiday' }, { status: 500 });
    }

    return NextResponse.json({ holiday: data }, { status: 201 });
  } catch (err) {
    console.error('Admin holidays POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: 'Holiday ID is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('holidays')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting holiday:', error);
      return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Admin holidays DELETE error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
