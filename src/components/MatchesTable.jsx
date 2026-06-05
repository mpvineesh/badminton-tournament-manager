// ================================
// FILE: src/components/MatchesTable.jsx
// ================================
// Read-only fixtures preview used in the tournament creation wizard.
// Scoring happens later on the Matches / live-scoring screens, so this view
// only shows the matchups, groups, courts and status.
import React, { useState } from 'react';

export default function MatchesTable({ matches, teamsById, poolsById }) {
  const [groupFilter, setGroupFilter] = useState('all');
  const [courtFilter, setCourtFilter] = useState('all');

  const getStatusPriority = (status) => {
    if (status === 'Live') return 0;
    if (status === 'Upcoming' || status === 'Pending' || !status) return 1;
    if (status === 'Completed') return 2;
    return 3;
  };
  const matchRows = (matches || []).map((m, idx) => ({
    match: m,
    index: idx,
    court: Number(m?.court) || (idx % 2) + 1,
  }));
  const filtered = matchRows
    .filter((row) => {
      const byGroup = groupFilter === 'all' ? true : row.match?.poolId === groupFilter;
      const byCourt = courtFilter === 'all' ? true : String(row.court) === courtFilter;
      return byGroup && byCourt;
    })
    .sort((a, b) => {
      const statusDiff = getStatusPriority(a.match?.status) - getStatusPriority(b.match?.status);
      if (statusDiff !== 0) return statusDiff;
      return a.index - b.index;
    });
  const poolOptions = Object.values(poolsById || {});
  const courtOptions = [...new Set(matchRows.map((row) => String(row.court)))].sort(
    (a, b) => Number(a) - Number(b)
  );
  const statusBadgeClass = (status) => {
    if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Live') return 'bg-orange-50 text-orange-700 border-orange-200';
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
      side === 'A' ? match.winnerTeamId === match.teamAId : match.winnerTeamId === match.teamBId;
    return isWinner ? `🏆 ${name}` : name;
  };

  const selectClass =
    'px-2.5 py-1.5 border rounded-full bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100 shadow-sm text-xs sm:text-sm';

  return (
    <div className="p-0 sm:p-1">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="grow">
          <div className="font-semibold text-slate-900 dark:text-slate-100">Fixtures</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{filtered.length} matches</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Group</span>
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className={selectClass}>
            <option value="all">All</option>
            {poolOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Court</span>
          <select value={courtFilter} onChange={(e) => setCourtFilter(e.target.value)} className={selectClass}>
            <option value="all">All</option>
            {courtOptions.map((c) => (
              <option key={c} value={c}>
                Court {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-navy-700 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
          No fixtures to show.
        </div>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {filtered.map((row, i) => {
            const m = row.match;
            const teamA = decorateWinner(m, 'A', getDisplayName(m, 'A'));
            const teamB = decorateWinner(m, 'B', getDisplayName(m, 'B'));
            const winnerA = m.winnerTeamId && m.winnerTeamId === m.teamAId;
            const winnerB = m.winnerTeamId && m.winnerTeamId === m.teamBId;
            const hasScore = m.scoreA != null || m.scoreB != null;
            const live = m.status === 'Live';
            const accent = live
              ? 'border-l-4 border-l-orange-400'
              : m.status === 'Completed'
                ? 'border-l-4 border-l-emerald-400'
                : 'border-l-4 border-l-slate-200 dark:border-l-navy-700';
            return (
              <div
                key={m.id}
                className={`min-w-0 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-sm ${accent}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Court {row.court} · #{i + 1}
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${statusBadgeClass(m.status)}`}>
                    {live && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />}
                    {m.status || 'Pending'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className={`min-w-0 flex-1 truncate text-right text-sm font-semibold ${winnerA ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {teamA}
                  </div>
                  {hasScore ? (
                    <div className="shrink-0 rounded-lg bg-slate-100 dark:bg-navy-800 px-2.5 py-1 text-sm font-bold tabular-nums text-navy-800 dark:text-slate-100">
                      {m.scoreA ?? '–'}
                      <span className="px-1 text-slate-400">:</span>
                      {m.scoreB ?? '–'}
                    </div>
                  ) : (
                    <div className="shrink-0 rounded-md bg-slate-100 dark:bg-navy-800 px-2 py-1 text-[11px] font-medium text-slate-400">
                      vs
                    </div>
                  )}
                  <div className={`min-w-0 flex-1 truncate text-sm font-semibold ${winnerB ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {teamB}
                  </div>
                </div>
                <div className="mt-1.5 truncate text-[11px] text-slate-400">
                  {getGroupName(m, 'A')} vs {getGroupName(m, 'B')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
