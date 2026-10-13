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

export async function GET() {
  // cookies() call is outside try/catch so the prerender bail-out propagates correctly
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { data, error } = await supabaseAdmin
      .from('offices')
      .select('id, name, username, slot_capacity, is_active, created_at')
      .order('name');

    if (error) {
      console.error('Error fetching offices:', error);
      return NextResponse.json({ error: 'Failed to fetch offices' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Admin offices GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, username, slot_capacity } = body as {
      name?: string;
      username?: string;
      slot_capacity?: number;
    };

    if (!name || !username) {
      return NextResponse.json({ error: 'Name and username are required' }, { status: 400 });
    }

    const generatedPassword = generatePassword();

    const { data, error } = await supabaseAdmin.rpc('create_office_with_password', {
      p_name: name.trim(),
      p_username: username.trim().toLowerCase(),
      p_password: generatedPassword,
      p_slot_capacity: slot_capacity ?? 2,
    });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Office name or username already exists' }, { status: 409 });
      }
      console.error('Error creating office:', error);
      return NextResponse.json({ error: 'Failed to create office' }, { status: 500 });
    }

    return NextResponse.json({ office: data, generated_password: generatedPassword }, { status: 201 });
  } catch (err) {
    console.error('Admin offices POST error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
