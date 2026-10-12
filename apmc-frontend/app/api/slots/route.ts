// app/api/slots/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const STANDARD_SLOTS = [
  '08:00 AM - 08:30 AM',
  '08:30 AM - 09:00 AM',
  '09:00 AM - 09:30 AM',
  '09:30 AM - 10:00 AM',
  '10:00 AM - 10:30 AM',
  '10:30 AM - 11:00 AM',
  '01:00 PM - 01:30 PM',
  '01:30 PM - 02:00 PM',
  '02:00 PM - 02:30 PM',
  '02:30 PM - 03:00 PM',
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const office = searchParams.get('office');
  const date = searchParams.get('date');

  if (!office || !date) {
    return NextResponse.json({ error: 'Office and date are required' }, { status: 400 });
  }

  try {
    const existingAppointments = await prisma.appointment.findMany({
      where: { office, date },
      select: { slot: true },
    });

    const slotCounts: Record<string, number> = {};
    existingAppointments.forEach((appt) => {
      slotCounts[appt.slot] = (slotCounts[appt.slot] || 0) + 1;
    });

    const slots = STANDARD_SLOTS.map((slot) => {
      const bookedCount = slotCounts[slot] || 0;
      return {
        slot,
        bookedCount,
        maxCapacity: 2,
        isAvailable: bookedCount < 2,
      };
    });

    return NextResponse.json({ success: true, slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}