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
  // cookies() called outside try/catch so prerender bail-out propagates
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalRes, todayRes, officesRes, allRes] = await Promise.all([
      supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('appointments').select('*', { count: 'exact', head: true }).eq('date', today),
      supabaseAdmin.from('offices').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabaseAdmin.from('appointments').select('status, office'),
    ]);

    const byStatus = { pending: 0, present: 0, done: 0, noShow: 0 };
    const officeCountMap: Record<string, number> = {};

    (allRes.data ?? []).forEach((a: { status: string; office: string }) => {
      if (a.status === 'pending') byStatus.pending++;
      else if (a.status === 'present') byStatus.present++;
      else if (a.status === 'done') byStatus.done++;
      else if (a.status === 'no-show') byStatus.noShow++;
      officeCountMap[a.office] = (officeCountMap[a.office] || 0) + 1;
    });

    const byOffice = Object.entries(officeCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalAppointments: totalRes.count ?? 0,
      totalToday: todayRes.count ?? 0,
      activeOffices: officesRes.count ?? 0,
      byStatus,
      byOffice,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
