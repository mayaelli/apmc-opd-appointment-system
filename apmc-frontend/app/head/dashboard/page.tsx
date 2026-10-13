'use client';

import { useState, useEffect, useCallback } from 'react';
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
  pending: 'bg-slate-100 text-slate-700',
  present: 'bg-emerald-100 text-emerald-800',
  'no-show': 'bg-red-100 text-red-800',
  done: 'bg-blue-100 text-blue-800',
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

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterOffice, setFilterOffice] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

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

  async function handleLogout() {
    await fetch('/api/head/logout', { method: 'POST' });
    router.push('/head/login');
  }

  const paginatedAppointments = appointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(appointments.length / PAGE_SIZE);
  const maxOfficeCount = stats?.byOffice.reduce((m, o) => Math.max(m, o.count), 0) ?? 1;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'appointments', label: 'Appointments' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Print styles */}
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          .print-table { display: block !important; }
          body { background: white; }
        }
      `}</style>

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
            <span className="font-bold text-white text-sm">APMC OPD — Head Dashboard</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Appointment Detail Modal */}
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
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="no-print border-b-2 border-slate-200 mb-6 flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-semibold transition-colors ${
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Appointments', value: stats?.totalAppointments ?? '—' },
                { label: "Today's Appointments", value: stats?.totalToday ?? '—' },
                { label: 'Completed (Done)', value: stats?.byStatus.done ?? '—' },
                { label: 'Active Offices', value: stats?.activeOffices ?? '—' },
              ].map((card) => (
                <div key={card.label} className="bg-white border border-slate-200 rounded-sm p-6">
                  <div className="text-3xl font-black text-emerald-600 mb-1">{card.value}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-widest font-semibold">{card.label}</div>
                </div>
              ))}
            </div>

            {stats && stats.byOffice.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-sm p-6">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">
                  Appointments by Office (All Time)
                </h3>
                <div className="flex items-end gap-2 h-40 overflow-x-auto pb-2">
                  {stats.byOffice.map((o) => {
                    const pct = maxOfficeCount > 0 ? (o.count / maxOfficeCount) * 100 : 0;
                    return (
                      <div key={o.name} className="flex flex-col items-center gap-1 min-w-[40px]">
                        <span className="text-xs text-slate-700 font-bold">{o.count}</span>
                        <div
                          className="w-8 bg-emerald-600 rounded-t-sm transition-all"
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
            {/* Filters */}
            <div className="no-print bg-white border border-slate-200 rounded-sm p-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Date</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Office</label>
                  <select
                    value={filterOffice}
                    onChange={(e) => setFilterOffice(e.target.value)}
                    className="border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">All Offices</option>
                    {offices.map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="present">Present</option>
                    <option value="no-show">No Show</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Category</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="">All Categories</option>
                    <option value="new-checkup">New Checkup</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="philhealth-yakap">PhilHealth Yakap</option>
                  </select>
                </div>
                <button
                  onClick={fetchAppointments}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-5 rounded-sm text-sm uppercase tracking-wide"
                >
                  Apply Filters
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-700 text-white font-bold py-2 px-5 rounded-sm text-sm uppercase tracking-wide"
                >
                  🖨 Print
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-sm print-table">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    {['Queue ID', 'Patient Name', 'Office', 'Date', 'Slot', 'Category', 'Status'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-emerald-600 rounded-full" />
                          <span className="text-sm">Loading…</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                        No appointments found. Apply filters and click &quot;Apply Filters&quot;.
                      </td>
                    </tr>
                  ) : (
                    paginatedAppointments.map((appt) => (
                      <tr
                        key={appt.id}
                        onClick={() => setSelectedAppt(appt)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-700">{appt.queue_id}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{appt.full_name}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{appt.office}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{appt.date}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{appt.slot}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold ${
                            CATEGORY_COLORS[appt.category] ?? 'bg-slate-100 text-slate-700'
                          }`}>
                            {CATEGORY_LABELS[appt.category] ?? appt.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold capitalize ${
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="no-print flex items-center gap-3 justify-end">
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages} ({appointments.length} total)
                </span>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border-2 border-slate-300 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border-2 border-slate-300 rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 font-medium"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
