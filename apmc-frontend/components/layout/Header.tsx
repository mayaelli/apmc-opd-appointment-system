// components/layout/Header.tsx
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-300 sticky top-0 z-50">
      {/* Top accent bar */}
      <div className="h-[3px] w-full bg-emerald-700" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="bg-emerald-700 text-white font-bold h-10 w-10 rounded-sm flex items-center justify-center shadow-sm text-sm tracking-wide">
            AP
          </div>
          <div className="flex items-center">
            <div>
              <span className="font-bold text-slate-900 block leading-tight text-sm">APMC OPD</span>
              <span className="text-xs text-slate-500">Outpatient Department System</span>
            </div>
            <div className="hidden sm:block mx-4 h-8 w-px bg-slate-200" />
            <div className="hidden sm:block">
              <span className="text-xs text-slate-400">Republic of the Philippines</span>
            </div>
          </div>
        </Link>
        <div className="text-xs font-semibold text-white bg-emerald-700 px-3 py-1.5 rounded-sm tracking-wide">
          Official Portal
        </div>
      </div>
    </header>
  );
}
