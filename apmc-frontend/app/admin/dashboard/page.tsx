'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

type Tab = 'overview' | 'offices' | 'holidays' | 'credentials';

type OfficeCategory = 'new-checkup' | 'follow-up' | 'philhealth-yakap';

const ALL_CATEGORIES: { value: OfficeCategory; label: string }[] = [
  { value: 'new-checkup', label: 'New Checkup / General Consultation' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'philhealth-yakap', label: 'PhilHealth Yakap Clinic' },
];

interface Office {
  id: number;
  code: string;
  name: string;
  categories: OfficeCategory[];
  is_active: boolean;
  max_slots_per_interval: number;
}

const CATEGORY_LABELS: Record<OfficeCategory, string> = {
  'new-checkup': 'General Consultation',
  'follow-up': 'Follow-up',
  'philhealth-yakap': 'PhilHealth Yakap',
};

interface Holiday {
  id: string;
  date: string;
  label: string;
}

interface Stats {
  totalAppointments: number;
  totalToday: number;
  activeOffices: number;
  byStatus: { pending: number; present: number; done: number; noShow: number };
  byOffice: { name: string; count: number }[];
}

function CategoryCheckboxes({
  selected,
  onChange,
}: {
  selected: OfficeCategory[];
  onChange: (v: OfficeCategory[]) => void;
}) {
  function toggle(val: OfficeCategory) {
    if (selected.includes(val)) {
      onChange(selected.filter((c) => c !== val));
    } else {
      onChange([...selected, val]);
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {ALL_CATEGORIES.map((cat) => (
        <label key={cat.value} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selected.includes(cat.value)}
            onChange={() => toggle(cat.value)}
            className="accent-emerald-600 w-4 h-4"
          />
          <span className="text-sm text-black">{cat.label}</span>
        </label>
      ))}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Modals
  const [showAddOffice, setShowAddOffice] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [modalUsername, setModalUsername] = useState('');
  const [copiedPass, setCopiedPass] = useState(false);
  const [copiedBoth, setCopiedBoth] = useState(false);
  const [credentialOffice, setCredentialOffice] = useState<Office | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [wasJustGenerated, setWasJustGenerated] = useState(false);

  // Add office form
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeCode, setNewOfficeCode] = useState('');
  const [newOfficeCategories, setNewOfficeCategories] = useState<OfficeCategory[]>(['new-checkup']);
  const [newOfficeMaxSlots, setNewOfficeMaxSlots] = useState(2);
  const [officeFormError, setOfficeFormError] = useState('');
  const [officeFormLoading, setOfficeFormLoading] = useState(false);

  // Auto-generate office code from name
  function generateCodeFromName(name: string, existingCodes: string[]): string {
    const year = new Date().getFullYear();
    // Strip parenthetical suffixes like "(OB-GYNE)", strip special chars, split into words
    const cleaned = name.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z\s]/g, '').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    // Take first letter of each significant word (skip short connectors)
    const skip = new Set(['and', 'of', 'the', 'in', 'for', 'a', 'an', '&']);
    const initials = words
      .filter((w) => !skip.has(w.toLowerCase()))
      .map((w) => w[0].toUpperCase())
      .join('');
    const base = initials || 'OFF';
    // Find next available sequence number
    let seq = 1;
    while (existingCodes.includes(`${base}-${String(seq).padStart(3, '0')}-${year}`)) {
      seq++;
    }
    return `${base}-${String(seq).padStart(3, '0')}-${year}`;
  }

  function handleNameChange(name: string) {
    setNewOfficeName(name);
    // Only auto-generate if user hasn't manually edited the code
    const existingCodes = offices.map((o) => o.code);
    setNewOfficeCode(generateCodeFromName(name, existingCodes));
  }

  // Edit office form
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editCategories, setEditCategories] = useState<OfficeCategory[]>(['new-checkup']);
  const [editMaxSlots, setEditMaxSlots] = useState(2);
  const [editFormError, setEditFormError] = useState('');
  const [editFormLoading, setEditFormLoading] = useState(false);

  // Add holiday form
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayLabel, setNewHolidayLabel] = useState('');
  const [holidayFormError, setHolidayFormError] = useState('');

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/admin/stats');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setStats(data);
  }, [router]);

  const fetchOffices = useCallback(async () => {
    const res = await fetch('/api/admin/offices');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setOffices(Array.isArray(data) ? data : []);
  }, [router]);

  const fetchHolidays = useCallback(async () => {
    const res = await fetch('/api/admin/holidays');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setHolidays(Array.isArray(data) ? data : []);
  }, [router]);

  useEffect(() => {
    fetchStats();
    fetchOffices();
    fetchHolidays();
  }, [fetchStats, fetchOffices, fetchHolidays]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  async function handleAddOffice(e: React.FormEvent) {
    e.preventDefault();
    setOfficeFormError('');
    setOfficeFormLoading(true);
    try {
      const res = await fetch('/api/admin/offices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newOfficeCode,
          name: newOfficeName,
          categories: newOfficeCategories,
          max_slots_per_interval: newOfficeMaxSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setOfficeFormError(data.error || 'Failed to create office'); return; }
      setGeneratedPassword(data.generated_password);
      setModalUsername(newOfficeCode);
      setCredentialOffice(null);
      setShowPassword(false);
      setCopiedPass(false);
      setCopiedBoth(false);
      setShowAddOffice(false);
      setNewOfficeName('');
      setNewOfficeCode('');
      setNewOfficeCategories(['new-checkup']);
      setNewOfficeMaxSlots(2);
      setShowPasswordModal(true);
      fetchOffices();
    } finally {
      setOfficeFormLoading(false);
    }
  }

  async function handleEditOffice(e: React.FormEvent) {
    e.preventDefault();
    if (!editingOffice) return;
    setEditFormError('');
    setEditFormLoading(true);
    try {
      const res = await fetch(`/api/admin/offices/${editingOffice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editCode,
          name: editName,
          categories: editCategories,
          max_slots_per_interval: editMaxSlots,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setEditFormError(data.error || 'Failed to update office'); return; }
      setEditingOffice(null);
      fetchOffices();
    } finally {
      setEditFormLoading(false);
    }
  }

  async function handleToggleOffice(office: Office) {
    await fetch(`/api/admin/offices/${office.id}`, { method: 'DELETE' });
    fetchOffices();
  }

  async function handleAddHoliday(e: React.FormEvent) {
    e.preventDefault();
    setHolidayFormError('');
    const res = await fetch('/api/admin/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newHolidayDate, label: newHolidayLabel }),
    });
    const data = await res.json();
    if (!res.ok) { setHolidayFormError(data.error || 'Failed to add holiday'); return; }
    setNewHolidayDate(''); setNewHolidayLabel('');
    fetchHolidays();
  }

  async function handleDeleteHoliday(id: string) {
    await fetch('/api/admin/holidays', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchHolidays();
  }

  async function handleOpenCredentials(office: Office) {
    setCredentialOffice(office);
    setModalUsername(office.code);
    setGeneratedPassword('');
    setShowPassword(false);
    setCopiedPass(false);
    setCopiedBoth(false);
    setWasJustGenerated(false);
    setCredentialsLoading(true);
    setShowPasswordModal(true);

    const res = await fetch(`/api/admin/credentials?officeId=${office.id}`);
    const data = await res.json();
    setCredentialsLoading(false);
    if (res.ok && data.password_plain) {
      setGeneratedPassword(data.password_plain);
    }
  }

  async function handleGeneratePassword() {
    if (!credentialOffice) return;
    const res = await fetch('/api/admin/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ officeId: credentialOffice.id }),
    });
    const data = await res.json();
    if (res.ok) {
      setGeneratedPassword(data.generated_password);
      setWasJustGenerated(true);
    }
  }

  // Group holidays by month
  const holidaysByMonth = holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    const month = h.date.slice(0, 7);
    if (!acc[month]) acc[month] = [];
    acc[month].push(h);
    return acc;
  }, {});

  const maxOfficeCount = stats?.byOffice.reduce((m, o) => Math.max(m, o.count), 0) ?? 1;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'offices', label: 'Offices' },
    { key: 'holidays', label: 'Holidays' },
    { key: 'credentials', label: 'Credentials' },
  ];

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
            <span className="font-bold text-white text-sm">APMC OPD — Admin Dashboard</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-300 hover:text-white border border-slate-600 hover:border-slate-400 px-3 py-1.5 rounded-sm transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Office Credentials Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
          <div className="bg-white rounded-sm shadow-2xl max-w-md w-full p-8 border-t-[6px] border-emerald-600">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Office Credentials</h2>
            <p className="text-sm text-slate-500 mb-5">Manage login credentials for this office.</p>

            {/* Username row - always visible */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Username</p>
              <div className="bg-slate-100 rounded-sm px-4 py-3 font-mono text-sm text-slate-900 select-all">
                {modalUsername}
              </div>
            </div>

            {generatedPassword === '' ? (
              /* No password generated yet — show the generate prompt */
              <>
                {credentialsLoading ? (
                  <div className="border border-slate-200 rounded-sm p-4 mb-5 text-center text-sm text-slate-500">
                    Fetching current password…
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-sm p-4 mb-5">
                    <p className="text-sm text-slate-600 mb-1">The current password is stored as a hash and cannot be retrieved.</p>
                    <p className="text-xs text-amber-700 font-semibold mb-3">⚠ Generating a new password will replace the existing one.</p>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-sm text-sm"
                    >
                      Generate New Password
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Password generated — show masked password + copy options */
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Password</p>
                {wasJustGenerated && (
                  <p className="text-xs text-slate-400 mb-2">Save this — it won&apos;t be shown again after you close.</p>
                )}
                <div className="bg-slate-900 rounded-sm px-4 py-3 flex items-center justify-between gap-3 mb-3">
                  <code className="text-emerald-400 font-mono text-sm break-all">
                    {showPassword ? generatedPassword : '\u2022'.repeat(generatedPassword.length)}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="shrink-0 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-sm border border-slate-600 hover:border-slate-400 transition-colors"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(generatedPassword); setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }}
                    className="flex-1 text-sm bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 rounded-sm transition-colors"
                  >
                    {copiedPass ? '\u2713 Copied!' : 'Copy Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { navigator.clipboard.writeText(`Username: ${modalUsername}\nPassword: ${generatedPassword}`); setCopiedBoth(true); setTimeout(() => setCopiedBoth(false), 2000); }}
                    className="flex-1 text-sm bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-sm transition-colors"
                  >
                    {copiedBoth ? '\u2713 Copied!' : 'Copy Both'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => { setShowPasswordModal(false); setCopiedPass(false); setCopiedBoth(false); setShowPassword(false); setGeneratedPassword(''); setCredentialOffice(null); setWasJustGenerated(false); }}
              className="w-full bg-slate-900 hover:bg-slate-700 text-white font-bold py-3 rounded-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Edit Office Modal */}
      {editingOffice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-sm shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Edit Office</h2>
            <form onSubmit={handleEditOffice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Code</label>
                <input
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  required
                  placeholder="e.g. GEN-CONSULT"
                  className="w-full border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm text-black placeholder-slate-400 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  placeholder="e.g. General Consultation"
                  className="w-full border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm text-black placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Categories <span className="text-red-500">*</span></label>
                <CategoryCheckboxes selected={editCategories} onChange={setEditCategories} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Max Slots per Interval</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editMaxSlots}
                  onChange={(e) => setEditMaxSlots(Number(e.target.value))}
                  className="w-full border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm text-black placeholder-slate-400 focus:outline-none"
                />
              </div>
              {editFormError && <p className="text-red-600 text-sm">{editFormError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={editFormLoading}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 rounded-sm"
                >
                  {editFormLoading ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingOffice(null)}
                  className="flex-1 border-2 border-slate-300 text-slate-700 font-bold py-2.5 rounded-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="border-b-2 border-slate-200 mb-6 flex gap-0">
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

            {/* Bar chart */}
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

        {/* Offices Tab */}
        {activeTab === 'offices' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Offices</h2>
              <button
                onClick={() => setShowAddOffice(!showAddOffice)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-bold px-4 py-2 rounded-sm uppercase tracking-wide"
              >
                + Add Office
              </button>
            </div>

            {showAddOffice && (
              <div className="bg-white border border-slate-200 rounded-sm p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">New Office</h3>
                <form onSubmit={handleAddOffice} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Office Name</label>
                    <input
                      value={newOfficeName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      placeholder="e.g. General Surgery"
                      className="w-full border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm text-black placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
                      Code <span className="normal-case font-normal text-slate-400">(auto-generated, editable)</span>
                    </label>
                    <input
                      value={newOfficeCode}
                      onChange={(e) => setNewOfficeCode(e.target.value.toUpperCase())}
                      required
                      placeholder="e.g. GS-001-2026"
                      className="w-full border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm text-black placeholder-slate-400 focus:outline-none font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Categories <span className="text-red-500">*</span></label>
                    <CategoryCheckboxes selected={newOfficeCategories} onChange={setNewOfficeCategories} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Max Slots per Interval</label>
                    <input
                      type="number" min={1} max={20}
                      value={newOfficeMaxSlots}
                      onChange={(e) => setNewOfficeMaxSlots(Number(e.target.value))}
                      className="w-full border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm text-black placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                  {officeFormError && <p className="col-span-2 text-red-600 text-sm">{officeFormError}</p>}
                  <div className="col-span-2 flex gap-3">
                    <button
                      type="submit"
                      disabled={officeFormLoading}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-6 rounded-sm text-sm"
                    >
                      {officeFormLoading ? 'Creating…' : 'Create Office'}
                    </button>
                    <button type="button" onClick={() => setShowAddOffice(false)} className="border-2 border-slate-300 text-slate-700 font-bold py-2 px-4 rounded-sm text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    {['Code', 'Name', 'Category', 'Max Slots', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offices.map((office) => (
                    <tr key={office.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 font-bold">{office.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{office.name}</td>
                      <td className="px-4 py-3 text-slate-600 text-xs">
                        {(office.categories ?? []).map((c) => CATEGORY_LABELS[c] ?? c).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{office.max_slots_per_interval}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold ${
                          office.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {office.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingOffice(office);
                              setEditCode(office.code);
                              setEditName(office.name);
                              setEditCategories((office.categories ?? []) as OfficeCategory[]);
                              setEditMaxSlots(office.max_slots_per_interval);
                              setEditFormError('');
                            }}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleOffice(office)}
                            className={`text-xs font-bold px-2.5 py-1 rounded-sm ${
                              office.is_active
                                ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700'
                            }`}
                          >
                            {office.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Holidays Tab */}
        {activeTab === 'holidays' && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Holidays</h2>

            <div className="bg-white border border-slate-200 rounded-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Add Holiday</h3>
              <form onSubmit={handleAddHoliday} className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Date</label>
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    required
                    className="border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Label</label>
                  <input
                    value={newHolidayLabel}
                    onChange={(e) => setNewHolidayLabel(e.target.value)}
                    required
                    placeholder="e.g. Independence Day"
                    className="border-2 border-slate-300 focus:border-emerald-600 rounded-sm px-3 py-2 text-sm focus:outline-none w-64"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2 px-4 rounded-sm text-sm"
                >
                  Add
                </button>
              </form>
              {holidayFormError && <p className="mt-2 text-red-600 text-sm">{holidayFormError}</p>}
            </div>

            {Object.entries(holidaysByMonth).sort().map(([month, items]) => (
              <div key={month} className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-2">
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                    {new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long' }).format(new Date(month + '-01'))}
                  </h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {items.map((h) => (
                    <li key={h.id} className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-slate-600">{h.date}</span>
                        <span className="text-sm font-medium text-slate-900">{h.label}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-bold"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Credentials Tab */}
        {activeTab === 'credentials' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Office Credentials</h2>
            <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    {['Code', 'Office Name', 'Status', 'Action'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {offices.map((office) => (
                    <tr key={office.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 font-bold">{office.code}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{office.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-sm text-xs font-bold ${
                          office.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {office.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenCredentials(office)}
                          className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-sm"
                        >
                          Credentials
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
