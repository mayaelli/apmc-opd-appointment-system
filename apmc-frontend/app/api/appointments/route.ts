// app/api/appointments/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CATEGORY_CODES: Record<string, string> = {
  'new-checkup': 'NCC',
  'follow-up': 'FUC',
  'philhealth-yakap': 'PHY',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, office, date, slot, fullName, contactNumber, ...rest } = body;

    if (!category || !office || !date || !slot || !fullName || !contactNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Strictly enforce the 2-slot limit right before saving
    const currentCount = await prisma.appointment.count({
      where: { office, date, slot },
    });

    if (currentCount >= 2) {
      return NextResponse.json(
        { error: 'Selected time slot is fully booked (Max 2 slots)' },
        { status: 409 }
      );
    }

    // Generate Queue ID
    const code = CATEGORY_CODES[category] || 'GEN';
    const datePart = date.replace(/-/g, '');
    const randomPart = Math.floor(Math.random() * 9999 + 1)
      .toString()
      .padStart(4, '0');
    const queueId = `APMC-${code}-${datePart}-${randomPart}`;

    // Save appointment record
    const appointment = await prisma.appointment.create({
      data: {
        queueId,
        category,
        office,
        date,
        slot,
        fullName,
        contactNumber,
        age: rest.age ? parseInt(rest.age, 10) : null,
        sex: rest.sex || null,
        chiefComplaint: rest.chiefComplaint || null,
        philhealthPin: rest.philhealthPin || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Appointment successfully booked',
      queueId: appointment.queueId,
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to process appointment' }, { status: 500 });
  }
}