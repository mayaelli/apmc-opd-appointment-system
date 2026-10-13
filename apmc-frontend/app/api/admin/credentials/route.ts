import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';
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

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(12);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

// POST: generate a new password for an office
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { officeId } = body as { officeId?: string };

    if (!officeId) {
      return NextResponse.json({ error: 'officeId is required' }, { status: 400 });
    }

    const newPassword = generatePassword();

    const { error } = await supabaseAdmin.rpc('reset_office_password', {
      p_office_id: officeId,
      p_new_password: newPassword,
    });

    if (error) {
      console.error('Error resetting password:', error);
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({ generated_password: newPassword });
  } catch (err) {
    console.error('Admin credentials POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: reset password (with optional explicit new password)
export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { officeId, newPassword: providedPassword } = body as {
      officeId?: string;
      newPassword?: string;
    };

    if (!officeId) {
      return NextResponse.json({ error: 'officeId is required' }, { status: 400 });
    }

    const newPassword = providedPassword || generatePassword();

    const { error } = await supabaseAdmin.rpc('reset_office_password', {
      p_office_id: officeId,
      p_new_password: newPassword,
    });

    if (error) {
      console.error('Error resetting password:', error);
      return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }

    return NextResponse.json({ generated_password: newPassword });
  } catch (err) {
    console.error('Admin credentials PATCH error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
