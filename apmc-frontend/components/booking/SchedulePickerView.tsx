'use client';

import { useState, useMemo } from 'react';
import { AppointmentCategory } from '@/app/types/appointment';

interface SchedulePickerViewProps {
  category: AppointmentCategory;
  selectedOffice: string;
  selectedDate: string;
  selectedSlot: string;
  onOfficeChange: (office: string) => void;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const ALL_OFFICES = [
  'OPD Room 1 – General Medicine',
  'OPD Room 2 – Internal Medicine',
  'OPD Room 3 – Pediatrics',
  'OPD Room 4 – OB-GYN',
  'OPD Room 5 – Surgery',
];

const PHILHEALTH_OFFICE = 'PhilHealth Yakap Clinic';

// Philippine public holidays as YYYY-MM-DD strings
const HOLIDAYS = new Set<string>([
  // 2025
  '2025-01-01', '2025-04-09', '2025-04-17', '2025-04-18', '2025-04-19',
  '2025-05-01', '2025-06-12', '2025-08-25', '2025-11-01', '2025-11-30',
  '2025-12-08', '2025-12-25', '2025-12-30', '2025-12-31',
  // 2026
  '2026-01-01', '2026-04-02', '2026-04-03', '2026-04-09', '2026-05-01',
  '2026-06-12', '2026-08-31', '2026-11-01', '2026-11-30', '2026-12-08',
  '2026-12-25', '2026-12-30', '2026-12-31',
]);

// 18 slots: 08:00 – 16:30 in 30-min increments
const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 16; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 16 || true) {
    // add :30 up through 16:30
    if (h < 16) {
      TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
    }
  }
}
// The loop above produces 08:00–15:30 (16 slots). We need to also add 16:00 and 16:30.
TIME_SLOTS.push('16:00');
TIME_SLOTS.push('16:30');

// Actually, let's rebuild cleanly to guarantee exactly 18 slots
const SLOTS: string[] = (() => {
  const result: string[] = [];
  let minutes = 8 * 60; // start at 08:00
  while (result.length < 18) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    result.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    minutes += 30;
  }
  return result;
})();

function formatSlotLabel(slot: string): string {
  const [hStr, mStr] = slot.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h < 12 ? 'AM' : 'PM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function getFullSlotIndices(dateStr: string): Set<number> {
  if (!dateStr) return new Set();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash += dateStr.charCodeAt(i);
  }
  const indices = new Set<number>();
  const candidates = [hash % 18, (hash * 7) % 18, (hash * 13) % 18];
  for (const idx of candidates) {
    indices.add(idx);
  }
  return indices;
}

