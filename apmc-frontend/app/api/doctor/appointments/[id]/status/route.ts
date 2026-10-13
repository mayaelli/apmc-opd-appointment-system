import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

// 'pending' is intentionally excluded — doctors can only advance status forward
const VALID_STATUSES = ['present', 'no-show', 'done'] as const;
type AppointmentStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // cookies() must be outside try/catch so the prerender bail-out throw propagates
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
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !VALID_STATUSES.includes(status as AppointmentStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    // Scope the update to only appointments belonging to the calling doctor's office
    const { error } = await supabaseAdmin
      .from('appointments')
      .update({ status })
      .eq('id', id)
      .eq('office', payload.officeName);

    if (error) {
      console.error('Error updating appointment status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Status update error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
