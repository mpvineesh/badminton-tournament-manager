import React from 'react';

export default function BonusRulesEditor({
  rules,
  onChange,
  title = 'Winner bonus rules',
  thresholdField = 'opponentScoreLessThan',
  thresholdLabel = 'Loser score less than',
  pointsLabel = 'Winner bonus points',
  emptyLabel = 'No winner bonus rules.',
  description = 'Only the highest matching bonus is added to the winner’s points. The loser’s score must be strictly below the threshold.',
}) {
  function update(index, field, value) {
    onChange(rules.map((rule, i) => i === index ? { ...rule, [field]: value } : rule));
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
        <button type="button" className="btn-ghost" onClick={() => onChange([...rules, { [thresholdField]: 0, points: 0 }])}>
          + Add bonus rule
        </button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {rules.length === 0 && <p className="text-sm text-slate-500">{emptyLabel}</p>}
      {rules.map((rule, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-end">
          <label className="block text-sm">
            {thresholdLabel}
            <input aria-label={`Rule ${index + 1}: ${thresholdLabel.toLowerCase()}`} type="number" min={0} step="any" required
              className="mt-1 w-full px-3 py-2 border rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100"
              value={rule[thresholdField]} onChange={(e) => update(index, thresholdField, e.target.value)} />
          </label>
          <label className="block text-sm">
            {pointsLabel}
            <input aria-label={`Rule ${index + 1}: ${pointsLabel.toLowerCase()}`} type="number" min={0} step="any" required
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
