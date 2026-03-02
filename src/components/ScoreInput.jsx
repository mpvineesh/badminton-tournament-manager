import React from 'react';
export default function ScoreInput({ value, onChange }) {
  return (
    <input
      type="number"
      className="w-16 sm:w-20 px-2 sm:px-3 py-2 border rounded-lg"
      value={value ?? ''}
      onChange={(e) =>
        onChange(e.target.value === '' ? null : Number(e.target.value))
      }
    />
  );
}
