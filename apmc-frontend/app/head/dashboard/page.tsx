'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Tab = 'overview' | 'appointments';

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
}

interface Stats {
  totalAppointments: number;
  totalToday: number;
  activeOffices: number;
  byStatus: { pending: number; present: number; done: number; noShow: number };
  byOffice: { name: string; count: number }[];
}

interface Office {
  id: string;
  name: string;
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
  completed: 'bg-emerald-100 text-emerald-800',
  'no-show': 'bg-slate-100 text-slate-500',
};

const PAGE_SIZE = 20;

export default function HeadDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Filters - set default date to today
  const [filterDate, setFilterDate] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Set mounted flag on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Detect mobile/tablet devices
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isMobileUA =
      ua.includes('iphone') ||
      ua.includes('ipad') ||
      ua.includes('ipod') ||
      ua.includes('android');
    setIsMobileDevice(isMobileUA);
  }, []);

  // Profile menu click-outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  // Set default date on mount
  useEffect(() => {
    if (!filterDate) {
      setFilterDate(new Date().toISOString().split('T')[0]);
    }
    // Set current date for display
    setCurrentDate(new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));
  }, [filterDate]);

  // Update document title for print
  useEffect(() => {
    document.title = 'APMC OPD — Official Appointment Roster';
  }, []);

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/head/stats');
    if (res.status === 401) { router.push('/head/login'); return; }
    const data = await res.json();
    setStats(data);
  }, [router]);

  const fetchOffices = useCallback(async () => {
    const res = await fetch('/api/offices');
    const data = await res.json();
    setOffices(Array.isArray(data) ? data : []);
  }, []);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterDate) params.set('date', filterDate);
      if (filterOffice) params.set('office', filterOffice);
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);

      const res = await fetch(`/api/head/appointments?${params.toString()}`);
      if (res.status === 401) { router.push('/head/login'); return; }
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterOffice, filterStatus, filterCategory, router]);

  useEffect(() => {
    fetchStats();
    fetchOffices();
  }, [fetchStats, fetchOffices]);

  // Auto-fetch on mount with default date
  useEffect(() => {
    if (filterDate) {
      fetchAppointments();
    }
  }, [filterDate, fetchAppointments]);

  async function handleLogout() {
    await fetch('/api/head/logout', { method: 'POST' });
    router.push('/head/login');
  }

  function confirmLogout() {
    setShowLogoutConfirm(true);
  }

  function handleClearFilters() {
    setFilterDate(new Date().toISOString().split('T')[0]);
    setFilterOffice('');
    setFilterStatus('');
    setFilterCategory('');
  }

  const paginatedAppointments = appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(appointments.length / PAGE_SIZE);
  const maxOfficeCount = stats?.byOffice.reduce((m, o) => Math.max(m, o.count), 0) ?? 1;

  const getDepartmentInitials = (deptName: string) => {
    if (!deptName) return 'OP';
    const cleaned = deptName
      .replace(/\(.*?\)/g, '')
      .replace(/(Department|Dept\.?|Ward|Unit|Service)/gi, '')
      .trim();
    const words = cleaned.split(/[\s&-]+/).filter(w => w.length > 0);
    if (words.length === 0) return 'OP';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return words.slice(0, 2).map(w => w[0].toUpperCase()).join('');
  };

  const departmentInitials = getDepartmentInitials('Head Office');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'appointments', label: 'Appointments' },
  ];

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
              The APMC OPD Head Portal is strictly configured for clinical desktop terminals. Please log in using a designated department computer.
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

      {/* Print styles - client only to avoid hydration mismatch */}
      {isMounted && (
        <style suppressHydrationWarning>{`
        @media print {
          /* Hide interactive elements */
          header, .no-print, nav, button, .pagination { 
            display: none !important; 
          }
          
          /* Force page margins to hide browser headers/footers - LANDSCAPE A4 */
          @page {
            margin: 12mm; 
            size: A4 landscape;
          }
          
          /* Clean paper background & ink optimization */
          * {
            background: transparent !important;
            color: black !important;
            box-shadow: none !important;
            text-shadow: none !important;
            box-sizing: border-box;
          }
          
          html, body { 
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            font-family: 'Times New Roman', Times, serif !important;
            color: black !important;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Show print header */
          .print-header {
            display: block !important;
            page-break-after: avoid;
            margin-bottom: 16px;
            background: transparent !important;
          }
          
          /* Remove all containers and constraints */
          main, .print-container {
            max-width: none !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }
          
          /* Table container - remove all scroll/overflow */
          .table-wrapper {
            overflow: visible !important;
            display: block !important;
            width: 100% !important;
            max-width: none !important;
            background: transparent !important;
          }
          
          /* Table formatting - BOND PAPER STYLE */
          .print-table { 
            display: table !important;
            width: 100% !important;
            max-width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
            margin: 0 !important;
            font-family: 'Times New Roman', Times, serif !important;
            font-size: 11pt !important;
            background: transparent !important;
          }
          
          .print-table thead {
            display: table-header-group !important;
            background: transparent !important;
          }
          
          .print-table tbody {
            display: table-row-group !important;
            background: transparent !important;
          }
          
          .print-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
            background: transparent !important;
          }
          
          .print-table th,
          .print-table td {
            border: 1px solid black !important;
            padding: 8px 6px !important;
            font-size: 11pt !important;
            line-height: 1.4 !important;
            color: black !important;
            background: transparent !important;
            word-wrap: break-word !important;
            white-space: normal !important;
            overflow: visible !important;
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .print-table th {
            background: transparent !important;
            font-weight: bold !important;
            text-transform: uppercase !important;
            font-size: 10pt !important;
            letter-spacing: 0.5px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Remove alternating row colors - pure transparent */
          .print-table tbody tr:nth-child(even) {
            background: transparent !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Remove ALL badge/colored styling in print */
          .print-table .badge,
          .print-table span[class*="bg-"],
          .print-table span[class*="text-"] {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            color: black !important;
            font-weight: normal !important;
            border-radius: 0 !important;
          }
          
          /* Prevent orphaned rows */
          .print-table tbody tr {
            page-break-inside: avoid;
          }
          
          /* Column widths for landscape layout - 6 columns (no Patient Name) */
          /* Queue ID - monospace for better readability */
          .print-table th:nth-child(1),
          .print-table td:nth-child(1) {
            width: 20% !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 10pt !important;
          }
          
          /* Office */
          .print-table th:nth-child(3),
          .print-table td:nth-child(3) {
            width: 28% !important;
            font-size: 10pt !important;
          }
          
          /* Date */
          .print-table th:nth-child(4),
          .print-table td:nth-child(4) {
            width: 12% !important;
            white-space: nowrap !important;
          }
          
          /* Slot */
          .print-table th:nth-child(5),
          .print-table td:nth-child(5) {
            width: 15% !important;
            white-space: nowrap !important;
          }
          
          /* Category */
          .print-table th:nth-child(6),
          .print-table td:nth-child(6) {
            width: 12% !important;
            text-align: center !important;
            font-weight: bold !important;
          }
          
          /* Status */
          .print-table th:nth-child(7),
          .print-table td:nth-child(7) {
            width: 13% !important;
            text-align: center !important;
            text-transform: capitalize !important;
          }
          
          /* Hide patient name column in print (2nd column) */
          .print-table th:nth-child(2),
          .print-table td.patient-name {
            display: none !important;
          }
        }
      `}</style>
      )}

      {/* Print Header - Hidden on screen, visible in print */}
      <div className="print-header hidden">
        <style>{`
          @media print {
            .print-header {
              font-family: 'Times New Roman', Times, serif !important;
              color: black !important;
              background: transparent !important;
            }
            .print-header * {
              color: black !important;
              background: transparent !important;
            }
            .print-header h1 {
              font-size: 18pt !important;
              font-weight: bold !important;
              letter-spacing: 1px !important;
              margin: 0 !important;
            }
            .print-header p {
              font-size: 11pt !important;
              margin: 4px 0 0 0 !important;
            }
            .print-header .metadata {
              font-size: 10pt !important;
              border-top: 1px solid black !important;
              border-bottom: 1px solid black !important;
              padding: 8px 0 !important;
              margin: 12px 0 !important;
              background: transparent !important;
            }
            .print-header .legend {
              font-size: 9pt !important;
              border: 1px solid black !important;
              padding: 6px 10px !important;
              margin-top: 10px !important;
              background: transparent !important;
            }
          }
        `}</style>
        <div className="text-center mb-6 pb-4" style={{ borderBottom: '2px solid black', background: 'transparent' }}>
          <div className="flex items-center justify-center gap-4 mb-3">
            <Image
              src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
              alt="APMC Logo"
              width={60}
              height={60}
              className="object-contain"
              style={{ filter: 'grayscale(100%)' }}
            />
            <div>
              <h1 className="text-2xl font-bold uppercase tracking-wide" style={{ fontFamily: 'Times New Roman, serif', color: 'black' }}>
                AMAI PAKPAK MEDICAL CENTER
              </h1>
              <p className="text-sm font-semibold uppercase tracking-wider mt-1" style={{ fontFamily: 'Times New Roman, serif', color: 'black' }}>
                Outpatient Department (OPD) — Official Appointment Roster
              </p>
            </div>
          </div>
          
          {/* Metadata Bar */}
          <div className="metadata flex justify-between items-center mt-4 pt-3 text-xs" style={{ borderTop: '1px solid black', color: 'black', background: 'transparent' }}>
            <div>
              <strong>Generation Date:</strong> {currentDate || '—'}
            </div>
            <div>
              <strong>Filter Date:</strong> {filterDate ? new Date(filterDate + 'T00:00:00').toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }) : 'All Dates'}
            </div>
            <div>
              <strong>Office:</strong> {filterOffice || 'All Offices'}
            </div>
            <div>
              <strong>Total Records:</strong> {appointments.length}
            </div>
          </div>
          
          {/* Category Legend */}
          <div className="legend mt-3 pt-3 text-xs text-left" style={{ border: '1px solid black', backgroundColor: 'transparent', padding: '8px 12px', color: 'black' }}>
            <strong>Category Legend:</strong> 
            <span className="ml-2">NCC = New Check-up/Consultation</span> · 
            <span className="ml-2">FUC = Follow-up Consultation</span> · 
            <span className="ml-2">PHY = PhilHealth Yakap Clinic</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-emerald-950 border-b border-emerald-900 shadow-lg backdrop-blur-sm">
        <div className="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
              alt="APMC"
              width={32}
              height={32}
              className="object-contain"
            />
            <span className="font-bold text-white text-sm tracking-wide">APMC OPD</span>
            <div className="hidden sm:block w-px h-5 bg-emerald-700" />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/60 text-emerald-200 border border-emerald-700/50">
              Head Office
            </span>
          </div>
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="flex items-center gap-2.5 group"
              aria-label="Profile menu"
            >
              {/* Avatar circle with initials */}
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {departmentInitials}
              </div>
              {/* Text info */}
              <div className="block text-left">
                <div className="text-xs font-semibold text-white truncate max-w-[120px] sm:max-w-none leading-tight">
                  Head Office
                </div>
                <div className="text-xs text-emerald-400 leading-tight">OPD Station</div>
              </div>
              {/* Chevron */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
                className={`w-4 h-4 text-emerald-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {/* Dropdown menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[200]">
                {/* Header section */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {departmentInitials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        Head Office
                      </div>
                      <div className="text-xs text-slate-500">Outpatient Department</div>
                    </div>
                  </div>
                </div>
                {/* Menu items */}
                <div className="py-1">
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    Department Profile
                  </button>
                  <button
                    onClick={() => setShowProfileMenu(false)}
                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-slate-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Station Settings
                  </button>
                  {/* Divider */}
                  <div className="border-t border-slate-100 my-1" />
                  <button
                    onClick={() => { setShowProfileMenu(false); confirmLogout(); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Appointment Detail Modal */}
      {selectedAppt && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedAppt(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
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
          </div>
        </div>
      )}

      <main className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="no-print border-b-2 border-slate-200 mb-6 flex gap-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 sm:px-5 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'border-b-2 border-emerald-600 text-emerald-700 -mb-0.5'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Appointments', value: stats?.totalAppointments ?? '—' },
                { label: "Today's Appointments", value: stats?.totalToday ?? '—' },
                { label: 'Completed', value: stats?.byStatus.done ?? '—' },
                { label: 'Active Offices', value: stats?.activeOffices ?? '—' },
              ].map((card) => (
                <div key={card.label} className="bg-white border border-slate-200 rounded-sm p-6">
                  <div className="text-3xl font-black text-emerald-600 mb-1">{card.value}</div>
                  <div className="text-xs text-slate-500 font-semibold">{card.label}</div>
                </div>
              ))}
            </div>

            {stats && stats.byOffice.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">
                  Appointments by Office (All Time)
                </h3>
                <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2">
                  {stats.byOffice.map((o) => {
                    const pct = maxOfficeCount > 0 ? (o.count / maxOfficeCount) * 100 : 0;
                    return (
                      <div key={o.name} className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-xs text-slate-700 font-bold">{o.count}</span>
                        <div
                          className="w-8 bg-emerald-600 rounded-t transition-all hover:bg-emerald-700"
                          style={{ height: `${Math.max(pct, 2)}%` }}
                          title={`${o.name}: ${o.count}`}
                        />
                        <span
                          className="text-xs text-slate-500 max-w-[60px] text-center leading-tight"
                          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: '60px', overflow: 'hidden' }}
                        >
                          {o.name.length > 15 ? o.name.slice(0, 14) + '…' : o.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-4">
            {/* Filters - Modern Card */}
            <div className="no-print bg-white border border-slate-200 rounded-sm p-5 mb-4 sm:mb-6">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none bg-white"
                    />
                  </div>
                  <button
                    onClick={fetchAppointments}
                    disabled={loading}
                    className="p-2.5 border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 rounded-lg text-slate-600 hover:text-emerald-700 transition-all disabled:opacity-50 mt-5"
                    title="Refresh"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Office</label>
                  <select
                    value={filterOffice}
                    onChange={(e) => setFilterOffice(e.target.value)}
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none bg-white"
                  >
                    <option value="">All Offices</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none bg-white"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none bg-white"
                  >
                    <option value="">All Categories</option>
                    <option value="new-checkup">New Checkup</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="philhealth-yakap">PhilHealth Yakap</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchAppointments}
                    disabled={loading}
                    className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors whitespace-nowrap"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 px-4 rounded-lg text-sm transition-colors whitespace-nowrap"
                    title="Clear Filters"
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="p-2.5 border border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 rounded-lg text-slate-600 hover:text-emerald-700 transition-all"
                    title="Print"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Table - Modern Card */}
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden print-container">
              <div className="w-full overflow-x-auto table-wrapper">
                <table className="w-full text-sm print-table min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Queue ID</th>
                      <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Patient Name</th>
                      <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Office</th>
                      <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Date</th>
                      <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Slot</th>
                      <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Category</th>
                      <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Status</th>
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
                        <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                          No data available
                        </td>
                      </tr>
                    ) : (
                      /* Show paginated on screen, all filtered appointments in print */
                      (typeof window !== 'undefined' && window.matchMedia('print').matches 
                        ? appointments 
                        : paginatedAppointments
                      ).map((appt) => (
                        <tr
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                        >
                          <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-xs tracking-wider text-slate-600">{appt.queue_id}</td>
                          <td className="patient-name px-4 sm:px-6 py-3 sm:py-4 font-semibold text-slate-900">{appt.full_name}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs">{appt.office}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs whitespace-nowrap">{appt.date}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs whitespace-nowrap">{appt.slot}</td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <span className={`badge inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                              CATEGORY_COLORS[appt.category] ?? 'bg-slate-100 text-slate-700'
                            }`}>
                              {CATEGORY_LABELS[appt.category] ?? appt.category}
                            </span>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <span className={`badge inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                              STATUS_COLORS[appt.status] ?? 'bg-slate-100 text-slate-700'
                            }`}>
                              {appt.status === 'no-show' ? 'No Show' : appt.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="no-print pagination flex items-center gap-3 justify-between flex-wrap">
                <span className="text-sm text-slate-600 font-medium">
                  Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong> · <strong className="text-slate-900">{appointments.length}</strong> total appointments
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:bg-transparent font-medium transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm border-2 border-slate-300 hover:border-emerald-600 hover:bg-emerald-50 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-slate-300 disabled:hover:bg-transparent font-medium transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
