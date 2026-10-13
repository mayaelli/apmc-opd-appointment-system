import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('holidays')
      .select('date')
      .order('date');

    if (error) {
      console.error('Error fetching holidays:', error);
      return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
    }

    const dates = (data ?? []).map((h: { date: string }) => h.date);
    return NextResponse.json({ dates });
  } catch (err) {
    console.error('Error fetching holidays:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
