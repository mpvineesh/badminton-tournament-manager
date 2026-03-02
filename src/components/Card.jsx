import React from 'react';
export default function Card({ title, children }) {
  return (
    <div className="rounded-xl border bg-white p-3 sm:p-4">
      <div className="font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}
