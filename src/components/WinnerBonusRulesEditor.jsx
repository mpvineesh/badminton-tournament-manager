import React from 'react';

export default function WinnerBonusRulesEditor({ rules, onChange }) {
  function update(index, field, value) {
    onChange(rules.map((rule, i) => i === index ? { ...rule, [field]: value } : rule));
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">Winner bonus rules</div>
        <button type="button" className="btn-ghost" onClick={() => onChange([...rules, { opponentScoreLessThan: 0, points: 0 }])}>
          + Add bonus rule
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Only the highest matching bonus is added to the winner’s points. The loser’s score must be strictly below the threshold.
      </p>
      {rules.length === 0 && <p className="text-sm text-slate-500">No winner bonus rules.</p>}
      {rules.map((rule, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
          <label className="block text-sm">
            Loser score less than
            <input aria-label={`Rule ${index + 1}: loser score less than`} type="number" min={0} step="any" required
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100"
              value={rule.opponentScoreLessThan} onChange={(e) => update(index, 'opponentScoreLessThan', e.target.value)} />
          </label>
          <label className="block text-sm">
            Winner bonus points
            <input aria-label={`Rule ${index + 1}: winner bonus points`} type="number" min={0} step="any" required
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100"
              value={rule.points} onChange={(e) => update(index, 'points', e.target.value)} />
          </label>
          <button type="button" className="btn-ghost" aria-label={`Remove bonus rule ${index + 1}`}
            onClick={() => onChange(rules.filter((_, i) => i !== index))}>Remove</button>
        </div>
      ))}
    </div>
  );
}
