import React from 'react';
import { computeStandings } from '../utils/tournament.js';

function toTime(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function getWinnerForCompletedTournament(row) {
  const payload = row?.payload || row || {};
  const status = payload?.status || row?.status || 'Upcoming';
  if (status !== 'Completed') return null;

  const teamsById = Object.fromEntries((payload?.teams || []).map((tm) => [tm.id, tm]));
  let winnerTeamId = payload?.winnerTeamId || null;

  if (!winnerTeamId && payload?.mode !== 'group') {
    const finalMatch = payload?.finalMatch || null;
    if (finalMatch?.status === 'Completed') {
      winnerTeamId = finalMatch?.winnerTeamId || null;
    }
  }

  if (payload?.mode === 'group') {
    const standings = computeStandings(
      payload?.pools || [],
      payload?.teams || [],
      payload?.groupMatches || [],
      payload?.pointSystem || {}
    );
    const rankedGroups = (payload?.pools || [])
      .map((pool) => {
        const rows = standings[pool.id] || [];
        const points = rows.reduce((sum, r) => sum + Number(r?.points || 0), 0);
        const pf = rows.reduce((sum, r) => sum + Number(r?.pf || 0), 0);
        const pa = rows.reduce((sum, r) => sum + Number(r?.pa || 0), 0);
        return { pool, points, diff: pf - pa, pf };
      })
      .sort((a, b) => {
        if ((b?.points || 0) !== (a?.points || 0)) return (b?.points || 0) - (a?.points || 0);
        if ((b?.diff || 0) !== (a?.diff || 0)) return (b?.diff || 0) - (a?.diff || 0);
        return (b?.pf || 0) - (a?.pf || 0);
      });
    const winnerPool = rankedGroups[0]?.pool || null;
    if (!winnerPool) return null;

    const playersById = Object.fromEntries((payload?.players || []).map((p) => [p.id, p]));
    const memberNames = (winnerPool.teamIds || []).flatMap((teamId) => {
      const team = teamsById[teamId];
      return (team?.players || [])
        .map((pid) => playersById[pid]?.name || '')
        .filter(Boolean);
    });
    return {
      name: winnerPool?.name || winnerPool?.id || 'Group',
      members: [...new Set(memberNames)],
      mode: 'group',
    };
  }

  if (!winnerTeamId) return null;
  const winnerTeam = teamsById[winnerTeamId] || null;
  const playersById = Object.fromEntries((payload?.players || []).map((p) => [p.id, p]));
  const memberNames = (winnerTeam?.players || [])
    .map((pid) => playersById[pid]?.name || '')
    .filter(Boolean);
  return {
    name: winnerTeam?.name || winnerTeamId,
    members: memberNames,
    mode: payload?.mode || 'doubles',
  };
}

export default function HomeScreen({
  welcomeName,
  fixtureCount,
  teamCount,
  playerCount,
  tournamentCount,
  liveTournament,
  tournaments,
  onOpenFixture,
  onManagePlayers,
  onBrowseTournaments,
  onOpenTournament,
}) {
  const safePlayers = Math.max(0, Number(playerCount) || 0);
  const safeTeams = Math.max(0, Number(teamCount) || 0);
  const safeFixtures = Math.max(0, Number(fixtureCount) || 0);
  const tournamentStats = (tournaments || []).reduce(
    (acc, row) => {
      const payload = row?.payload || {};
      const matches = [
        ...(payload?.groupMatches || []),
        ...(payload?.semiMatches || []),
        ...(payload?.finalMatch ? [payload.finalMatch] : []),
      ];
      const completed = matches.filter((m) => m?.status === 'Completed').length;
      acc.total += matches.length;
      acc.completed += completed;
      return acc;
    },
    { total: 0, completed: 0 }
  );
  const tournamentProgress =
    tournamentStats.total > 0
      ? Math.round((tournamentStats.completed * 100) / tournamentStats.total)
      : 0;
  const progressTone =
    tournamentProgress >= 80
      ? 'text-emerald-700'
      : tournamentProgress >= 50
        ? 'text-amber-700'
        : 'text-rose-700';
  const recentTournaments = [...(tournaments || [])].slice(0, 3);
  const latestCompletedTournament = [...(tournaments || [])]
    .filter((row) => (row?.status || row?.payload?.status) === 'Completed')
    .sort(
      (a, b) =>
        toTime(b?.updated_at || b?.payload?.updated_at || b?.created_at || b?.payload?.created_at) -
        toTime(a?.updated_at || a?.payload?.updated_at || a?.created_at || a?.payload?.created_at)
    )[0];
  const latestWinner = getWinnerForCompletedTournament(latestCompletedTournament);

  return (
    <section className="space-y-6">
      {welcomeName && (
        <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-medium text-slate-700">
          Welcome {welcomeName}
        </div>
      )}

      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-cyan-100 via-white to-amber-100 p-6 sm:p-10">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-fuchsia-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-cyan-300/35 blur-3xl" />
        <p className="text-xs uppercase tracking-widest text-slate-600 font-semibold">Dashboard</p>
        <h2 className="mt-2 text-2xl sm:text-4xl font-bold text-slate-900">Tournament Control Center</h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-700">
          Build teams, generate fixtures, and track outcomes with one streamlined flow.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 relative z-10">
          <button className="btn-primary w-full sm:w-auto" onClick={onOpenFixture}>
            Create Fixture
          </button>
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg border bg-white/90 hover:bg-white"
            onClick={onManagePlayers}
          >
            Manage Players
          </button>
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg border bg-white/90 hover:bg-white"
            onClick={onBrowseTournaments}
          >
            Browse Tournaments
          </button>
        </div>
      </div>

      {latestCompletedTournament && latestWinner && (
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
            Congratulations
          </div>
          <div className="mt-1 text-base sm:text-lg font-semibold text-emerald-900">
            {latestWinner.name} won {latestCompletedTournament?.name +' Tournament' || 'Last Tournament'}
          </div>
          {latestWinner.mode === 'group' && latestWinner.members.length > 0 && (
            <div className="mt-1 text-xs sm:text-sm text-emerald-800/90">
              Players: {latestWinner.members.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-indigo-100 p-4">
          <div className="text-sm text-indigo-700">Tournament Progress</div>
          <div className={`mt-1 text-2xl font-bold ${progressTone}`}>{tournamentProgress}%</div>
          <div className="mt-2 h-2 rounded-full bg-indigo-200">
            <div
              className="h-2 rounded-full bg-indigo-500"
              style={{ width: `${tournamentProgress}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-indigo-700">
            {tournamentStats.completed}/{tournamentStats.total} matches completed
          </div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
          <div className="text-sm text-emerald-700">Players</div>
          <div className="mt-1 text-2xl font-bold text-emerald-900">{safePlayers}</div>
          <div className="mt-1 text-xs text-emerald-700">Registered and available</div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-sky-100 p-4">
          <div className="text-sm text-sky-700">Tournaments</div>
          <div className="mt-1 text-2xl font-bold text-sky-900">{Math.max(0, Number(tournamentCount) || 0)}</div>
          <div className="mt-1 text-xs text-sky-700">Saved tournaments</div>
        </div>
      </div>

      {/* <div className="grid gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold text-slate-700">Quick Checklist</div>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div className={`rounded-lg px-3 py-2 ${safePlayers > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {safePlayers > 0 ? 'Done' : 'Pending'}: Add players
            </div>
            <div className={`rounded-lg px-3 py-2 ${safeTeams > 1 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {safeTeams > 1 ? 'Done' : 'Pending'}: Build teams
            </div>
            <div className={`rounded-lg px-3 py-2 ${safeFixtures > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
              {safeFixtures > 0 ? 'Done' : 'Pending'}: Generate fixtures
            </div>
          </div>
        </div>
      </div> */}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-700">Currently Running</div>
            <span className={`text-xs rounded-full border px-2 py-0.5 ${
              liveTournament ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              {liveTournament ? 'Live' : 'No Live Tournament'}
            </span>
          </div>
          {liveTournament ? (
            <button
              className="mt-3 w-full text-left rounded-lg border bg-orange-50/50 p-3 hover:bg-orange-50"
              onClick={() => onOpenTournament?.(liveTournament.id)}
            >
              <div className="font-semibold text-slate-900">{liveTournament.name}</div>
              <div className="text-xs text-slate-600 mt-1">Tap to open tournament details</div>
            </button>
          ) : (
            <div className="mt-3 text-sm text-slate-500">
              Start a tournament match to see live status here.
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold text-slate-700">Recent Tournaments</div>
          {recentTournaments.length === 0 ? (
            <div className="mt-3 text-sm text-slate-500">No tournaments available yet.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {recentTournaments.map((row) => (
                <button
                  key={row.id}
                  className="w-full rounded-lg border px-3 py-2 text-left hover:bg-slate-50"
                  onClick={() => onOpenTournament?.(row.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-slate-900 truncate">{row.name}</div>
                    <span className="text-[11px] rounded-full border px-2 py-0.5">
                      {row.status || 'Upcoming'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
