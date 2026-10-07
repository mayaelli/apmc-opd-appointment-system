'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TermsAndConditionsView() {
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  return (
    <div className="bg-white border border-slate-300 rounded-sm overflow-hidden shadow-sm">
      {/* Section header */}
      <div className="px-8 py-6">
        <p className="text-xs uppercase tracking-wide text-slate-400">Terms & Conditions</p>
        <h2 className="text-2xl font-bold text-slate-900 mt-1">Before You Proceed</h2>
      </div>

      {/* Terms list with emerald accent */}
      <div className="border-l-4 border-emerald-600 bg-emerald-50/50 p-6 mx-8 mb-6">
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex items-start gap-3">
            <span className="font-bold text-emerald-700 shrink-0">1.</span>
            <span>
              Appointments are available <strong>Monday to Friday</strong>, excluding official public holidays.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-bold text-emerald-700 shrink-0">2.</span>
            <span>
              Each consultation category enforces a <strong>strict 2-patient capacity limit</strong> per 30-minute time interval.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-bold text-emerald-700 shrink-0">3.</span>
            <span>
              Please arrive at least <strong>30 minutes before</strong> your scheduled time slot for verification.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-bold text-emerald-700 shrink-0">4.</span>
            <span>
              Late arrivals will result in <strong>slot forfeiture</strong>. Missed slots require rebooking.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-bold text-emerald-700 shrink-0">5.</span>
            <span>
              Bring valid identification and applicable documents (PhilHealth PIN, past records, etc.).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="font-bold text-emerald-700 shrink-0">6.</span>
            <span>
              Your session will automatically expire after <strong>10 minutes of inactivity</strong> for security purposes.
            </span>
          </li>
        </ol>
      </div>

      {/* Consent checkbox */}
      <div className="border-t border-slate-200 px-8 py-6">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-5 w-5 rounded accent-emerald-600 shrink-0 cursor-pointer"
          />
          <span className="text-sm text-slate-700 leading-snug">
            I have read and understood the terms and conditions above, and I consent to the collection and processing of my personal information for appointment management purposes.
          </span>
        </label>
      </div>

      {/* CTA button */}
      <div className="px-8 pb-8">
        <button
          type="button"
          onClick={() => agreed && router.push('/booking')}
          disabled={!agreed}
          className={`w-full py-3.5 font-bold text-sm tracking-wide uppercase rounded-sm transition-colors ${
            agreed
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
              : 'bg-slate-300 text-slate-400 cursor-not-allowed'
          }`}
        >
          Proceed to Booking
        </button>
      </div>
    </div>
  );
}
