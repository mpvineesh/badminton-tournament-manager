import React from 'react';

const TONE = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  info: 'border-navy-200 bg-white dark:bg-navy-900 text-navy-900',
};

export default function Toast({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onDismiss(t.id)}
          className={`pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur transition ${
            TONE[t.type] || TONE.info
          }`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
