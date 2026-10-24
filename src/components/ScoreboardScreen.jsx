import React, { useEffect, useState } from 'react';
import { computeStandings } from '../utils/tournament.js';
import { resolveProfilePhotoUrl } from '../supabaseAdapter.js';

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

function getMatchPlayerObjs(match, teamsById, playersById, side) {
  const direct = side === 'A' ? match?.teamAPlayerIds : match?.teamBPlayerIds;
  const teamId = side === 'A' ? match?.teamAId : match?.teamBId;
  const fallback = teamsById[teamId || '']?.players || [];
  const ids = (direct?.length ? direct : fallback).filter(Boolean);
  return ids
    .map((id) => playersById[id])
    .filter(Boolean)
    .map((p) => ({ name: p.name || '', avatarUrl: resolveProfilePhotoUrl(p.avatarUrl) }));
}

function Avatars({ players }) {
  if (!players?.length) return <span className="text-slate-400">TBD</span>;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle">
      {players.map((p, i) => (
        <span key={`${p.name}-${i}`} className="inline-flex items-center gap-1">
          <span className="inline-flex h-6 w-6 overflow-hidden rounded-full border border-slate-200 dark:border-navy-700 bg-slate-100 dark:bg-navy-800 align-middle">
            {p.avatarUrl ? (
              <img src={p.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                {(p.name || '?').charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <span>{String(p.name || '').split(/\s+/)[0]}</span>
        </span>
      ))}
    </span>
  );
}

// Gathers every live match across all live tournaments for the TV view.
function collectLiveMatches(tournaments) {
  const out = [];
  for (const row of tournaments || []) {
    const payload = row?.payload || row || {};
    const teamsById = Object.fromEntries((payload?.teams || []).map((tm) => [tm.id, tm]));
    const playersById = Object.fromEntries((payload?.players || []).map((p) => [p.id, p]));
    for (const m of getTournamentMatches(payload).filter((x) => x?.status === 'Live')) {
      out.push({
        key: `${row.id}-${m.stage}-${m.id}`,
        tournamentName: row.name || payload.name || 'Tournament',
        stage: `${m.stage}${m.label ? ' · ' + m.label : ''}`,
        teamA: getTeamName(m, teamsById, 'A'),
        teamB: getTeamName(m, teamsById, 'B'),
        scoreA: m.scoreA ?? 0,
        scoreB: m.scoreB ?? 0,
      });
    }
  }
  return out;
}

function DisplayMode({ tournaments, onExit }) {
  const live = collectLiveMatches(tournaments);
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    if (live.length <= 1) return undefined;
    const rotate = setInterval(() => setIdx((i) => (i + 1) % live.length), 6000);
    return () => clearInterval(rotate);
  }, [live.length]);

  const match = live[idx % Math.max(1, live.length)];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-gradient-to-br from-navy-800 to-navy-900 text-white">
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
          paddingLeft: 'calc(env(safe-area-inset-left) + 1.25rem)',
          paddingRight: 'calc(env(safe-area-inset-right) + 1.25rem)',
        }}
      >
        <div className="flex items-center gap-2 text-gold-300">
          <span className="text-lg font-bold tracking-wide">Whitefeather · Live</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-navy-100">
            {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={onExit}
            className="rounded-lg border border-white/25 bg-white/10 dark:bg-navy-900/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
          >
            Exit
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4">
        {!match ? (
          <div className="text-center text-2xl font-semibold text-navy-100">No live matches right now.</div>
        ) : (
          <div className="w-full max-w-4xl text-center">
            <div className="text-sm uppercase tracking-[0.3em] text-gold-300">{match.tournamentName}</div>
            <div className="mt-1 text-base text-navy-100">{match.stage}</div>
            <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
              <div className="min-w-0">
                <div className="truncate text-2xl sm:text-4xl font-bold">{match.teamA}</div>
                <div className="mt-3 text-7xl sm:text-9xl font-black text-emerald-300">{match.scoreA}</div>
              </div>
              <div className="text-3xl sm:text-5xl font-light text-navy-200">vs</div>
              <div className="min-w-0">
                <div className="truncate text-2xl sm:text-4xl font-bold">{match.teamB}</div>
                <div className="mt-3 text-7xl sm:text-9xl font-black text-rose-300">{match.scoreB}</div>
              </div>
            </div>
            {live.length > 1 && (
              <div className="mt-10 flex items-center justify-center gap-2">
                {live.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 w-2 rounded-full ${i === idx % live.length ? 'bg-gold-400' : 'bg-white/25'}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScoreboardScreen({ tournaments, loading, error, onRefresh }) {
  const [display, setDisplay] = useState(false);
  const liveTournaments = (tournaments || []).filter((t) => t?.status === 'Live');

  return (
    <section className="space-y-4">
      {display && <DisplayMode tournaments={tournaments} onExit={() => setDisplay(false)} />}

      <div className="rounded-2xl border border-navy-200 bg-gradient-to-r from-navy-50 via-navy-50 to-white dark:to-navy-900 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">Scoreboard</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Live tournaments with scores and standings.</div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              onClick={() => setDisplay(true)}
              disabled={liveTournaments.length === 0}
              title={liveTournaments.length === 0 ? 'No live tournaments' : 'Open big-screen view'}
            >
              Display mode
            </button>
            <button className="btn-ghost" onClick={onRefresh}>
              Refresh
            </button>
          </div>
        </div>
        {(error || loading) && (
          <div className={`mt-2 text-sm ${error ? 'text-rose-700' : 'text-slate-500'}`}>
            {error || 'Loading tournaments...'}
          </div>
        )}
      </div>

      {liveTournaments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-navy-700 bg-white/70 dark:bg-navy-900/70 py-12 text-center shadow-sm">
          <div className="text-sm font-medium text-slate-600 dark:text-slate-300">No live tournaments right now</div>
          <p className="mt-1 text-xs text-slate-400">Start a match and it will appear here in real time.</p>
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
              <div key={row.id} className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">Live Tournament</div>
                    <div className="text-lg font-semibold">{row.name || payload.name || 'Tournament'}</div>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border bg-orange-50 text-orange-700 border-orange-200">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" /> Live
                  </span>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Live Matches</div>
                  {liveMatches.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">No live matches.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {liveMatches.map((m) => {
                        const teamA = getTeamName(m, teamsById, 'A');
                        const teamB = getTeamName(m, teamsById, 'B');
                        const teamAPlayers = getMatchPlayerObjs(m, teamsById, playersById, 'A');
                        const teamBPlayers = getMatchPlayerObjs(m, teamsById, playersById, 'B');
                        return (
                          <div key={`${m.stage}-${m.id}`} className="rounded-xl border border-navy-200/70 p-2.5 bg-gradient-to-br from-white dark:from-navy-900 to-navy-50/70">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-medium">{m.stage} {m.label || ''}</div>
                              <div className="text-base font-bold text-navy-800">
                                {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                              </div>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                              <Avatars players={teamAPlayers} />
                              <span className="text-slate-400">vs</span>
                              <Avatars players={teamBPlayers} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Team Standings</div>
                  {pools.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">No group standings available.</div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {pools.map((pool, idx) => {
                        const rows = standings[pool.id] || [];
                        if (rows.length === 0) return null;
                        return (
                          <div key={pool.id} className="rounded-xl border border-slate-200 dark:border-navy-700 p-2.5 bg-white dark:bg-navy-900">
                            <div className="text-xs font-semibold text-navy-700">{pool.name || `Group ${idx + 1}`}</div>
                            <div className="mt-1 overflow-x-auto">
                              <table className="w-full table-fixed text-xs">
                                <thead>
                                  <tr className="text-left text-slate-500 dark:text-slate-400">
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
