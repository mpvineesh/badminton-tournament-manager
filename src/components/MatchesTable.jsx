// ================================
// FILE: src/components/MatchesTable.jsx
// ================================
import React, { useState } from 'react';
import ScoreInput from './ScoreInput.jsx';
import TeamBadge from './TeamBadge.jsx';

export default function MatchesTable({
  matches,
  teamsById,
  poolsById,
  onScoreChange,
  onFinalize,
  onReset,
}) {
  const [filter, setFilter] = useState('all');
  const filtered = matches.filter((m) =>
    filter === 'all' ? true : m.poolId === filter
  );
  const poolOptions = Object.values(poolsById);

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="grow font-semibold">Matches</div>
        <div className="flex w-full sm:w-auto items-center gap-2 text-sm">
          <span className="text-slate-500">Filter:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto px-2 py-1.5 border rounded-lg bg-white text-slate-900"
          >
            <option value="all">All</option>
            {poolOptions.map((p) => (
              <option key={p.id} value={p.id}>
                Pool {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {filtered.map((m, i) => (
          <div key={m.id} className="rounded-lg border p-3">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>
                {m.poolId ? `Pool ${poolsById[m.poolId]?.name}` : m.round}
              </span>
              <span>#{i + 1}</span>
            </div>

            <div className="flex items-center gap-2 justify-between">
              <div className="flex-1 min-w-0">
                <TeamBadge team={teamsById[m.teamAId || '']} />
              </div>
              <div className="text-slate-400">vs</div>
              <div className="flex-1 min-w-0 text-right">
                <TeamBadge team={teamsById[m.teamBId || '']} right />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ScoreInput
                value={m.scoreA}
                onChange={(v) => onScoreChange(m.id, v, m.scoreB)}
              />
              <span className="text-slate-500">-</span>
              <ScoreInput
                value={m.scoreB}
                onChange={(v) => onScoreChange(m.id, m.scoreA, v)}
              />
              <input
                type="datetime-local"
                className="w-full sm:w-auto px-3 py-2 border rounded-lg bg-white text-slate-900"
                value={m.when || ''}
                onChange={() => {
                  // (optional) wire scheduling persistence here
                  onScoreChange(m.id, m.scoreA, m.scoreB);
                }}
              />
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  m.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                {m.status}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                onClick={() => onFinalize(m.id)}
              >
                Finalize
              </button>
              <button
                className="w-full sm:w-auto px-3 py-2 text-red-600 hover:underline"
                onClick={() => onReset(m.id)}
              >
                Reset
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-2">#</th>
              <th>Pool/Round</th>
              <th>Team A</th>
              <th></th>
              <th>Team B</th>
              <th>Score</th>
              <th>When</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <tr key={m.id} className="border-t">
                <td className="py-2 pr-2">{i + 1}</td>
                <td>
                  {m.poolId ? `Pool ${poolsById[m.poolId]?.name}` : m.round}
                </td>
                <td>
                  <TeamBadge team={teamsById[m.teamAId || '']} />
                </td>
                <td className="text-center">vs</td>
                <td>
                  <TeamBadge team={teamsById[m.teamBId || '']} right />
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <ScoreInput
                      value={m.scoreA}
                      onChange={(v) => onScoreChange(m.id, v, m.scoreB)}
                    />
                    <span className="text-slate-500">-</span>
                    <ScoreInput
                      value={m.scoreB}
                      onChange={(v) => onScoreChange(m.id, m.scoreA, v)}
                    />
                  </div>
                </td>
                <td>
                  <input
                    type="datetime-local"
                    className="px-3 py-2 border rounded-lg bg-white text-slate-900"
                    value={m.when || ''}
                    onChange={() => {
                      // (optional) wire scheduling persistence here
                      onScoreChange(m.id, m.scoreA, m.scoreB);
                    }}
                  />
                </td>
                <td>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      m.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {m.status}
                  </span>
                </td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                      onClick={() => onFinalize(m.id)}
                    >
                      Finalize
                    </button>
                    <button
                      className="px-2 py-1 text-red-600 hover:underline"
                      onClick={() => onReset(m.id)}
                    >
                      Reset
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
