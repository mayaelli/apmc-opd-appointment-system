// components/layout/Header.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
  return (
    <header className="sticky top-0 z-50">
      {/* Emergency notification strip */}
      <div className="h-8 bg-amber-50 border-b border-amber-200 flex items-center justify-center">
        <p className="text-xs text-amber-800 font-medium text-center px-4">
          ⚠ For urgent medical emergencies, proceed directly to the Emergency Room or dial 911.
        </p>
      </div>

      {/* Main header band */}
      <div className="bg-white border-b-[3px] border-emerald-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo area */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
              alt="Amai Pakpak Medical Center seal"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-base leading-tight">APMC Outpatient Department</span>
              <span className="text-xs text-slate-500">Amai Pakpak Medical Center</span>
            </div>
          </Link>

          {/* Right side badges */}
          <div className="flex items-center gap-3">
            <div className="border border-emerald-600 text-emerald-700 bg-emerald-50 font-medium text-xs px-3 py-1 rounded-sm">
              Official Portal
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
              <span>|</span>
              <span>🇵🇭</span>
              <span>Republic of the Philippines</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}