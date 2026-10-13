// app/api/appointments/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitize, isValidPhilippinePhone, isValidFutureDate, isValidName, isValidAge } from '@/lib/validation';
import { rateLimit, formatRemainingTime } from '@/lib/rate-limit';

const CATEGORY_CODES: Record<string, string> = {
  'new-checkup': 'NCC',
  'follow-up': 'FUC',
  'philhealth-yakap': 'PHY',
};

export async function POST(request: Request) {
  try {
    // === RATE LIMITING ===
    const ip = request.headers.get('x-forwarded-for') ?? 
               request.headers.get('x-real-ip') ?? 
               'unknown';
    
    const { success: rateLimitSuccess, remainingMs } = rateLimit(ip, 3, 10 * 60 * 1000);
    
    if (!rateLimitSuccess) {
      const waitTime = formatRemainingTime(remainingMs!);
      console.log(`⛔ Rate limited: ${ip} - Wait: ${waitTime}`);
      return NextResponse.json({ 
        error: `Too many booking attempts. Please try again in ${waitTime}.` 
      }, { status: 429 });
    }

    const body = await request.json();
    console.log('📥 Received body:', JSON.stringify(body, null, 2));
    
    const { category, office, date, slot, fullName, contactNumber, ...rest } = body;

    // === INPUT VALIDATION ===
    if (!category || !office || !date || !slot || !fullName || !contactNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Sanitize text inputs
    const cleanFullName = sanitize(fullName);
    const cleanOffice = sanitize(office);
    const cleanChiefComplaint = rest.chiefComplaint ? sanitize(rest.chiefComplaint) : null;
    const cleanPreviousDoctor = rest.previousDoctor ? sanitize(rest.previousDoctor) : null;
    const cleanFollowUpPurpose = rest.followUpPurpose ? sanitize(rest.followUpPurpose) : null;
    const cleanServiceType = rest.serviceType ? sanitize(rest.serviceType) : null;
    const cleanPhilhealthPin = rest.philhealthPin ? sanitize(rest.philhealthPin) : null;

    // Validate name
    if (!isValidName(cleanFullName)) {
      return NextResponse.json({ 
        error: 'Invalid name format. Please use letters only (at least 3 characters).' 
      }, { status: 400 });
    }

    // Validate phone
    if (!isValidPhilippinePhone(contactNumber)) {
      return NextResponse.json({ 
        error: 'Invalid phone number format. Please use Philippine mobile format (09XX-XXX-XXXX).' 
      }, { status: 400 });
    }

    // Validate date
    if (!isValidFutureDate(date)) {
      return NextResponse.json({ 
        error: 'Cannot book appointments in the past. Please select a future date.' 
      }, { status: 400 });
    }

    // Validate age if provided
    if (rest.age && !isValidAge(rest.age)) {
      return NextResponse.json({ 
        error: 'Invalid age. Please enter a valid age between 1 and 120.' 
      }, { status: 400 });
    }

    console.log('✅ All validations passed');

    // Strictly enforce per-office slot limit right before saving
    console.log('🔍 Checking slot availability for:', { office, date, slot });
    
    const [{ count, error: countError }, { data: officeData }] = await Promise.all([
      supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('office', office)
        .eq('date', date)
        .eq('slot', slot),
      supabase
        .from('offices')
        .select('max_slots_per_interval')
        .eq('name', office)
        .single(),
    ]);

    const maxCapacity = officeData?.max_slots_per_interval ?? 2;

    console.log('🔍 Query result:', { count, error: countError, maxCapacity });

    if (countError) {
      console.error('❌ Error checking slot availability:', countError);
      return NextResponse.json({ 
        error: 'Failed to verify slot availability',
        details: countError.message || countError.hint || 'Unknown database error'
      }, { status: 500 });
    }

    if (count !== null && count >= maxCapacity) {
      return NextResponse.json(
        { error: `Selected time slot is fully booked (Max ${maxCapacity} slots)` },
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

    // Save appointment record with sanitized inputs
    const { data: appointment, error: insertError } = await supabase
      .from('appointments')
      .insert({
        queue_id: queueId,
        category,
        office: cleanOffice,
        date,
        slot,
        full_name: cleanFullName,
        contact_number: contactNumber,
        age: rest.age ? parseInt(rest.age, 10) : null,
        sex: rest.sex || null,
        chief_complaint: cleanChiefComplaint,
        previous_doctor: cleanPreviousDoctor,
        follow_up_purpose: cleanFollowUpPurpose,
        philhealth_pin: cleanPhilhealthPin,
        service_type: cleanServiceType,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating appointment:', insertError);
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment successfully booked',
      queueId: appointment.queue_id,
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'Failed to process appointment' }, { status: 500 });
  }
}