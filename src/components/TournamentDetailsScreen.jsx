import React from 'react';
import { computeStandings } from '../utils/tournament.js';

function getMatchStatusBadgeClass(status) {
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Live') return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-yellow-50 text-yellow-700 border-yellow-200';
}

function getMatchStatusLabel(status) {
  return status === 'Pending' || !status ? 'Upcoming' : status;
}

function getStagePriority(stage) {
  if (stage === 'Group') return 0;
  if (stage === 'Semifinal') return 1;
  if (stage === 'Final') return 2;
  return 3;
}

function getMatchSortPriority(status) {
  if (status === 'Live') return 0;
  if (status === 'Upcoming' || status === 'Pending' || !status) return 1;
  if (status === 'Completed') return 2;
  return 3;
}

function getCurrentMatch(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return null;
  const sorted = [...matches].sort((a, b) => {
    const statusDiff = getMatchSortPriority(a.status) - getMatchSortPriority(b.status);
    if (statusDiff !== 0) return statusDiff;
    const stageDiff = getStagePriority(a.stage) - getStagePriority(b.stage);
    if (stageDiff !== 0) return stageDiff;
    return String(a.label || '').localeCompare(String(b.label || ''));
  });
  return sorted[0] || null;
}

function getMatchPlayers(match, teamsById) {
  const fromExplicit = [
    ...(match?.teamAPlayerIds || []),
    ...(match?.teamBPlayerIds || []),
  ].filter(Boolean);
  if (fromExplicit.length > 0) return fromExplicit;
  const teamAPlayers = teamsById[match?.teamAId || '']?.players || [];
  const teamBPlayers = teamsById[match?.teamBId || '']?.players || [];
  return [...teamAPlayers, ...teamBPlayers].filter(Boolean);
}

function getDisplayName(match, teamsById, side) {
  if (side === 'A') {
    return match?.teamADisplay || teamsById[match?.teamAId || '']?.name || 'TBD';
  }
  return match?.teamBDisplay || teamsById[match?.teamBId || '']?.name || 'TBD';
}

function withWinnerTrophy(match, side, label) {
  if (match?.status !== 'Completed' || !match?.winnerTeamId) return label;
  const isWinner =
    side === 'A'
      ? match.winnerTeamId === match.teamAId
      : match.winnerTeamId === match.teamBId;
  return isWinner ? `🏆 ${label}` : label;
}

function getRecommendedCourtMatches(matches, teamsById) {
  const recommendFromUpcoming = (upcomingMatches) => {
    const upcoming = (upcomingMatches || []).filter(
      (m) => m?.status === 'Pending' || m?.status === 'Upcoming' || !m?.status
    );
    if (upcoming.length === 0) return { court1: null, court2: null };

    const recentlyPlayedMatch =
      (matches || []).find((m) => m?.status === 'Live') ||
      (matches || []).find((m) => m?.status === 'Completed') ||
      null;
    const recentPlayers = new Set(
      recentlyPlayedMatch ? getMatchPlayers(recentlyPlayedMatch, teamsById) : []
    );

    const withMeta = upcoming.map((m) => {
      const players = getMatchPlayers(m, teamsById);
      const overlapWithRecent = players.filter((pid) => recentPlayers.has(pid)).length;
      return { match: m, players, overlapWithRecent };
    });

    withMeta.sort((a, b) => {
      if (a.overlapWithRecent !== b.overlapWithRecent) {
        return a.overlapWithRecent - b.overlapWithRecent;
      }
      return String(a.match?.label || '').localeCompare(String(b.match?.label || ''));
    });

    const court1Meta = withMeta[0] || null;
    if (!court1Meta) return { court1: null, court2: null };

    const court1Players = new Set(court1Meta.players);
    const nonOverlapping = withMeta.find(
      (item) =>
        item.match?.id !== court1Meta.match?.id &&
        item.players.every((pid) => !court1Players.has(pid))
    );
    const fallbackSecond =
      withMeta.find((item) => item.match?.id !== court1Meta.match?.id) || null;
    return {
      court1: court1Meta.match,
      court2: (nonOverlapping || fallbackSecond)?.match || null,
    };
  };

  const liveMatches = (matches || []).filter((m) => m?.status === 'Live').slice(0, 2);
  if (liveMatches.length === 2) {
    return { court1: liveMatches[0], court2: liveMatches[1], liveCount: 2 };
  }
  if (liveMatches.length === 1) {
    const remainingUpcoming = (matches || []).filter(
      (m) =>
        (m?.status === 'Pending' || m?.status === 'Upcoming' || !m?.status) &&
        m?.id !== liveMatches[0]?.id
    );
    const upcomingRecommendation = recommendFromUpcoming(remainingUpcoming);
    return {
      court1: liveMatches[0],
      court2: upcomingRecommendation.court1 || upcomingRecommendation.court2 || null,
      liveCount: 1,
    };
  }

  const upcomingRecommendation = recommendFromUpcoming(matches);
  return {
    court1: upcomingRecommendation.court1,
    court2: upcomingRecommendation.court2,
    liveCount: 0,
  };
}

