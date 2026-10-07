'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  AppointmentCategory,
  NewCheckupDetails,
  FollowUpDetails,
  PhilHealthYakapDetails,
} from '@/app/types/appointment';

interface PatientDetailsViewProps {
  category: AppointmentCategory;
  onNext: (details: NewCheckupDetails | FollowUpDetails | PhilHealthYakapDetails) => void;
  onBack: () => void;
}

const inputClass =
  'w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none bg-white';

const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

function RequiredMark() {
  return <span className="text-red-500"> *</span>;
}

// ────────────────────────────────────────────────────────────
// New Check-up sub-form
// ────────────────────────────────────────────────────────────
function NewCheckupForm({ onNext, onBack }: { onNext: (d: NewCheckupDetails) => void; onBack: () => void }) {
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [phone, setPhone] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');

  const isValid = useMemo(
    () =>
      fullName.trim() !== '' &&
      age.trim() !== '' &&
      sex !== '' &&
      phone.trim() !== '' &&
      chiefComplaint.trim() !== '',
    [fullName, age, sex, phone, chiefComplaint],
  );

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    onNext({ fullName: fullName.trim(), age: age.trim(), sex, phone: phone.trim(), chiefComplaint: chiefComplaint.trim() });
  }, [isValid, fullName, age, sex, phone, chiefComplaint, onNext]);

  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>
          Full Name <RequiredMark />
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Juan dela Cruz"
          autoComplete="name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Age <RequiredMark />
          </label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={0}
            max={120}
            className={inputClass}
            placeholder="e.g. 35"
          />
        </div>
        <div>
          <label className={labelClass}>
            Sex <RequiredMark />
          </label>
          <select value={sex} onChange={(e) => setSex(e.target.value)} className={inputClass}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Phone Number <RequiredMark />
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="09XX-XXX-XXXX"
          autoComplete="tel"
        />
      </div>

      <div>
        <label className={labelClass}>
          Chief Complaint / Main Reason for Visit <RequiredMark />
        </label>
        <textarea
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value.slice(0, 300))}
          rows={4}
          maxLength={300}
          className={`${inputClass} resize-none`}
          placeholder="Briefly describe your main concern or symptom…"
        />
        <p className="text-xs text-slate-400 text-right mt-1">{chiefComplaint.length}/300</p>
      </div>

      <FormFooter onBack={onBack} onNext={handleSubmit} isValid={isValid} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Follow-up sub-form
// ────────────────────────────────────────────────────────────
function FollowUpForm({ onNext, onBack }: { onNext: (d: FollowUpDetails) => void; onBack: () => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [previousDoctorOrDepartment, setPreviousDoctorOrDepartment] = useState('');
  const [purpose, setPurpose] = useState('');

  const isValid = useMemo(
    () =>
      fullName.trim() !== '' &&
      phone.trim() !== '' &&
      previousDoctorOrDepartment.trim() !== '' &&
      purpose.trim() !== '',
    [fullName, phone, previousDoctorOrDepartment, purpose],
  );

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    onNext({
      fullName: fullName.trim(),
      phone: phone.trim(),
      previousDoctorOrDepartment: previousDoctorOrDepartment.trim(),
      purpose: purpose.trim(),
    });
  }, [isValid, fullName, phone, previousDoctorOrDepartment, purpose, onNext]);

  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>
          Full Name <RequiredMark />
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Juan dela Cruz"
          autoComplete="name"
        />
      </div>

      <div>
        <label className={labelClass}>
          Phone Number <RequiredMark />
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="09XX-XXX-XXXX"
          autoComplete="tel"
        />
      </div>

      <div>
        <label className={labelClass}>
          Previous Doctor or Clinic Department <RequiredMark />
        </label>
        <input
          type="text"
          value={previousDoctorOrDepartment}
          onChange={(e) => setPreviousDoctorOrDepartment(e.target.value)}
          className={inputClass}
          placeholder="e.g. Dr. Santos – Internal Medicine"
        />
      </div>

      <div>
        <label className={labelClass}>
          Brief Purpose of Follow-up <RequiredMark />
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value.slice(0, 300))}
          rows={4}
          maxLength={300}
          className={`${inputClass} resize-none`}
          placeholder="e.g. Review of laboratory results, medication adjustment…"
        />
        <p className="text-xs text-slate-400 text-right mt-1">{purpose.length}/300</p>
      </div>

      <FormFooter onBack={onBack} onNext={handleSubmit} isValid={isValid} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// PhilHealth Yakap sub-form
