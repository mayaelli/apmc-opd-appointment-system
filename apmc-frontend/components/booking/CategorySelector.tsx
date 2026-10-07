// components/booking/CategorySelector.tsx
type AppointmentCategory = 'new-checkup' | 'follow-up' | 'philhealth-yakap';

interface CategorySelectorProps {
  selectedCategory: AppointmentCategory | null;
  onSelectCategory: (category: AppointmentCategory) => void;
  onNext: () => void;
}

const categories: { id: AppointmentCategory; title: string; description: string; badge: string }[] = [
  {
    id: 'new-checkup',
    title: 'New Check-up / Konsulta',
    description: 'For first-time patients or initial consultations with a physician.',
    badge: 'General OPD',
  },
  {
    id: 'follow-up',
    title: 'Follow-up Check-up',
    description: 'For returning patients reviewing laboratory results or ongoing care.',
    badge: 'Continuity of Care',
  },
  {
    id: 'philhealth-yakap',
    title: 'PhilHealth Yakap',
    description: 'For primary care benefits, consultations, and maintenance medicine refills.',
    badge: 'PhilHealth Member',
  },
];

export default function CategorySelector({
  selectedCategory,
  onSelectCategory,
  onNext,
}: CategorySelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Select Consultation Type</h2>
        <p className="text-sm text-slate-500 mt-1">
          Each category manages its own schedule availability and intake flow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectCategory(cat.id)}
              className={`p-5 border transition-all cursor-pointer flex flex-col justify-between rounded-sm ${
                isSelected
                  ? 'border-l-4 border-emerald-600 bg-emerald-50 ring-1 ring-inset ring-emerald-200'
                  : 'border border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold px-2.5 py-1 bg-emerald-700 text-white uppercase tracking-widest inline-block mb-2">
                    {cat.badge}
                  </span>
                  <h3 className="text-base font-semibold text-slate-900">{cat.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{cat.description}</p>
                </div>
                <div
                  className={`h-5 w-5 rounded-full border-2 flex items-center justify-center mt-1 shrink-0 ${
                    isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <span className="text-xs leading-none">✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!selectedCategory}
          className={`px-6 py-2.5 font-semibold text-sm tracking-wide uppercase transition-colors shadow-sm rounded-sm ${
            selectedCategory
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Next: Schedule &amp; Office
        </button>
      </div>
    </div>
  );
}