function getCompletedResult(tournament, teamsById) {
  if (!tournament || tournament.status !== 'Completed') return null;

  if (tournament.mode === 'group') {
    const playersById = Object.fromEntries((tournament.players || []).map((p) => [p.id, p]));
    const standings = computeStandings(
      tournament.pools || [],
      tournament.teams || [],
      tournament.groupMatches || [],
      tournament.pointSystem || {}
    );
    const rankedGroups = (tournament.pools || [])
      .map((pool) => {
        const rows = standings[pool.id] || [];
        const points = rows.reduce((sum, r) => sum + Number(r?.points || 0), 0);
        const pf = rows.reduce((sum, r) => sum + Number(r?.pf || 0), 0);
        const pa = rows.reduce((sum, r) => sum + Number(r?.pa || 0), 0);
        return { pool, points, diff: pf - pa, pf };
      })
      .sort((a, b) => {
        if ((b.points || 0) !== (a.points || 0)) return (b.points || 0) - (a.points || 0);
        const diffA = a.diff || 0;
        const diffB = b.diff || 0;
        if (diffB !== diffA) return diffB - diffA;
        return (b.pf || 0) - (a.pf || 0);
      });

    const winnerPool = rankedGroups[0]?.pool || null;
    const runnerPool = rankedGroups[1]?.pool || null;
    if (!winnerPool) return null;

    const getMemberNames = (pool) =>
      (pool?.teamIds || []).flatMap((teamId) =>
        (teamsById[teamId]?.players || [])
          .map((pid) => playersById[pid]?.name || '')
          .filter(Boolean)
      );

    return {
      winner: winnerPool?.name || winnerPool?.id || '-',
      winnerMembers: [...new Set(getMemberNames(winnerPool))],
      runner: runnerPool?.name || runnerPool?.id || '-',
      runnerMembers: [...new Set(getMemberNames(runnerPool))],
    };
  }

  const finalMatch = tournament.finalMatch;
  if (!finalMatch || finalMatch.status !== 'Completed') return null;
  const winnerTeamId = finalMatch.winnerTeamId;
  const runnerTeamId =
    winnerTeamId === finalMatch.teamAId ? finalMatch.teamBId : finalMatch.teamAId;
  return {
    winner: winnerTeamId ? teamsById[winnerTeamId]?.name || winnerTeamId : '-',
    runner: runnerTeamId ? teamsById[runnerTeamId]?.name || runnerTeamId : '-',
  };
}

