'use client';

import { useMemo } from 'react';
import { AppointmentCategory } from '@/app/types/appointment';

interface AppointmentTicketViewProps {
  queueId: string;
  patientName: string;
  category: AppointmentCategory;
  office: string;
  date: string; // 'YYYY-MM-DD'
  slot: string; // 'HH:MM'
  onReset: () => void;
}

const CATEGORY_LABELS: Record<AppointmentCategory, string> = {
  'new-checkup': 'New Check-up / Konsulta',
  'follow-up': 'Follow-up Check-up',
  'philhealth-yakap': 'PhilHealth Yakap',
};

function formatDateLong(dateStr: string): string {
  // Parse as local date to avoid UTC offset shift
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
  if (endM >= 60) {
    endM -= 60;
    endH += 1;
  }

  function fmt(h: number, m: number): string {
    const period = h < 12 ? 'AM' : 'PM';
    const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  return `${fmt(startH, startM)} – ${fmt(endH, endM)}`;
}

function TicketRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 sm:w-36 shrink-0">{label}</span>
      <span className={`text-sm font-medium text-slate-900 ${mono ? 'font-mono text-2xl font-bold' : ''}`}>
        {value}
      </span>
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
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        style={{ borderTop: '4px solid #059669' }}
      >
        {/* Card header */}
        <div className="px-6 py-5 flex items-start justify-between gap-4 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">
              APMC Outpatient Department
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">Official Appointment Confirmation</p>
          </div>
          <span className="shrink-0 bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full mt-1">
            CONFIRMED
          </span>
        </div>

        {/* Ticket body */}
        <div className="px-6 py-2">
          {/* Queue ID — rendered large separately */}
          <div className="py-4 border-b border-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Queue ID</p>
            <p className="font-mono text-2xl font-bold text-slate-900 tracking-widest">{queueId}</p>
          </div>

          <TicketRow label="Patient Name" value={patientName} />
          <TicketRow label="Consultation Type" value={categoryLabel} />
          <TicketRow label="Assigned Office" value={office} />
          <TicketRow label="Appointment Date" value={formattedDate} />
          <TicketRow label="Time Slot" value={formattedTime} />
        </div>

        {/* Warning & instructions */}
        <div className="px-6 pb-5 space-y-3 mt-2">
          {/* Amber warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">⚠️ IMPORTANT</p>
            <p>
              Arrive <strong>30 minutes before</strong> your scheduled time for verification. Failure to arrive
              on time will result in slot forfeiture. Ongoing queues cannot be disrupted — missed slots require
              rebooking.
            </p>
          </div>

          {/* Screenshot prompt */}
          <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 flex items-start gap-2">
            <span className="text-base leading-snug">📷</span>
            <span>Please <strong>screenshot or save</strong> this ticket. No SMS confirmation will be sent.</span>
          </div>
        </div>
      </div>

      {/* Action */}
      <button
        onClick={onReset}
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-3 rounded-xl transition-colors shadow-sm"
      >
        Book Another Appointment
      </button>
    </div>
  );
}
