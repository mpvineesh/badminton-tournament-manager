import React from 'react';
import { HARD_CAP, clampScore } from '../utils/scoring.js';

export default function ScoreInput({ value, onChange }) {
  return (
    <input
      type="number"
      min={0}
      max={HARD_CAP}
      inputMode="numeric"
      className="w-16 sm:w-20 px-2 sm:px-3 py-2 border rounded-lg"
      value={value ?? ''}
      onChange={(e) =>
        onChange(e.target.value === '' ? null : clampScore(e.target.value))
      }
    />
  );
}