// ────────────────────────────────────────────────────────────
const PHILHEALTH_SERVICES = [
  'Primary Care Benefit (PCB)',
  'Konsulta Package',
  'Maternity Care',
  'TB-DOTS Program',
  'Animal Bite Treatment',
  'Other',
];

function PhilHealthYakapForm({ onNext, onBack }: { onNext: (d: PhilHealthYakapDetails) => void; onBack: () => void }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [philhealthPin, setPhilhealthPin] = useState('');
  const [serviceType, setServiceType] = useState('');

  const isValid = useMemo(
    () =>
      fullName.trim() !== '' &&
      phone.trim() !== '' &&
      philhealthPin.trim() !== '' &&
      serviceType !== '',
    [fullName, phone, philhealthPin, serviceType],
  );

  const handleSubmit = useCallback(() => {
    if (!isValid) return;
    onNext({
      fullName: fullName.trim(),
      phone: phone.trim(),
      philhealthPin: philhealthPin.trim(),
      serviceType,
    });
  }, [isValid, fullName, phone, philhealthPin, serviceType, onNext]);

  return (
    <div className="space-y-5">
      <div>
        <label className={labelClass}>
          Full Name <RequiredMark />
        </label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
          placeholder="e.g. Juan dela Cruz"
          autoComplete="name"
        />
      </div>

      <div>
        <label className={labelClass}>
          Phone Number <RequiredMark />
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
          placeholder="09XX-XXX-XXXX"
          autoComplete="tel"
        />
      </div>

      <div>
        <label className={labelClass}>
          PhilHealth Identification Number (PIN) <RequiredMark />
        </label>
        <input
          type="text"
          value={philhealthPin}
          onChange={(e) => setPhilhealthPin(e.target.value)}
          className={inputClass}
          placeholder="XX-XXXXXXXXX-X"
        />
      </div>

      <div>
        <label className={labelClass}>
          Type of Service / Program Need <RequiredMark />
        </label>
        <select value={serviceType} onChange={(e) => setServiceType(e.target.value)} className={inputClass}>
          <option value="">— Select a service —</option>
          {PHILHEALTH_SERVICES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <FormFooter onBack={onBack} onNext={handleSubmit} isValid={isValid} />
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Shared footer buttons
// ────────────────────────────────────────────────────────────
function FormFooter({
  onBack,
  onNext,
  isValid,
}: {
  onBack: () => void;
  onNext: () => void;
  isValid: boolean;
}) {
  return (
    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
      <button
        type="button"
        onClick={onBack}
        className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors"
      >
        ← Back
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!isValid}
        className={`px-6 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm ${
          isValid
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        Next: Review Ticket
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main exported component
// ────────────────────────────────────────────────────────────
export default function PatientDetailsView({ category, onNext, onBack }: PatientDetailsViewProps) {
  const categoryLabel =
    category === 'new-checkup'
      ? 'New Check-up / Konsulta'
      : category === 'follow-up'
      ? 'Follow-up Check-up'
      : 'PhilHealth Yakap';

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Patient Details</h2>
        <p className="text-sm text-slate-500 mt-1">
          Intake form for: <span className="font-medium text-slate-700">{categoryLabel}</span>
        </p>
      </div>

      {/* Info callout */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">ℹ️ Important</p>
        <p>
          Please provide accurate details. This information will be used for your clinical intake and queue
          assignment.
        </p>
      </div>

      {/* Conditional forms */}
      {category === 'new-checkup' && (
        <NewCheckupForm
          onNext={onNext as (d: NewCheckupDetails) => void}
          onBack={onBack}
        />
      )}
      {category === 'follow-up' && (
        <FollowUpForm
          onNext={onNext as (d: FollowUpDetails) => void}
          onBack={onBack}
        />
      )}
      {category === 'philhealth-yakap' && (
        <PhilHealthYakapForm
          onNext={onNext as (d: PhilHealthYakapDetails) => void}
          onBack={onBack}
        />
      )}
    </div>
  );
}
