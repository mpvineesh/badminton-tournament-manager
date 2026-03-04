// ================================
// FILE: src/components/MatchesTable.jsx
// ================================
import React, { useState } from 'react';
import ScoreInput from './ScoreInput.jsx';

export default function MatchesTable({
  matches,
  teamsById,
  poolsById,
  onScoreChange,
  onFinalize,
  onReset,
  canResetCompletedMatches = true,
}) {
  const [groupFilter, setGroupFilter] = useState('all');
  const [courtFilter, setCourtFilter] = useState('all');
  const matchRows = (matches || []).map((m, idx) => ({
    match: m,
    index: idx,
    court: Number(m?.court) || (idx % 2) + 1,
  }));
  const filtered = matchRows.filter((row) => {
    const byGroup = groupFilter === 'all' ? true : row.match?.poolId === groupFilter;
    const byCourt = courtFilter === 'all' ? true : String(row.court) === courtFilter;
    return byGroup && byCourt;
  });
  const poolOptions = Object.values(poolsById);
  const courtOptions = [...new Set(matchRows.map((row) => String(row.court)))].sort((a, b) => Number(a) - Number(b));
  const statusBadgeClass = (status) => {
    if (status === 'Completed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (status === 'Live') {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };
  const getDisplayName = (match, side) => {
    if (side === 'A') return match?.teamADisplay || teamsById[match?.teamAId || '']?.name || 'TBD';
    return match?.teamBDisplay || teamsById[match?.teamBId || '']?.name || 'TBD';
  };
  const getGroupName = (match, side) => {
    const poolId = side === 'A' ? match?.poolAId || match?.poolId : match?.poolBId || match?.poolId;
    return poolsById[poolId || '']?.name || 'Group';
  };
  const decorateWinner = (match, side, name) => {
    if (match?.status !== 'Completed' || !match?.winnerTeamId) return name;
    const isWinner =
      side === 'A'
        ? match.winnerTeamId === match.teamAId
        : match.winnerTeamId === match.teamBId;
    return isWinner ? `🏆 ${name}` : name;
  };

  return (
    <div className="p-0 sm:p-1">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="grow">
          <div className="font-semibold text-slate-900">Matches</div>
          <div className="text-xs text-slate-500">{filtered.length} visible</div>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2 text-xs sm:text-sm">
          <span className="text-slate-500">Group</span>
          <select
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 border rounded-full bg-white text-slate-900 shadow-sm"
          >
            <option value="all">All</option>
            {poolOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2 text-xs sm:text-sm">
          <span className="text-slate-500">Court</span>
          <select
            value={courtFilter}
            onChange={(e) => setCourtFilter(e.target.value)}
            className="w-full sm:w-auto px-2.5 py-1.5 border rounded-full bg-white text-slate-900 shadow-sm"
          >
            <option value="all">All</option>
            {courtOptions.map((c) => (
              <option key={c} value={c}>
                Court {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {filtered.map((row, i) => {
          const m = row.match;
          const teamAName = decorateWinner(m, 'A', getDisplayName(m, 'A'));
          const teamBName = decorateWinner(m, 'B', getDisplayName(m, 'B'));
          const groupALabel = getGroupName(m, 'A');
          const groupBLabel = getGroupName(m, 'B');
          return (
            <div key={m.id} className="rounded-xl border border-slate-200 p-2.5 bg-gradient-to-br from-white to-cyan-50/40 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[11px] text-slate-500">
                  Court {row.court} · #{i + 1}
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] border ${statusBadgeClass(
                    m.status
                  )}`}
                >
                  {m.status || 'Pending'}
                </span>
              </div>

              <div className="text-sm font-medium leading-5">
                {teamAName} <span className="text-slate-400">vs</span> {teamBName}
              </div>
              <div className="mt-1 text-xs text-slate-500">Group: {groupALabel} vs {groupBLabel}</div>

              <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="flex justify-center">
                  <ScoreInput
                    value={m.scoreA}
                    onChange={(v) => onScoreChange(m.id, v, m.scoreB, 'A')}
                  />
                </div>
                <span className="text-slate-500 text-sm">-</span>
                <div className="flex justify-center">
                  <ScoreInput
                    value={m.scoreB}
                    onChange={(v) => onScoreChange(m.id, m.scoreA, v, 'B')}
                  />
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {m.status !== 'Completed' && (
                  <button
                    className="w-full px-2.5 py-1.5 rounded-lg border hover:bg-slate-100 text-xs font-medium"
                    onClick={() => onFinalize(m.id)}
                  >
                    Complete
                  </button>
                )}
                {(m.status !== 'Completed' || canResetCompletedMatches) && (
                  <button
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-red-600 hover:bg-red-50 text-xs ${
                      m.status === 'Completed' ? 'col-span-2' : ''
                    }`}
                    onClick={() => onReset(m.id)}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-slate-500 bg-slate-50/80">
              <th className="py-2 px-2">#</th>
              <th className="px-2">Court</th>
              <th className="px-2">Match</th>
              <th className="px-2">Score</th>
              <th className="px-2">Status</th>
              <th className="px-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => {
              const m = row.match;
              return (
              <tr key={m.id} className="border-t align-middle">
                <td className="py-2 px-2">{i + 1}</td>
                <td className="px-2">{`Court ${row.court}`}</td>
                <td className="px-2">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                    <span className="text-sm font-medium">
                      {decorateWinner(m, 'A', getDisplayName(m, 'A'))}
                    </span>
                    <span className="text-slate-400 text-xs">vs</span>
                    <span className="text-sm font-medium text-right">
                      {decorateWinner(m, 'B', getDisplayName(m, 'B'))}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Group: {getGroupName(m, 'A')} vs {getGroupName(m, 'B')}
                  </div>
                </td>
                <td className="px-2">
                  <div className="flex items-center gap-2">
                    <ScoreInput
                      value={m.scoreA}
                      onChange={(v) => onScoreChange(m.id, v, m.scoreB, 'A')}
                    />
                    <span className="text-slate-500">-</span>
                    <ScoreInput
                      value={m.scoreB}
                      onChange={(v) => onScoreChange(m.id, m.scoreA, v, 'B')}
                    />
                  </div>
                </td>
                <td className="px-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs border ${statusBadgeClass(
                      m.status
                    )}`}
                  >
                    {m.status || 'Pending'}
                  </span>
                </td>
                <td className="px-2 text-right">
                  <div className="inline-flex gap-2">
                    {m.status !== 'Completed' && (
                      <button
                        className="px-2.5 py-1 rounded-lg border hover:bg-slate-100 text-xs font-medium"
                        onClick={() => onFinalize(m.id)}
                      >
                        Complete
                      </button>
                    )}
                    {(m.status !== 'Completed' || canResetCompletedMatches) && (
                      <button
                        className="px-2 py-1 text-red-600 hover:underline text-xs"
                        onClick={() => onReset(m.id)}
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