export default function TournamentDetailsScreen({
  tournament,
  getTournamentMatches,
  onBack,
  onOpenMatches,
  onOpenPoints,
  onTrackCurrentMatch,
}) {
  if (!tournament) {
    return (
      <section className="rounded-xl border bg-white p-4">
        <div className="text-sm text-slate-500">Tournament not found.</div>
      </section>
    );
  }

  const teamsById = Object.fromEntries((tournament.teams || []).map((tm) => [tm.id, tm]));
  const matches = getTournamentMatches(tournament);
  const currentMatch = getCurrentMatch(matches);
  const currentRef = currentMatch ? { stage: currentMatch.stage, id: currentMatch.id } : null;
  const teamA = currentMatch ? teamsById[currentMatch.teamAId || '']?.name || 'TBD' : '-';
  const teamB = currentMatch ? teamsById[currentMatch.teamBId || '']?.name || 'TBD' : '-';
  const teamADisplay = currentMatch
    ? withWinnerTrophy(currentMatch, 'A', currentMatch.teamADisplay || teamA)
    : '-';
  const teamBDisplay = currentMatch
    ? withWinnerTrophy(currentMatch, 'B', currentMatch.teamBDisplay || teamB)
    : '-';
  const recommendedCourts = getRecommendedCourtMatches(matches, teamsById);
  const completedResult = getCompletedResult(tournament, teamsById);

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-white to-indigo-50/40 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Tournament</div>
            <div className="text-xl font-semibold">{tournament.name}</div>
            <div className="text-sm text-slate-500 mt-1">
              Status: {tournament.status || 'Upcoming'} | Matches: {matches.length}
            </div>
          </div>
          <button className="px-3 py-2 rounded-lg border hover:bg-slate-100" onClick={onBack}>
            Back
          </button>
        </div>
      </div>

      {completedResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
          <div className="text-sm font-semibold text-emerald-800">Completed Result</div>
          <div className="mt-2 text-sm text-emerald-900">
            Winner: <span className="font-semibold">{completedResult.winner}</span>
          </div>
          {Array.isArray(completedResult.winnerMembers) && completedResult.winnerMembers.length > 0 && (
            <div className="mt-1 text-xs text-emerald-800/90">
              Players: {completedResult.winnerMembers.join(', ')}
            </div>
          )}
          <div className="mt-1 text-sm text-emerald-900">
            Runner-up: <span className="font-semibold">{completedResult.runner}</span>
          </div>
          {Array.isArray(completedResult.runnerMembers) && completedResult.runnerMembers.length > 0 && (
            <div className="mt-1 text-xs text-emerald-800/90">
              Players: {completedResult.runnerMembers.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700">Current Match</div>
        {!currentMatch ? (
          <div className="mt-2 text-sm text-slate-500">No matches available for this tournament.</div>
        ) : (
          <>
            <div className="mt-3 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm text-slate-500">{currentMatch.stage}</div>
                <div className="font-semibold">{currentMatch.label || 'Match'}</div>
              </div>
              <span
                className={`text-xs rounded-full border px-2 py-0.5 ${getMatchStatusBadgeClass(
                  currentMatch.status
                )}`}
              >
                {getMatchStatusLabel(currentMatch.status)}
              </span>
            </div>
            <div className="mt-3 text-sm">
              {teamADisplay} <span className="text-slate-400">vs</span> {teamBDisplay}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Score: {currentMatch.scoreA ?? '-'} : {currentMatch.scoreB ?? '-'}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-primary w-full sm:w-auto" onClick={() => onTrackCurrentMatch?.(currentRef)}>
                Open Current Match
              </button>
              <button
                className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                onClick={onOpenMatches}
              >
                All Matches
              </button>
              <button
                className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                onClick={onOpenPoints}
              >
                Point Table
              </button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-700">Recommended Upcoming Matches</div>
        <div className="mt-1 text-xs text-slate-500">
          {recommendedCourts.liveCount > 0
            ? 'Live matches are shown first (up to 2 courts). Remaining slots use recommendation.'
            : 'Recommendation avoids continuous matches for same players when possible.'}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[['Court 1', recommendedCourts.court1], ['Court 2', recommendedCourts.court2]].map(
            ([courtName, match]) => (
              <div key={courtName} className="rounded-lg border p-3">
                <div className="text-xs text-slate-500">{courtName}</div>
                {!match ? (
                  <div className="text-sm text-slate-500 mt-1">No suitable upcoming match.</div>
                ) : (
                  <>
                    <div className="font-medium mt-1">{match.label || 'Upcoming Match'}</div>
                    <div className="text-sm mt-1">
                      {withWinnerTrophy(match, 'A', getDisplayName(match, teamsById, 'A'))}{' '}
                      <span className="text-slate-400">vs</span>{' '}
                      {withWinnerTrophy(match, 'B', getDisplayName(match, teamsById, 'B'))}
                    </div>
                  </>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
