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
  pending: 'bg-amber-100 text-amber-800',
  'no-show': 'bg-red-100 text-red-800',
  completed: 'bg-emerald-100 text-emerald-800',
};

const TOTAL_TIME = 30 * 60 * 1000; // 30 minutes idle before warning
const WARNING_TIME = 29 * 60 * 1000; // Show warning at 29 minutes
const COUNTDOWN_DURATION = 60;

export default function DoctorDashboardPage() {
  const router = useRouter();
  const [officeName, setOfficeName] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(COUNTDOWN_DURATION);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Detect actual mobile/tablet devices (not just narrow windows)
  useEffect(() => {
    const detectMobileDevice = () => {
      // Check user agent for mobile/tablet indicators - only modern devices
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Only check for iPhone, iPad, iPod, and Android devices
      const isMobileUA = 
        userAgent.includes('iphone') ||
        userAgent.includes('ipad') ||
        userAgent.includes('ipod') ||
        userAgent.includes('android');
      
      // Only block if it's clearly a mobile user agent
      // Don't use touch detection or screen size to avoid blocking touchscreen desktops
      setIsMobileDevice(isMobileUA);
    };
    
    detectMobileDevice();
  }, []);

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
    // Set today's date on client side to avoid prerender mismatch (only if no date is set)
    if (!date) {
      setDate(new Date().toISOString().split('T')[0]);
    }

    fetch('/api/doctor/me')
      .then((r) => {
        if (r.status === 401) {
          // Only redirect if truly unauthorized (no valid cookie)
          // Don't redirect on network errors or other issues
          router.push('/doctor/login');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.officeName) setOfficeName(data.officeName);
      })
      .catch((err) => {
        // Network error - don't force logout, just log it
        console.error('Failed to fetch office info:', err);
      });
  }, [router]); // Only run once on mount

  // Fetch appointments when date changes
  const fetchAppointments = useCallback(async (selectedDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/doctor/appointments?date=${selectedDate}`);
      if (res.status === 401) {
        // Only redirect to login if cookie truly expired
        router.push('/doctor/login');
        return;
      }
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      // Network error - don't force logout
      console.error('Failed to fetch appointments:', err);
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

  function confirmLogout() {
    setShowLogoutConfirm(true);
  }

  async function handleStatusUpdate(apptId: string, status: string) {
    setUpdatingId(apptId);
    try {
      const res = await fetch(`/api/doctor/appointments/${apptId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        console.error('Status update failed:', error);
        alert(`Failed to update status: ${error.error || 'Unknown error'}`);
        return;
      }
      
      // Update local state
      setAppointments((prev) =>
        prev.map((a) => (a.id === apptId ? { ...a, status } : a))
      );
      
      // Update modal if open
      if (selectedAppt?.id === apptId) {
        setSelectedAppt((prev) => (prev ? { ...prev, status } : null));
      }
    } catch (err) {
      console.error('Network error:', err);
      alert('Network error updating status');
    } finally {
      setUpdatingId(null);
    }
  }

  // Calculate stats
  const filteredAppointments = appointments.filter(a => !categoryFilter || a.category === categoryFilter);

  // Generate dynamic avatar initials from department name
  const getDepartmentInitials = (deptName: string) => {
    if (!deptName) return 'OP';
    
    // Remove common suffixes and clean up
    const cleaned = deptName
      .replace(/\(.*?\)/g, '') // Remove parentheses content
      .replace(/(Department|Dept\.?|Ward|Unit|Service)/gi, '')
      .trim();
    
    // Split by common separators and get initials
    const words = cleaned.split(/[\s&-]+/).filter(w => w.length > 0);
    
    if (words.length === 0) return 'OP';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    
    // Take first letter of first two significant words
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  };

  const departmentInitials = getDepartmentInitials(officeName);

  // Block mobile/tablet devices only (not narrow desktop windows)
  if (isMobileDevice) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-200 p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
              alt="APMC"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          
          <div className="mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Desktop Workstation Access Only</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              The APMC OPD Doctor Portal is strictly configured for clinical desktop terminals. Please log in using a designated department computer.
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <div className="text-left">
                <p className="text-xs font-semibold text-amber-900 mb-1">Mobile Access Restricted</p>
                <p className="text-xs text-amber-700">This portal requires a desktop or laptop computer</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={confirmLogout}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
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
            <span className="font-bold text-white text-sm">APMC OPD — {officeName || 'Doctor Portal'}</span>
          </div>
          <button
            onClick={confirmLogout}
            className="text-sm text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-red-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Confirm Logout</h2>
                <p className="text-sm text-slate-500">Are you sure you want to sign out?</p>
              </div>
            </div>
           
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> You will be returned to the login page and your session will end.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Yes, Logout
              </button>
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto p-6 max-h-[90vh] overflow-y-auto">
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
                ['Patient Name', selectedAppt.full_name],
                ['Queue ID', selectedAppt.queue_id],
                ['Category', selectedAppt.category],
                ['Office', selectedAppt.office],
                ['Date', selectedAppt.date],
                ['Slot', selectedAppt.slot],
                ['Contact Number', selectedAppt.contact_number],
                selectedAppt.age ? ['Age', selectedAppt.age.toString()] : null,
                selectedAppt.sex ? ['Sex', selectedAppt.sex] : null,
                selectedAppt.chief_complaint ? ['Chief Complaint', selectedAppt.chief_complaint] : null,
                selectedAppt.previous_doctor ? ['Previous Doctor', selectedAppt.previous_doctor] : null,
                selectedAppt.follow_up_purpose ? ['Follow-up Purpose', selectedAppt.follow_up_purpose] : null,
                selectedAppt.philhealth_pin ? ['PhilHealth PIN', selectedAppt.philhealth_pin] : null,
                selectedAppt.service_type ? ['Service Type', selectedAppt.service_type] : null,
                ['Status', selectedAppt.status],
              ]
                .filter((item): item is [string, string] => item !== null)
                .map(([label, value]) => (
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
              {(['completed', 'no-show'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusUpdate(selectedAppt.id, s)}
                  disabled={updatingId === selectedAppt.id}
                  className={`px-3 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wide transition-colors ${
                    selectedAppt.status === s
                      ? 'bg-slate-700 text-white ring-2 ring-slate-400'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                  }`}
                >
                  {s === 'no-show' ? 'No Show' : s.charAt(0).toUpperCase() + s.slice(1)}
                  {selectedAppt.status === s && ' ✓'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Unified Toolbar - Floating Card */}
        <div className="w-full bg-white border border-slate-200 rounded-sm p-3 sm:p-5 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            {/* Left: Date picker with refresh */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm text-slate-900 focus:outline-none bg-white w-full sm:w-auto"
                />
                <button
                  onClick={() => date && fetchAppointments(date)}
                  disabled={loading}
                  className="p-2 sm:p-2.5 border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 rounded-lg text-slate-600 hover:text-emerald-700 transition-all disabled:opacity-50 flex-shrink-0"
                  title="Refresh"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              </div>
              
              {/* Appointment count */}
              <div className="text-sm text-slate-600 font-medium px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                {appointments.filter(a => !categoryFilter || a.category === categoryFilter).length} {appointments.filter(a => !categoryFilter || a.category === categoryFilter).length === 1 ? 'appointment' : 'appointments'}
              </div>
            </div>

            {/* Right: Category filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 hidden sm:inline">Filter:</span>
              {[
                { value: '', label: 'All' },
                { value: 'new-checkup', label: 'New Check-up' },
                { value: 'follow-up', label: 'Follow-up' },
                { value: 'philhealth-yakap', label: 'Konsulta' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                    categoryFilter === cat.value
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Queue table - Modern Card */}
        <div className="w-full bg-white border border-slate-200 rounded-sm overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Queue ID
                </th>
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Patient Name
                </th>
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Slot
                </th>
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                  Age/Sex
                </th>
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-3 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin h-10 w-10 border-4 border-slate-200 border-t-emerald-600 rounded-full" />
                      <span className="text-sm font-medium">Loading appointments…</span>
                    </div>
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-slate-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <span className="text-3xl">📋</span>
                      </div>
                      <span className="text-sm font-medium">No appointments for this date</span>
                    </div>
                  </td>
                </tr>
              ) : (
                appointments
                  .filter(appt => !categoryFilter || appt.category === categoryFilter)
                  .map((appt) => (
                  <tr
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs tracking-wider text-slate-600">{appt.queue_id}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-slate-900 text-xs sm:text-sm">{appt.full_name}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs">{appt.slot}</td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-semibold ${
                          CATEGORY_COLORS[appt.category] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {CATEGORY_LABELS[appt.category] ?? appt.category}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs hidden lg:table-cell">
                      {appt.age ? `${appt.age}` : '—'} {appt.sex ? `/ ${appt.sex}` : ''}
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4">
                      <span
                        className={`inline-block px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-semibold capitalize ${
                          STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {appt.status === 'no-show' ? 'No Show' : appt.status}
                      </span>
                    </td>
                    <td
                      className="px-3 sm:px-6 py-3 sm:py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="relative inline-block">
                        <select
                          value={appt.status}
                          onChange={(e) => handleStatusUpdate(appt.id, e.target.value)}
                          disabled={updatingId === appt.id}
                          className="appearance-none border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg pl-6 sm:pl-8 pr-8 sm:pr-10 py-1.5 sm:py-2 text-xs font-medium text-slate-900 focus:outline-none bg-white disabled:opacity-50 hover:border-slate-400 transition-all cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                          <option value="no-show">No Show</option>
                        </select>
                        {/* Status indicator dot */}
                        <div className={`absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${
                          appt.status === 'pending' ? 'bg-amber-500' :
                          appt.status === 'completed' ? 'bg-emerald-500' :
                          'bg-slate-400'
                        }`} />
                        {/* Dropdown arrow */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4 absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </div>
  );
}
