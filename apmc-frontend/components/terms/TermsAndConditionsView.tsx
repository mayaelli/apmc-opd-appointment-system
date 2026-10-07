'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TermsAndConditionsView() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  return (
    <div className="max-w-2xl w-full bg-white rounded-lg border border-slate-300 shadow-sm overflow-hidden my-auto">
      {/* Header band */}
      <div className="bg-emerald-700 px-8 py-5">
        <h1 className="text-xl font-bold text-white leading-tight">
          APMC OUTPATIENT DEPARTMENT (OPD)
        </h1>
        <p className="text-emerald-200 text-sm mt-1">Online Appointment &amp; Queue Management System</p>
      </div>

      <div className="p-8 md:p-10">
        {/* Terms box */}
        <div className="border-l-4 border-emerald-600 bg-slate-50 p-5 mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Terms &amp; Guidelines</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5 shrink-0">1.</span>
              Appointments are available <strong>Monday to Friday</strong>, excluding official public holidays.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5 shrink-0">2.</span>
              Each consultation category enforces a <strong>strict 2-patient capacity limit</strong> per 30-minute time interval.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5 shrink-0">3.</span>
              Please arrive at least <strong>30 minutes before</strong> your scheduled time slot for verification.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5 shrink-0">4.</span>
              Late arrivals will result in <strong>slot forfeiture</strong>. Missed slots require rebooking.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-600 font-bold mt-0.5 shrink-0">5.</span>
              Bring valid identification and applicable documents (PhilHealth PIN, past records, etc.).
            </li>
          </ul>
        </div>

        {/* Consent checkbox */}
        <label className="flex items-start gap-3 cursor-pointer mb-6 group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 shrink-0 cursor-pointer"
          />
          <span className="text-sm text-slate-700 leading-snug">
            I have read and understood the terms and conditions above.
          </span>
        </label>

        {/* CTA */}
        <button
          type="button"
          onClick={() => agreed && router.push('/booking')}
          disabled={!agreed}
          className={`w-full py-3 font-bold text-sm tracking-widest uppercase rounded-sm transition-colors ${
            agreed
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Proceed to Booking
        </button>
      </div>
    </div>
  );
}
