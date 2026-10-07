// components/layout/Footer.tsx
export default function Footer() {
  return (
    <footer className="bg-slate-800 border-t-4 border-emerald-600 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Three-column grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-300">
          {/* Left column - About */}
          <div>
            <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wide">APMC OPD System</h3>
            <p className="text-xs leading-relaxed text-slate-400">
              Official online appointment and queue management system for the Amai Pakpak Medical Center Outpatient Department.
            </p>
            <p className="text-xs mt-3 text-slate-400">
              Marawi City, Lanao del Sur
            </p>
          </div>

          {/* Center column - Quick Links */}
          <div>
            <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wide">Quick Links</h3>
            <ul className="space-y-2 text-xs">
              <li><a href="/" className="text-slate-400 hover:text-white transition-colors">Home</a></li>
              <li><a href="/booking" className="text-slate-400 hover:text-white transition-colors">Book Appointment</a></li>
              <li><span className="text-slate-400">Terms & Conditions</span></li>
              <li><span className="text-slate-400">Privacy Policy</span></li>
            </ul>
          </div>

          {/* Right column - Emergency Contacts */}
          <div>
            <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wide">Emergency Contacts</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Emergency Room: Available 24/7</li>
              <li>Hospital Hotline: Contact front desk</li>
              <li>For Life-Threatening Cases: Dial 911</li>
            </ul>
          </div>
        </div>

        {/* Bottom row - Copyright */}
        <div className="border-t border-slate-700 mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 text-center sm:text-left">
          <p>© 2026 Amai Pakpak Medical Center. All rights reserved.</p>
          <p>Powered by APMC IT Department</p>
        </div>
      </div>
    </footer>
  );
}