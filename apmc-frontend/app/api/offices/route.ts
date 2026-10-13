import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('offices')
      .select('id, name')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching offices:', error);
      return NextResponse.json({ error: 'Failed to fetch offices' }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('Error fetching offices:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
