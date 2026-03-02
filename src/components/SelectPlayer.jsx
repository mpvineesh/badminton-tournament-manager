import React from 'react';
export default function SelectPlayer({ players, id }) {
  return (
    <select id={id} className="w-full sm:w-auto min-w-0 px-3 py-2 border rounded-lg">
      <option value="">Select…</option>
      {players.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} (S{p.skill})
        </option>
      ))}
    </select>
  );
}
