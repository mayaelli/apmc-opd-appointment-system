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
      {/* Section header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-slate-400">Step 1: Select Consultation Type</p>
        <h2 className="text-xl font-bold text-slate-900 mt-1">Choose Your Visit Category</h2>
      </div>

      {/* Info callout */}
      <div className="border-l-4 border-slate-400 bg-slate-50 p-4 text-sm text-slate-700 mb-6">
        Each category maintains independent scheduling and intake requirements.
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 gap-4">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectCategory(cat.id)}
              className={`p-5 transition-all cursor-pointer rounded-sm ${
                isSelected
                  ? 'bg-emerald-50 border-2 border-emerald-600 ring-2 ring-emerald-600/20'
                  : 'bg-white border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="inline-block bg-emerald-700 text-white text-xs uppercase font-bold px-3 py-1 rounded-sm mb-3">
                    {cat.badge}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{cat.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{cat.description}</p>
                </div>
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center ml-4 shrink-0 ${
                    isSelected ? 'bg-emerald-600 text-white' : 'border-2 border-slate-300 bg-white'
                  }`}
                >
                  {isSelected && <span className="text-xs leading-none">✓</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t-2 border-slate-200 pt-6 mt-6 flex justify-end">
        <button
          onClick={onNext}
          disabled={!selectedCategory}
          className={`px-8 py-3 font-bold text-sm tracking-wide uppercase transition-colors shadow-sm rounded-sm ${
            selectedCategory
              ? 'bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer'
              : 'bg-slate-300 text-slate-400 cursor-not-allowed'
          }`}
        >
          Next: Schedule &amp; Office
        </button>
      </div>
    </div>
  );
}
