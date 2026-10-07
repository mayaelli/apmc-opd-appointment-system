// app/page.tsx
import Image from 'next/image';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import TermsAndConditionsView from '@/components/terms/TermsAndConditionsView';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      {/* Hero section */}
      <div className="bg-slate-900 py-12 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <Image
            src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
            alt="Amai Pakpak Medical Center seal"
            width={80}
            height={80}
            className="mx-auto object-contain mb-4"
            priority
          />
          <h1 className="text-3xl font-bold text-white">APMC Outpatient Department</h1>
          <p className="text-slate-300 mt-2">Online Appointment & Queue Management System</p>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 mt-8 mb-12">
        <TermsAndConditionsView />
      </main>

      <Footer />
    </div>
  );
}