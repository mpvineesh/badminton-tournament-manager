import React from 'react';
export default function Stepper({ step, setStep }) {
  const steps = [
    { id: 1, label: 'Setup' },
    { id: 2, label: 'Players' },
    { id: 3, label: 'Teams' },
    { id: 4, label: 'Pools & Fixtures' },
    { id: 5, label: 'Groups' },
    { id: 6, label: 'Knockouts' },
  ];
  return (
    <ol className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-6 sm:overflow-visible">
      {steps.map((s) => (
        <li key={s.id} className="shrink-0 min-w-[140px] sm:min-w-0">
          <button
            onClick={() => setStep(s.id)}
            className={`w-full px-3 py-2 rounded-xl border text-left transition ${
              step === s.id
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : step > s.id
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div
              className={`text-xs ${
                step === s.id
                  ? 'text-slate-300'
                  : step > s.id
                    ? 'text-emerald-700'
                    : 'text-slate-500'
              }`}
            >
              Step {s.id}
            </div>
            <div className="font-medium">{s.label}</div>
          </button>
        </li>
      ))}
    </ol>
  );
}
