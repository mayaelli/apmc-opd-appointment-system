// components/booking/BookingSidebarTracker.tsx
import Image from 'next/image';

interface BookingSidebarTrackerProps {
  currentStep: number;
}

const steps = [
  { id: 1, name: 'Select Consultation', description: 'Choose your visit type' },
  { id: 2, name: 'Office & Schedule', description: 'Pick date and 30-min slot' },
  { id: 3, name: 'Patient Details', description: 'Basic administrative info' },
  { id: 4, name: 'Confirmation Ticket', description: 'Save your queue pass' },
];

export default function BookingSidebarTracker({ currentStep }: BookingSidebarTrackerProps) {
  return (
    <aside className="w-full bg-white rounded-sm border border-slate-300 shadow-md overflow-hidden">
      {/* Header band */}
      <div className="bg-slate-900 py-4 px-5 border-b-4 border-emerald-600 flex items-center gap-3">
        <Image
          src="/Amai_Pakpak_Medical_Center_seal_upscayl_4x_upscayl-standard-4x.png"
          alt="Amai Pakpak Medical Center seal"
          width={32}
          height={32}
          className="object-contain shrink-0"
        />
        <div>
          <p className="text-white font-bold text-sm leading-tight">APMC OPD</p>
          <p className="text-slate-300 text-xs">Appointment Progress</p>
        </div>
      </div>

      {/* Steps list */}
      <nav aria-label="Booking progress">
        <ol>
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <li
                key={step.id}
                className={`flex items-start gap-3 px-5 py-4 ${
                  isCurrent
                    ? 'bg-emerald-600'
                    : isCompleted
                    ? 'bg-emerald-50'
                    : 'bg-white'
                } ${
                  idx < steps.length - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                {/* Step circle */}
                <div
                  className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                    isCurrent
                      ? 'bg-white text-emerald-600'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {isCompleted ? '✓' : step.id}
                </div>
                {/* Step labels */}
                <div>
                  <p
                    className={`text-sm font-semibold leading-tight ${
                      isCurrent
                        ? 'text-white'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {step.name}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${
                      isCurrent
                        ? 'text-emerald-200'
                        : isCompleted
                        ? 'text-emerald-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Bottom reminder block */}
      <div className="mx-4 mb-4 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        <p className="font-semibold">⚠ Reminder</p>
        <p className="mt-1">Slots are strictly limited to 2 per 30-minute window. Arrive 30 minutes early for verification.</p>
      </div>
    </aside>
  );
}
