import React from 'react';
export default function Card({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 sm:p-4 shadow-sm backdrop-blur">
      <div className="font-semibold mb-3 text-slate-800">{title}</div>
      {children}
    </div>
  );
}
