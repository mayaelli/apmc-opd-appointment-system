'use client';

import { useMemo } from 'react';
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
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400 sm:w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
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
    <div className="max-w-lg mx-auto w-full space-y-4">
      {/* Ticket card */}
      <div className="bg-white rounded-sm border border-slate-200 shadow-sm overflow-hidden">
        {/* Header band */}
        <div className="bg-emerald-700 px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white leading-tight uppercase tracking-wide">
              APMC Outpatient Department
            </h2>
            <p className="text-emerald-200 text-sm mt-0.5">Official Appointment Ticket</p>
          </div>
          <span className="shrink-0 border border-white text-white text-xs font-bold px-3 py-1 rounded-sm mt-1 tracking-widest uppercase">
            CONFIRMED
          </span>
        </div>

        {/* Ticket body */}
        <div className="px-6 py-2">
          {/* Queue ID — prominent row */}
          <div className="py-4 border-b border-slate-100 bg-emerald-50 -mx-6 px-6">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Queue ID</p>
            <p className="font-mono text-2xl font-bold text-emerald-700 tracking-widest">{queueId}</p>
          </div>

          <TicketRow label="Patient Name" value={patientName} />
          <TicketRow label="Consultation Type" value={categoryLabel} />
          <TicketRow label="Assigned Office" value={office} />
          <TicketRow label="Appointment Date" value={formattedDate} />
          <TicketRow label="Time Slot" value={formattedTime} />
        </div>

        {/* Warning & instructions */}
        <div className="px-6 pb-5 space-y-3 mt-2">
          {/* Amber warning — left accent */}
          <div className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-bold mb-1">⚠ IMPORTANT</p>
            <p>
              Arrive <strong>30 minutes before</strong> your scheduled time for verification. Failure to arrive
              on time will result in slot forfeiture. Ongoing queues cannot be disrupted — missed slots require
              rebooking.
            </p>
          </div>

          {/* Screenshot note */}
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-base leading-snug shrink-0">📷</span>
            <span>Please <strong>screenshot or save</strong> this ticket. No SMS confirmation will be sent.</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={onReset}
        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm py-3 rounded-sm transition-colors shadow-sm tracking-wide uppercase"
      >
        Book Another Appointment
      </button>
    </div>
  );
}