function padDate(n: number): string {
  return String(n).padStart(2, '0');
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${padDate(month + 1)}-${padDate(day)}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SchedulePickerView({
  category,
  selectedOffice,
  selectedDate,
  selectedSlot,
  onOfficeChange,
  onDateChange,
  onSlotChange,
  onNext,
  onBack,
}: SchedulePickerViewProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [calendarYear, setCalendarYear] = useState<number>(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(today.getMonth());

  const offices = useMemo(() => {
    if (category === 'philhealth-yakap') return [PHILHEALTH_OFFICE];
    return ALL_OFFICES;
  }, [category]);

  // Build calendar grid: array of {day, dateStr, isWeekday, isPast, isHoliday, isToday}
  const calendarData = useMemo(() => {
    // First day of the displayed month (0=Sun…6=Sat)
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    // Days in month
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();

    // We only show Mon–Fri columns (0=Mon…4=Fri in our grid).
    // Translate JS weekday (0=Sun) to Mon-based: (jsDay + 6) % 7 gives 0=Mon…6=Sun
    const firstDayMonBased = (firstDay + 6) % 7;

    // Build weeks (rows), each with 5 slots for Mon–Fri
    type CalCell = {
      day: number | null;
      dateStr: string | null;
      isPast: boolean;
      isHoliday: boolean;
      isWeekend: boolean;
    };

    const cells: CalCell[] = [];

    // Leading empty cells (only count Mon–Fri offset, but weekend days don't appear)
    // We need to figure out the blank cells before day 1 in the Mon–Fri grid.
    // If firstDayMonBased >= 5, the month starts on Sat (5) or Sun (6), so first weekday cell starts next week
    const blanksBefore = firstDayMonBased < 5 ? firstDayMonBased : 0;

    // Add blank cells
    for (let i = 0; i < blanksBefore; i++) {
      cells.push({ day: null, dateStr: null, isPast: false, isHoliday: false, isWeekend: false });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const jsDate = new Date(calendarYear, calendarMonth, d);
      const jsDay = jsDate.getDay(); // 0=Sun…6=Sat
      const isWeekend = jsDay === 0 || jsDay === 6;
      if (isWeekend) continue; // skip weekends entirely

      const dateStr = toDateString(calendarYear, calendarMonth, d);
      const isPast = jsDate < today;
      const isHoliday = HOLIDAYS.has(dateStr);

      cells.push({ day: d, dateStr, isPast, isHoliday, isWeekend: false });
    }

    // Build weeks (rows of up to 5)
    const weeks: CalCell[][] = [];
    for (let i = 0; i < cells.length; i += 5) {
      const row = cells.slice(i, i + 5);
      // Pad row to 5 if last row is short
      while (row.length < 5) {
        row.push({ day: null, dateStr: null, isPast: false, isHoliday: false, isWeekend: false });
      }
      weeks.push(row);
    }

    return weeks;
  }, [calendarYear, calendarMonth, today]);

  const fullSlotIndices = useMemo(() => getFullSlotIndices(selectedDate), [selectedDate]);

  const canGoBack = calendarYear > today.getFullYear() ||
    (calendarYear === today.getFullYear() && calendarMonth > today.getMonth());

  function prevMonth() {
    if (!canGoBack) return;
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((y) => y - 1);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((y) => y + 1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  }

  function handleDateClick(dateStr: string | null, isPast: boolean, isHoliday: boolean) {
    if (!dateStr || isPast || isHoliday) return;
    onDateChange(dateStr);
    onSlotChange(''); // reset slot when date changes
  }

  const canProceed = selectedOffice !== '' && selectedDate !== '' && selectedSlot !== '';

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Office & Schedule</h2>
        <p className="text-sm text-slate-500 mt-1">
          Select your assigned office, preferred date, and a 30-minute time slot.
        </p>
      </div>

      {/* Office selector */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">
          ASSIGNED OFFICE / DEPARTMENT <span className="text-red-500">*</span>
        </label>
        <select
          value={selectedOffice}
          onChange={(e) => onOfficeChange(e.target.value)}
          className="w-full border border-slate-300 rounded-sm px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none bg-white"
        >
          <option value="">— Select an office —</option>
          {offices.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {/* Calendar */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
          APPOINTMENT DATE <span className="text-red-500">*</span>
        </p>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={prevMonth}
              disabled={!canGoBack}
              aria-label="Previous month"
              className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm font-medium transition-colors ${
                canGoBack
                  ? 'text-slate-700 hover:bg-slate-200'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              ‹
            </button>
            <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              {MONTH_NAMES[calendarMonth].toUpperCase()} {calendarYear}
            </span>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              ›
            </button>
          </div>

          {/* Day column headers */}
          <div className="grid grid-cols-5 border-b border-slate-200">
            {DAY_LABELS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {d}
              </div>
            ))}
          </div>

          {/* Date rows */}
          <div className="divide-y divide-slate-100">
            {calendarData.map((week, wi) => (
              <div key={wi} className="grid grid-cols-5">
                {week.map((cell, ci) => {
                  if (!cell.day || !cell.dateStr) {
                    return <div key={ci} className="py-3" />;
                  }

                  const isSelected = selectedDate === cell.dateStr;
                  const isDisabled = cell.isPast || cell.isHoliday;

                  return (
                    <button
                      key={ci}
                      onClick={() => handleDateClick(cell.dateStr, cell.isPast, cell.isHoliday)}
                      disabled={isDisabled}
                      title={cell.isHoliday ? 'Public Holiday' : undefined}
                      className={`relative py-3 text-sm font-medium transition-colors flex flex-col items-center justify-center gap-0.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : isDisabled
                          ? 'text-slate-300 cursor-not-allowed bg-white'
                          : 'text-emerald-700 font-medium hover:bg-emerald-50 bg-emerald-50 border border-emerald-200 cursor-pointer'
                      }`}
                    >
                      <span>{cell.day}</span>
                      {cell.isHoliday && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-500'}`}
                          aria-label="Holiday"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-2 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-emerald-600" /> Selected
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> Holiday
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-slate-100" /> Unavailable
          </span>
        </div>
      </div>

      {/* Time slot grid */}
      {selectedDate && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
            TIME SLOT <span className="text-red-500">*</span>
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Each slot is 30 minutes. Maximum 2 patients per interval.
          </p>
          <div className="border-l-4 border-slate-400 bg-slate-50 px-4 py-3 text-sm text-slate-600 mb-3">
            Slots are limited to <strong>2 patients per 30-minute interval</strong>. Select an available time slot below.
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {SLOTS.map((slot, idx) => {
              const isFull = fullSlotIndices.has(idx);
              const isSelected = selectedSlot === slot;

              return (
                <button
                  key={slot}
                  onClick={() => !isFull && onSlotChange(slot)}
                  disabled={isFull}
                  className={`px-3 py-2.5 rounded-sm border text-sm font-medium transition-colors text-center ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : isFull
                      ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 cursor-pointer'
                  }`}
                >
                  <span className="block">{formatSlotLabel(slot)}</span>
                  <span className={`text-xs ${isSelected ? 'text-emerald-100' : isFull ? 'text-slate-300' : 'text-slate-400'}`}>
                    {isFull ? 'Full' : '2/2 avail'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-sm text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className={`px-6 py-2.5 rounded-sm font-medium text-sm transition-colors shadow-sm ${
            canProceed
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Next: Patient Details
        </button>
      </div>
    </div>
  );
}
