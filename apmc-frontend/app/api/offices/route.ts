import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase
      .from('offices')
      .select('id, name, categories, max_slots_per_interval')
      .eq('is_active', true);

    if (category) {
      query = query.contains('categories', [category]);
    }

    const { data, error } = await query.order('name');

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
