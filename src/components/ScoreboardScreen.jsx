import React from 'react';
import { computeStandings } from '../utils/tournament.js';

function getTournamentMatches(payload) {
  const groups = (payload?.groupMatches || []).map((m) => ({ ...m, stage: 'Group' }));
  if (payload?.mode === 'group') return groups;
  const semis = (payload?.semiMatches || []).map((m) => ({ ...m, stage: 'Semifinal' }));
  const finals = payload?.finalMatch ? [{ ...payload.finalMatch, stage: 'Final' }] : [];
  return [...groups, ...semis, ...finals];
}

function getTeamName(match, teamsById, side) {
  if (side === 'A') return match?.teamADisplay || teamsById[match?.teamAId || '']?.name || 'TBD';
  return match?.teamBDisplay || teamsById[match?.teamBId || '']?.name || 'TBD';
}

function getMatchPlayers(match, teamsById, playersById, side) {
  const direct = side === 'A' ? match?.teamAPlayerIds : match?.teamBPlayerIds;
  const teamId = side === 'A' ? match?.teamAId : match?.teamBId;
  const fallback = teamsById[teamId || '']?.players || [];
  const ids = (direct?.length ? direct : fallback).filter(Boolean);
  return ids.map((id) => playersById[id]?.name || '').filter(Boolean);
}

export default function ScoreboardScreen({ tournaments, loading, error, onRefresh }) {
  const liveTournaments = (tournaments || []).filter((t) => t?.status === 'Live');

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold text-slate-900">Scoreboard</div>
            <div className="text-xs text-slate-600">Live tournaments with scores and standings.</div>
          </div>
          <button
            className="px-3 py-2 rounded-lg border border-sky-200 bg-white/80 hover:bg-sky-50 text-sm"
            onClick={onRefresh}
          >
            Refresh
          </button>
        </div>
        {(error || loading) && (
          <div className={`mt-2 text-sm ${error ? 'text-red-700' : 'text-slate-500'}`}>
            {error || 'Loading tournaments...'}
          </div>
        )}
      </div>

      {liveTournaments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 text-sm text-slate-500 shadow-sm">
          No live tournaments right now.
        </div>
      ) : (
        <div className="space-y-4">
          {liveTournaments.map((row) => {
            const payload = row?.payload || row || {};
            const teams = payload?.teams || [];
            const pools = payload?.pools || [];
            const players = payload?.players || [];
            const pointSystem = payload?.pointSystem || {};
            const teamsById = Object.fromEntries(teams.map((tm) => [tm.id, tm]));
            const playersById = Object.fromEntries(players.map((p) => [p.id, p]));
            const matches = getTournamentMatches(payload);
            const liveMatches = matches.filter((m) => m?.status === 'Live');
            const standings = computeStandings(pools, teams, payload?.groupMatches || [], pointSystem);

            return (
              <div key={row.id} className="rounded-2xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-slate-500">Live Tournament</div>
                    <div className="text-lg font-semibold">{row.name || payload.name || 'Tournament'}</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs border bg-orange-50 text-orange-700 border-orange-200">
                    Live
                  </span>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-700">Live Matches</div>
                  {liveMatches.length === 0 ? (
                    <div className="text-sm text-slate-500 mt-1">No live matches.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {liveMatches.map((m) => {
                        const teamA = getTeamName(m, teamsById, 'A');
                        const teamB = getTeamName(m, teamsById, 'B');
                        const teamAPlayers = getMatchPlayers(m, teamsById, playersById, 'A');
                        const teamBPlayers = getMatchPlayers(m, teamsById, playersById, 'B');
                        return (
                          <div key={`${m.stage}-${m.id}`} className="rounded-xl border border-sky-200/70 p-2.5 bg-gradient-to-br from-white via-sky-50 to-cyan-50/70">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-medium">{m.stage} {m.label || ''}</div>
                              <div className="text-sm font-semibold">
                                {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                              </div>
                            </div>
                            <div className="mt-1 text-sm text-slate-700">
                              {teamA} vs {teamB}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {teamAPlayers.length ? teamAPlayers.join(', ') : 'TBD'}
                              {' '}|{' '}
                              {teamBPlayers.length ? teamBPlayers.join(', ') : 'TBD'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-700">Team Standings</div>
                  {pools.length === 0 ? (
                    <div className="text-sm text-slate-500 mt-1">No group standings available.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {pools.map((pool, idx) => {
                        const rows = standings[pool.id] || [];
                        if (rows.length === 0) return null;
                        return (
                          <div key={pool.id} className="rounded-xl border border-emerald-200/70 p-2.5 bg-gradient-to-br from-white via-emerald-50 to-emerald-100/60">
                            <div className="text-xs font-semibold text-emerald-700">{pool.name || `Group ${idx + 1}`}</div>
                            <div className="mt-1 overflow-x-auto">
                              <table className="w-full table-fixed text-xs">
                                <thead>
                                  <tr className="text-left text-slate-500">
                                    <th className="py-1 pr-2 w-[56%]">Team</th>
                                    <th className="py-1 pr-2 w-[11%] text-right">Pts</th>
                                    <th className="py-1 pr-2 w-[11%] text-right">W</th>
                                    <th className="py-1 pr-2 w-[11%] text-right">L</th>
                                    <th className="py-1 w-[11%] text-right">Diff</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map((r) => (
                                    <tr key={r.teamId} className="border-t">
                                      <td className="py-1 pr-2 truncate">{teamsById[r.teamId]?.name || r.teamId}</td>
                                      <td className="py-1 pr-2 text-right">{r.points || 0}</td>
                                      <td className="py-1 pr-2 text-right">{r.won || 0}</td>
                                      <td className="py-1 pr-2 text-right">{r.lost ?? Math.max(0, (r.played || 0) - (r.won || 0))}</td>
                                      <td className="py-1 text-right">{(r.pf || 0) - (r.pa || 0)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
