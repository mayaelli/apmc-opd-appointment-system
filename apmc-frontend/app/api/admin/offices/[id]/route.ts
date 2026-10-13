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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { name, username, slot_capacity } = body as {
      name?: string;
      username?: string;
      slot_capacity?: number;
    };

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (username !== undefined) updates.username = username.trim().toLowerCase();
    if (slot_capacity !== undefined) updates.slot_capacity = slot_capacity;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('offices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Name or username already exists' }, { status: 409 });
      }
      console.error('Error updating office:', error);
      return NextResponse.json({ error: 'Failed to update office' }, { status: 500 });
    }

    return NextResponse.json({ office: data });
  } catch (err) {
    console.error('Admin office PATCH error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    // Fetch current is_active state
    const { data: current, error: fetchError } = await supabaseAdmin
      .from('offices')
      .select('is_active')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Office not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('offices')
      .update({ is_active: !current.is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling office status:', error);
      return NextResponse.json({ error: 'Failed to toggle office status' }, { status: 500 });
    }

    return NextResponse.json({ office: data });
  } catch (err) {
    console.error('Admin office DELETE error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
