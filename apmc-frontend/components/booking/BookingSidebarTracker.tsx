// components/booking/BookingSidebarTracker.tsx

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
    <aside className="w-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Branding header */}
      <div className="bg-emerald-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="bg-white text-emerald-700 font-bold h-9 w-9 rounded-sm flex items-center justify-center text-sm shrink-0">
            AP
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">APMC OPD</p>
            <p className="text-emerald-200 text-xs">Outpatient Department</p>
          </div>
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
                    ? 'bg-emerald-700'
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
                      ? 'bg-white text-emerald-700'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-400'
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
                        : 'text-slate-400'
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

      {/* Amber reminder */}
      <div className="mx-4 my-4 border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">⚠ Reminder</p>
        <p>Slots are strictly limited to 2 per 30-minute window. Arrive 30 minutes early for verification.</p>
      </div>
    </aside>
  );
}
