'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Appointment {
  id: string;
  queue_id: string;
  category: string;
  office: string;
  date: string;
  slot: string;
  full_name: string;
  contact_number: string;
  age: number | null;
  sex: string | null;
  chief_complaint: string | null;
  previous_doctor: string | null;
  follow_up_purpose: string | null;
  philhealth_pin: string | null;
  service_type: string | null;
  status: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'new-checkup': 'NCC',
  'follow-up': 'FUC',
  'philhealth-yakap': 'PHY',
};

const CATEGORY_COLORS: Record<string, string> = {
  'new-checkup': 'bg-blue-100 text-blue-800',
  'follow-up': 'bg-amber-100 text-amber-800',
  'philhealth-yakap': 'bg-purple-100 text-purple-800',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  present: 'bg-emerald-100 text-emerald-800',
  'no-show': 'bg-red-100 text-red-800',
  done: 'bg-blue-100 text-blue-800',
};

const TOTAL_TIME = 15 * 60 * 1000;
const WARNING_TIME = 14 * 60 * 1000;
const COUNTDOWN_DURATION = 60;

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [officeName, setOfficeName] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(COUNTDOWN_DURATION);

  // Timer refs — stored outside React state so mutations don't cause re-renders.
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // resetTimers is stable across renders (useCallback with no deps that change).
  // It uses refs for timers so it never captures stale closure values.
  const resetTimers = useCallback(() => {
    setShowTimeoutWarning(false);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setRemainingSeconds(COUNTDOWN_DURATION);

      countdownIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, WARNING_TIME);

    inactivityTimerRef.current = setTimeout(async () => {
      await fetch('/api/doctor/logout', { method: 'POST' });
      router.push('/doctor/login');
    }, TOTAL_TIME);
  }, [router]);

  // Fetch office name on mount
  useEffect(() => {
    // Set today's date on client side to avoid prerender mismatch
    setDate(new Date().toISOString().split('T')[0]);

    fetch('/api/doctor/me')
      .then((r) => {
        if (r.status === 401) {
          router.push('/doctor/login');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.officeName) setOfficeName(data.officeName);
      })
      .catch(() => router.push('/doctor/login'));
  }, [router]);

  // Fetch appointments when date changes
  const fetchAppointments = useCallback(async (selectedDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/appointments?date=${selectedDate}`);
      if (res.status === 401) {
        router.push('/doctor/login');
        return;
      }
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (date) fetchAppointments(date);
  }, [date, fetchAppointments]);

  // 15-minute idle timeout
  // handleActivity only resets when the warning is NOT showing — ordinary user
  // activity should not dismiss the modal.  The "Extend Session" button calls
  // resetTimers() directly (see onClick below) so it always works regardless of
  // the React state update timing.
  useEffect(() => {
    const handleActivity = () => {
      if (!showTimeoutWarning) resetTimers();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    resetTimers();

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [showTimeoutWarning, resetTimers]);

  async function handleLogout() {
    await fetch('/api/doctor/logout', { method: 'POST' });
    router.push('/doctor/login');
  }

  async function handleStatusUpdate(apptId: string, status: string) {
    setUpdatingId(apptId);
    try {
      const res = await fetch(`/api/doctor/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === apptId ? { ...a, status } : a))
        );
        // Update modal if open
        if (selectedAppt?.id === apptId) {
          setSelectedAppt((prev) => (prev ? { ...prev, status } : null));
        }
      }
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900 border-b-[3px] border-emerald-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
              alt="APMC"
              width={32}
              height={32}
              className="object-contain"
            />
            <div>
              <span className="font-bold text-white text-sm">APMC OPD — Doctor Portal</span>
              {officeName && (
                <span className="ml-2 text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-sm font-medium">
                  {officeName}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Timeout Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-sm shadow-2xl max-w-lg w-full p-8 border-t-[6px] border-red-600">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Session Expiring</h2>
            <p className="text-sm text-slate-600 mb-4">
              Your session will expire due to inactivity.
            </p>
            <div className="bg-red-600 rounded-sm p-6 mb-4 text-center">
              <span className="text-5xl font-mono font-black text-white">{remainingSeconds}s</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  // Call resetTimers() directly here rather than relying on the
                  // window 'click' handler — that handler guards with
                  // !showTimeoutWarning which is still true at the moment the
                  // event fires due to React's async state batching.
                  resetTimers();
                }}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-sm"
              >
                Extend Session
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-sm"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Detail Modal */}
      {selectedAppt && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedAppt(null)}
        >
          <div className="bg-white rounded-sm shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedAppt.full_name}</h2>
                <p className="text-sm text-slate-500">{selectedAppt.queue_id}</p>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                ['Queue ID', selectedAppt.queue_id],
                ['Category', selectedAppt.category],
                ['Office', selectedAppt.office],
                ['Date', selectedAppt.date],
                ['Slot', selectedAppt.slot],
                ['Contact Number', selectedAppt.contact_number],
                ['Age', selectedAppt.age?.toString() ?? '—'],
                ['Sex', selectedAppt.sex ?? '—'],
                ['Chief Complaint', selectedAppt.chief_complaint ?? '—'],
                ['Previous Doctor', selectedAppt.previous_doctor ?? '—'],
                ['Follow-up Purpose', selectedAppt.follow_up_purpose ?? '—'],
                ['PhilHealth PIN', selectedAppt.philhealth_pin ?? '—'],
                ['Service Type', selectedAppt.service_type ?? '—'],
                ['Status', selectedAppt.status],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3">
                  <span className="text-slate-500 uppercase tracking-wider text-xs font-semibold w-36 shrink-0 pt-0.5">
                    {label}
                  </span>
                  <span className="text-slate-900 font-medium">{value}</span>
                </div>
              ))}
            </div>

            {/* Status actions inside modal */}
            <div className="mt-6 flex gap-2 flex-wrap">
              {(['present', 'no-show', 'done'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusUpdate(selectedAppt.id, s)}
                  disabled={selectedAppt.status === s || updatingId === selectedAppt.id}
                  className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide transition-colors ${
                    selectedAppt.status === s
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {s === 'no-show' ? 'No Show' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Date picker */}
        <div className="flex items-center gap-4 mb-6">
          <div>
            <label className="block uppercase tracking-widest text-xs text-slate-500 font-semibold mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm text-slate-900 focus:outline-none"
            />
          </div>
          <div className="pt-5">
            <span className="text-sm text-slate-500">
              {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Queue table */}
        <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Queue ID
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Patient Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Slot
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Age/Sex
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full" />
                      <span className="text-sm">Loading appointments…</span>
                    </div>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">📋</span>
                      <span className="text-sm font-medium">No appointments for this date</span>
                    </div>
                  </td>
                </tr>
              ) : (
                appointments.map((appt) => (
                  <tr
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{appt.queue_id}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{appt.full_name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{appt.slot}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold ${
                          CATEGORY_COLORS[appt.category] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {CATEGORY_LABELS[appt.category] ?? appt.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {appt.age ? `${appt.age}` : '—'} {appt.sex ? `/ ${appt.sex}` : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold capitalize ${
                          STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {appt.status === 'no-show' ? 'No Show' : appt.status}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-1.5">
                        {(['present', 'no-show', 'done'] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => handleStatusUpdate(appt.id, s)}
                            disabled={appt.status === s || updatingId === appt.id}
                            className={`px-2 py-1 rounded-sm text-xs font-bold uppercase transition-colors ${
                              appt.status === s
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : s === 'present'
                                ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                                : s === 'no-show'
                                ? 'bg-red-100 hover:bg-red-200 text-red-800'
                                : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                            }`}
                          >
                            {s === 'no-show' ? 'No Show' : s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
