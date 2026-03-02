import React from 'react';
export default function PlayerSelectInline({ players, value, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full sm:w-auto min-w-0 px-3 py-2 border rounded-lg"
    >
      <option value="">Select…</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} (S{p.skill})
        </option>
      ))}
    </select>
  );
}
