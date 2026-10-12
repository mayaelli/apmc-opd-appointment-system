'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { AppointmentCategory } from '@/app/types/appointment';

interface AppointmentTicketViewProps {
  queueId: string;
  patientName: string;
  category: AppointmentCategory;
  office: string;
  date: string;
  slot: string;
  onReset: () => void;
}

const CATEGORY_LABELS: Record<AppointmentCategory, string> = {
  'new-checkup': 'New Check-up / Konsulta',
  'follow-up': 'Follow-up Check-up',
  'philhealth-yakap': 'PhilHealth Yakap',
};

function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimeRange(slot: string): string {
  const [hStr, mStr] = slot.split(':');
  const startH = parseInt(hStr, 10);
  const startM = parseInt(mStr, 10);
  let endH = startH;
  let endM = startM + 30;
  if (endM >= 60) { endM -= 60; endH += 1; }
  function fmt(h: number, m: number): string {
    const period = h < 12 ? 'AM' : 'PM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }
  return `${fmt(startH, startM)} \u2013 ${fmt(endH, endM)}`;
}

function TicketRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex py-3 border-b border-slate-100 last:border-0">
      <span className="uppercase tracking-widest text-xs text-slate-400 font-semibold w-44 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export default function AppointmentTicketView({
  queueId,
  patientName,
  category,
  office,
  date,
  slot,
  onReset,
}: AppointmentTicketViewProps) {
  const formattedDate = useMemo(() => formatDateLong(date), [date]);
  const formattedTime = useMemo(() => formatTimeRange(slot), [slot]);
  const categoryLabel = CATEGORY_LABELS[category];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-4">
      {/* Ticket card */}
      <div className="border-4 border-slate-300 rounded-sm shadow-2xl overflow-hidden">
        {/* Header band */}
        <div className="bg-white px-6 py-6 border-b-4 border-emerald-600 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Image
              src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
              alt="Amai Pakpak Medical Center seal"
              width={48}
              height={48}
              className="object-contain shrink-0"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight uppercase tracking-wide">
                AMAI PAKPAK MEDICAL CENTER
              </h2>
              <p className="text-slate-600 text-xs mt-0.5">Outpatient Department</p>
            </div>
          </div>
          <span className="shrink-0 border-2 border-emerald-600 text-emerald-700 bg-emerald-50 text-xs font-bold px-4 py-2 rounded-sm tracking-widest uppercase">
            CONFIRMED
          </span>
        </div>

        {/* Queue ID section */}
        <div className="bg-emerald-600 px-6 py-6 border-b-2 border-emerald-700">
          <p className="uppercase tracking-widest text-xs text-emerald-200 font-bold mb-2">
            QUEUE IDENTIFICATION NUMBER
          </p>
          <div className="text-4xl font-mono font-black text-white tracking-widest">{queueId}</div>
        </div>

        {/* Patient details rows */}
        <div className="bg-white px-6 py-2">
          <TicketRow label="Patient Name" value={patientName} />
          <TicketRow label="Consultation Type" value={categoryLabel} />
          <TicketRow label="Assigned Office" value={office} />
          <TicketRow label="Appointment Date" value={formattedDate} />
          <TicketRow label="Time Slot" value={formattedTime} />
        </div>

        {/* Operational warnings */}
        <div className="px-6 py-6 space-y-4">
          {/* Amber warning */}
          <div className="border-l-[6px] border-amber-500 bg-amber-50 p-5 rounded-sm">
            <p className="uppercase tracking-wide text-xs text-amber-900 font-bold mb-2">
              ⚠ MANDATORY ARRIVAL POLICY
            </p>
            <p className="text-sm text-amber-800 leading-relaxed">
              Arrive <strong>30 minutes before</strong> your scheduled time for verification. Failure to arrive
              on time will result in slot forfeiture. Ongoing queues cannot be disrupted — missed slots require
              rebooking.
            </p>
          </div>

          {/* Screenshot note */}
          <div className="bg-slate-700 text-slate-50 p-4 rounded-sm text-sm flex items-start gap-2">
            <span className="text-base leading-snug shrink-0">📷</span>
            <span>Screenshot or save this ticket for your records. No SMS confirmation will be sent.</span>
          </div>
        </div>
      </div>

      {/* Footer action */}
      <button
        onClick={onReset}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white uppercase font-bold tracking-wide py-4 text-sm rounded-sm transition-colors shadow-sm"
      >
        Return to Homepage
      </button>
    </div>
  );
}
