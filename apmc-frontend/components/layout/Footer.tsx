// components/layout/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 border-t-4 border-t-emerald-600 py-6 mt-auto text-xs text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Branding */}
        <div>
          <span className="font-bold text-slate-900">APMC OPD System</span>
          <span className="mx-2 text-slate-300">|</span>
          <span>Amai Pakpak Medical Center, Marawi City</span>
        </div>

        {/* Right: Copyright & Emergency Note */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-right">
          <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200 font-medium">
            🚨 ER / 911 for Emergencies
          </span>
          <p>© 2026 APMC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}