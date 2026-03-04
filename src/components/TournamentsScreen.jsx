import React from 'react';
import { computeStandings } from '../utils/tournament.js';

export default function TournamentsScreen({
  appError,
  tournamentsError,
  tournamentView,
  selectedTournament,
  selectedMatchRef,
  refreshTournamentsList,
  tournamentsLoading,
  tournamentsList,
  canDeleteTournament,
  onOpenTournamentDetails,
  onOpenTournamentFixture,
  handleTournamentDelete,
  openTournamentLiveView,
  setTournamentView,
  getTournamentMatches,
  openMatchTracking,
  findMatchByRef,
  matchScoreA,
  setMatchScoreA,
  matchScoreB,
  setMatchScoreB,
  matchWinnerId,
  setMatchWinnerId,
  matchStatus,
  setMatchStatus,
  saveMatchTracking,
  savingMatch,
  isAdminUser,
}) {
  const showListView =
    tournamentView === 'list' ||
    !selectedTournament ||
    (tournamentView === 'match' && !selectedMatchRef);
  const getMatchStatusBadgeClass = (status) => {
    if (status === 'Completed') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (status === 'Live') {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    }
    if (status === 'Upcoming' || status === 'Pending' || !status) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };
  const getMatchStatusLabel = (status) =>
    status === 'Pending' || !status ? 'Upcoming' : status;
  const getMatchSortPriority = (status) => {
    if (status === 'Live') return 0;
    if (status === 'Upcoming' || status === 'Pending' || !status) return 1;
    if (status === 'Completed') return 2;
    return 3;
  };
  const getStagePriority = (stage) => {
    if (stage === 'Group') return 0;
    if (stage === 'Semifinal') return 1;
    if (stage === 'Final') return 2;
    return 3;
  };
  const getOrderedMatches = (tournament) =>
    [...getTournamentMatches(tournament)].sort((a, b) => {
      const statusDiff = getMatchSortPriority(a.status) - getMatchSortPriority(b.status);
      if (statusDiff !== 0) return statusDiff;
      const stageDiff = getStagePriority(a.stage) - getStagePriority(b.stage);
      if (stageDiff !== 0) return stageDiff;
      return String(a.label || '').localeCompare(String(b.label || ''));
    });
  const getTournamentStatusSortPriority = (status) => {
    if (status === 'Live') return 0;
    if (status === 'Completed') return 1;
    if (status === 'Upcoming') return 2;
    return 3;
  };
  const orderedTournaments = [...(tournamentsList || [])].sort((a, b) => {
    const statusDiff =
      getTournamentStatusSortPriority(a?.status) - getTournamentStatusSortPriority(b?.status);
    if (statusDiff !== 0) return statusDiff;
    const aTime = new Date(a?.created_at || 0).getTime();
    const bTime = new Date(b?.created_at || 0).getTime();
    return bTime - aTime;
  });
  const getTournamentStatusBadgeClass = (status) => {
    if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Live') return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };
  const getWinnerTeamName = (row) => {
    const payload = row?.payload || {};
    if (payload?.mode === 'group') {
      const pools = payload?.pools || [];
      const teams = payload?.teams || [];
      const groupMatches = payload?.groupMatches || [];
      if (pools.length === 0 || teams.length === 0 || groupMatches.length === 0) return '-';
      const standings = computeStandings(pools, teams, groupMatches, payload?.pointSystem || {});
      const rankedGroups = pools
        .map((p) => {
          const rows = standings[p.id] || [];
          const points = rows.reduce((sum, r) => sum + Number(r?.points || 0), 0);
          const pf = rows.reduce((sum, r) => sum + Number(r?.pf || 0), 0);
          const pa = rows.reduce((sum, r) => sum + Number(r?.pa || 0), 0);
          return { groupId: p.id, name: p.name || p.id, points, diff: pf - pa, pf };
        })
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.diff !== a.diff) return b.diff - a.diff;
          return b.pf - a.pf;
        });
      return rankedGroups[0]?.name || '-';
    }
    const winnerId = payload?.finalMatch?.winnerTeamId;
    if (!winnerId) return '-';
    const winnerTeam = (payload?.teams || []).find((tm) => tm.id === winnerId);
    return winnerTeam?.name || '-';
  };
  const getMatchDateTime = (row) => {
    const formatPrettyDateTime = (dateObj) => {
      const day = dateObj.getDate();
      const ordinal =
        day % 10 === 1 && day % 100 !== 11
          ? 'st'
          : day % 10 === 2 && day % 100 !== 12
            ? 'nd'
            : day % 10 === 3 && day % 100 !== 13
              ? 'rd'
              : 'th';
      const month = dateObj.toLocaleString('en-US', { month: 'long' });
      const year = dateObj.getFullYear();
      const time = dateObj.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${day}${ordinal} ${month} ${year} ${time}`;
    };

    const payload = row?.payload || {};
    const allMatches = [
      ...(payload?.groupMatches || []),
      ...(payload?.semiMatches || []),
      ...(payload?.finalMatch ? [payload.finalMatch] : []),
    ];
    const scheduled = allMatches
      .map((m) => m?.when)
      .filter(Boolean)
      .map((v) => new Date(v))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (scheduled.length > 0) return formatPrettyDateTime(scheduled[0]);
    if (payload?.eventDate) {
      const d = new Date(`${payload.eventDate}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return formatPrettyDateTime(d);
      return payload.eventDate;
    }
    return '-';
  };
  const getMatchSideName = (match, teamsById, side) => {
    if (side === 'A') return match?.teamADisplay || teamsById[match?.teamAId || '']?.name || 'TBD';
    return match?.teamBDisplay || teamsById[match?.teamBId || '']?.name || 'TBD';
  };
  const withWinnerTrophy = (match, side, label) => {
    if (match?.status !== 'Completed' || !match?.winnerTeamId) return label;
    const isWinner =
      side === 'A'
        ? match.winnerTeamId === match.teamAId
        : match.winnerTeamId === match.teamBId;
    return isWinner ? `🏆 ${label}` : label;
  };

  return (
    <section className="space-y-4">
      {(appError || tournamentsError) && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {appError || tournamentsError}
        </div>
      )}

      {showListView && (
        <>
          <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="font-semibold">All Tournaments</div>
              <button
                className="px-3 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                onClick={refreshTournamentsList}
              >
                Refresh
              </button>
            </div>
            {tournamentsLoading ? (
              <div className="text-sm text-slate-500">Loading tournaments...</div>
            ) : tournamentsList.length === 0 ? (
              <div className="text-sm text-slate-500">No tournaments found.</div>
            ) : (
              <div className="space-y-3">
                <div className="sm:hidden space-y-3">
                  {orderedTournaments.map((row) => (
                    <div key={row.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          className="font-semibold text-left hover:underline"
                          onClick={() => onOpenTournamentDetails?.(row.id)}
                        >
                          {row.name}
                        </button>
                        <span
                          className={`text-xs rounded-full border px-2 py-0.5 ${getTournamentStatusBadgeClass(
                            row.status
                          )}`}
                        >
                          {row.status || 'Upcoming'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Match: {getMatchDateTime(row)}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {row.status === 'Completed' ? (
                          <div className="w-full px-2 py-1.5 rounded border bg-slate-50 text-sm">
                            Winner: <span className="font-medium">{getWinnerTeamName(row)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={() => onOpenTournamentFixture(row.id)}
                        >
                          Fixture
                        </button>
                        <button
                          className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={() => openTournamentLiveView(row.id, 'matches')}
                        >
                          Matches
                        </button>
                        <button
                          className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={() => openTournamentLiveView(row.id, 'points')}
                        >
                          Points
                        </button>
                        {canDeleteTournament?.(row) && (
                          <button
                            className="px-2 py-1.5 rounded-lg border text-red-700 hover:bg-red-50 text-sm"
                            onClick={() => handleTournamentDelete(row)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="p-2">Name</th>
                        <th className="p-2">Winner</th>
                        <th className="p-2">Match Date & Time</th>
                        <th className="p-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderedTournaments.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-2">
                            <button
                              className="text-left hover:underline"
                              onClick={() => onOpenTournamentDetails?.(row.id)}
                            >
                              {row.name}
                            </button>
                          </td>
                          <td className="p-2">
                            <span className="text-sm font-medium">
                              {row.status === 'Completed' ? getWinnerTeamName(row) : '-'}
                            </span>
                          </td>
                          <td className="p-2">
                            {getMatchDateTime(row)}
                          </td>
                          <td className="p-2 text-right">
                            <div className="inline-flex flex-wrap gap-2 justify-end">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${getTournamentStatusBadgeClass(
                                  row.status
                                )}`}
                              >
                                {row.status || 'Upcoming'}
                              </span>
                              <button
                                className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                onClick={() => onOpenTournamentFixture(row.id)}
                              >
                                Open Fixture
                              </button>
                              {canDeleteTournament?.(row) && (
                                <button
                                  className="px-2 py-1 rounded-lg border text-red-700 hover:bg-red-50"
                                  onClick={() => handleTournamentDelete(row)}
                                >
                                  Delete
                                </button>
                              )}
                              <button
                                className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                onClick={() => openTournamentLiveView(row.id, 'matches')}
                              >
                                Matches
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                onClick={() => openTournamentLiveView(row.id, 'points')}
                              >
                                Point Table
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {tournamentView === 'matches' && selectedTournament && (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="font-semibold text-lg">Matches - {selectedTournament.name}</div>
              <div className="text-sm text-slate-500">View match status and open details.</div>
            </div>
            <button
              className="px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={() => setTournamentView('list')}
            >
              Back
            </button>
          </div>

          <div className="space-y-3">
            <div className="sm:hidden space-y-3">
              {getOrderedMatches(selectedTournament).map((m, idx) => {
                const teamsById = Object.fromEntries(
                  (selectedTournament.teams || []).map((tm) => [tm.id, tm])
                );
                const teamA = withWinnerTrophy(m, 'A', getMatchSideName(m, teamsById, 'A'));
                const teamB = withWinnerTrophy(m, 'B', getMatchSideName(m, teamsById, 'B'));
                return (
                  <div
                    key={`${m.stage}-${m.id}`}
                    className="rounded-lg border p-3 cursor-pointer"
                    onClick={() => openMatchTracking({ stage: m.stage, id: m.id })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs text-slate-500">{m.stage}</div>
                      <div
                        className={`text-xs rounded-full border px-2 py-0.5 ${getMatchStatusBadgeClass(
                          m.status
                        )}`}
                      >
                        {getMatchStatusLabel(m.status)}
                      </div>
                    </div>
                    <div className="mt-1 font-medium text-sm">
                      {m.label || `Match ${idx + 1}`}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {teamA} vs {teamB}
                    </div>
                    <div className="mt-1 text-sm">
                      Score: {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                    </div>
                    <div className="mt-3">
                      {m.status !== 'Completed' && m.status !== 'Live' ? (
                        <button
                          className="w-full px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMatchTracking({ stage: m.stage, id: m.id }, 'start');
                          }}
                        >
                          Start
                        </button>
                      ) : (
                        <button
                          className="w-full px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openMatchTracking({ stage: m.stage, id: m.id });
                          }}
                        >
                          {m.status === 'Live' ? 'Open' : 'View'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden sm:block overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="p-2">Stage</th>
                    <th className="p-2">Match</th>
                    <th className="p-2">Score</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {getOrderedMatches(selectedTournament).map((m, idx) => {
                    const teamsById = Object.fromEntries(
                      (selectedTournament.teams || []).map((tm) => [tm.id, tm])
                    );
                    const teamA = withWinnerTrophy(m, 'A', getMatchSideName(m, teamsById, 'A'));
                    const teamB = withWinnerTrophy(m, 'B', getMatchSideName(m, teamsById, 'B'));
                    return (
                      <tr
                        key={`${m.stage}-${m.id}`}
                        className="border-t cursor-pointer hover:bg-slate-50"
                        onClick={() => openMatchTracking({ stage: m.stage, id: m.id })}
                      >
                        <td className="p-2">{m.stage}</td>
                        <td className="p-2">
                          {m.label || `Match ${idx + 1}`} ({teamA} vs {teamB})
                        </td>
                        <td className="p-2">
                          {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                        </td>
                        <td className="p-2">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs rounded-full border ${getMatchStatusBadgeClass(
                              m.status
                            )}`}
                          >
                            {getMatchStatusLabel(m.status)}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          {m.status !== 'Completed' && m.status !== 'Live' ? (
                            <button
                              className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMatchTracking({ stage: m.stage, id: m.id }, 'start');
                              }}
                            >
                              Start
                            </button>
                          ) : (
                            <button
                              className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                openMatchTracking({ stage: m.stage, id: m.id });
                              }}
                            >
                              {m.status === 'Live' ? 'Open' : 'View'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tournamentView === 'match' && selectedTournament && selectedMatchRef && (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
          {(() => {
            const match = findMatchByRef(selectedTournament, selectedMatchRef);
            if (!match) return <div className="text-sm text-slate-500">Match not found.</div>;
            const isCompletedTournamentLocked =
              selectedTournament?.status === 'Completed' && !isAdminUser;
            const teamsById = Object.fromEntries(
              (selectedTournament.teams || []).map((tm) => [tm.id, tm])
            );
            const playersById = Object.fromEntries(
              (selectedTournament.players || []).map((pl) => [pl.id, pl])
            );
            const teamA = teamsById[match.teamAId || ''];
            const teamB = teamsById[match.teamBId || ''];
            const teamAName = getMatchSideName(match, teamsById, 'A');
            const teamBName = getMatchSideName(match, teamsById, 'B');
            const teamANameWithWinner = withWinnerTrophy(match, 'A', teamAName);
            const teamBNameWithWinner = withWinnerTrophy(match, 'B', teamBName);
            const teamAPlayers = match?.teamAPlayerIds
              ? match.teamAPlayerIds.map((pid) => playersById[pid]?.name).filter(Boolean).join(', ')
              : (teamA?.players || []).map((pid) => playersById[pid]?.name).filter(Boolean).join(', ');
            const teamBPlayers = match?.teamBPlayerIds
              ? match.teamBPlayerIds.map((pid) => playersById[pid]?.name).filter(Boolean).join(', ')
              : (teamB?.players || []).map((pid) => playersById[pid]?.name).filter(Boolean).join(', ');
            const normalizeScore = (value) => {
              if (value === '' || value == null) return null;
              const n = Number(value);
              return Number.isFinite(n) ? n : null;
            };
            const syncWinnerAndStatus = (nextScoreA, nextScoreB) => {
              const a = normalizeScore(nextScoreA);
              const b = normalizeScore(nextScoreB);
              if (a == null || b == null) {
                setMatchStatus('Pending');
                setMatchWinnerId('');
                return;
              }
              if (a > b) {
                setMatchStatus('Completed');
                setMatchWinnerId(match.teamAId || '');
                return;
              }
              if (b > a) {
                setMatchStatus('Completed');
                setMatchWinnerId(match.teamBId || '');
                return;
              }
              setMatchStatus('Pending');
              setMatchWinnerId('');
            };
            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-lg">
                      Track Match - {match.label || selectedMatchRef.stage}
                    </div>
                    {/* <div className="text-sm text-slate-500">
                      {isCompletedTournamentLocked
                        ? 'Completed tournament: view only. Only admin can edit scores.'
                        : 'Update score and winner for this match.'}
                    </div> */}
                  </div>
                  <button
                    className="px-3 py-2 rounded-lg border hover:bg-slate-100"
                    onClick={() => setTournamentView('matches')}
                  >
                    Back
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{teamANameWithWinner}</div>
                      <input
                        type="number"
                        className="w-24 px-3 py-2 border rounded-lg text-right"
                        placeholder="Score"
                        value={matchScoreA}
                        disabled={isCompletedTournamentLocked}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMatchScoreA(v);
                          syncWinnerAndStatus(v, matchScoreB);
                        }}
                      />
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Players: {teamAPlayers || '-'}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{teamBNameWithWinner}</div>
                      <input
                        type="number"
                        className="w-24 px-3 py-2 border rounded-lg text-right"
                        placeholder="Score"
                        value={matchScoreB}
                        disabled={isCompletedTournamentLocked}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMatchScoreB(v);
                          syncWinnerAndStatus(matchScoreA, v);
                        }}
                      />
                    </div>
                    <div className="text-sm text-slate-500 mt-1">Players: {teamBPlayers || '-'}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-500">Status:</span>
                      <span
                        className={`px-2 py-1 rounded-full border text-xs ${getMatchStatusBadgeClass(
                          matchStatus
                        )}`}
                      >
                        {getMatchStatusLabel(matchStatus)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-500">Winner:</span>
                      <span className="font-medium">
                        {matchWinnerId === (match.teamAId || '')
                          ? teamAName
                          : matchWinnerId === (match.teamBId || '')
                            ? teamBName
                            : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={saveMatchTracking}
                    disabled={savingMatch || isCompletedTournamentLocked}
                  >
                    {savingMatch ? 'Saving...' : 'Save Match'}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {tournamentView === 'points' && selectedTournament && (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="font-semibold text-lg">Point Table - {selectedTournament.name}</div>
              <div className="text-sm text-slate-500">Standings by group for this tournament.</div>
            </div>
            <button
              className="px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={() => setTournamentView('list')}
            >
              Back
            </button>
          </div>
          {(() => {
            const standings = computeStandings(
              selectedTournament.pools || [],
              selectedTournament.teams || [],
              selectedTournament.groupMatches || [],
              selectedTournament.pointSystem || {}
            );
            const areAllGroupMatchesCompleted =
              (selectedTournament.groupMatches || []).length > 0 &&
              (selectedTournament.groupMatches || []).every((m) => m?.status === 'Completed');
            const knockoutPointsByTeam = {};
            const semiMatches = selectedTournament.semiMatches || [];
            const finalMatch = selectedTournament.finalMatch;
            const teams = selectedTournament.teams || [];
            const teamsById = Object.fromEntries(teams.map((tm) => [tm.id, tm]));
            const pools = selectedTournament.pools || [];

            semiMatches.forEach((m) => {
              if (m?.status === 'Completed' && m?.winnerTeamId) {
                const prev = knockoutPointsByTeam[m.winnerTeamId] || {
                  semiPoints: 0,
                  finalPoints: 0,
                };
                knockoutPointsByTeam[m.winnerTeamId] = {
                  ...prev,
                  semiPoints: prev.semiPoints + 2,
                };
              }
            });

            if (finalMatch?.status === 'Completed' && finalMatch?.winnerTeamId) {
              const prev = knockoutPointsByTeam[finalMatch.winnerTeamId] || {
                semiPoints: 0,
                finalPoints: 0,
              };
              knockoutPointsByTeam[finalMatch.winnerTeamId] = {
                ...prev,
                finalPoints: prev.finalPoints + 2,
              };
            }

            const qualifiedTeamIds = (() => {
              const idsFromSemis = [
                ...new Set(
                  semiMatches
                    .flatMap((m) => [m?.teamAId, m?.teamBId])
                    .filter(Boolean)
                ),
              ];
              if (idsFromSemis.length > 0) return idsFromSemis;

              // Fallback: derive qualifiers from group standings (top 2 each group, or top 4 for single group).
              if (pools.length === 1) {
                const onlyPool = pools[0];
                return (standings[onlyPool.id] || []).slice(0, 4).map((r) => r.teamId);
              }
              return pools.flatMap((p) =>
                (standings[p.id] || []).slice(0, 2).map((r) => r.teamId)
              );
            })();

            const knockoutRows = qualifiedTeamIds
              .map((teamId) => teamsById[teamId])
              .filter(Boolean)
              .map((team) => {
                const ko = knockoutPointsByTeam[team.id] || {
                  semiPoints: 0,
                  finalPoints: 0,
                };
                return {
                  teamId: team.id,
                  teamName: team.name,
                  semiPoints: ko.semiPoints,
                  finalPoints: ko.finalPoints,
                  totalKnockout: ko.semiPoints + ko.finalPoints,
                };
              })
              .sort((a, b) => {
                if (b.semiPoints !== a.semiPoints) return b.semiPoints - a.semiPoints;
                if (b.finalPoints !== a.finalPoints) return b.finalPoints - a.finalPoints;
                return a.teamName.localeCompare(b.teamName);
              });

            return (
              <div className="space-y-4">
                <div className="rounded-xl border p-4 bg-white">
                  <div className="font-semibold mb-2">Group Points</div>
                  {pools.length === 0 ? (
                    <div className="text-sm text-slate-500">No groups available.</div>
                  ) : (
                    (() => {
                      const rows = pools.map((p, idx) => {
                        const groupRows = standings[p.id] || [];
                        return {
                          id: p.id,
                          name: p.name || `Group ${idx + 1}`,
                          points: groupRows.reduce((sum, r) => sum + Number(r?.points || 0), 0),
                          played: groupRows.reduce((sum, r) => sum + Number(r?.played || 0), 0),
                          won: groupRows.reduce((sum, r) => sum + Number(r?.won || 0), 0),
                        };
                      }).sort((a, b) => {
                        if (b.points !== a.points) return b.points - a.points;
                        if (b.won !== a.won) return b.won - a.won;
                        if (a.played !== b.played) return a.played - b.played;
                        return a.name.localeCompare(b.name);
                      });
                      return (
                        <>
                          <div className="sm:hidden space-y-2">
                            {rows.map((row) => (
                              <div key={row.id} className="rounded-lg border p-2.5">
                                <div className="font-medium text-sm">{row.name}</div>
                                <div className="text-xs text-slate-500 mt-1">
                                  Pts: {row.points} | Played: {row.played} | Won: {row.won}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-slate-500">
                                  <th className="py-2 pr-2">Group</th>
                                  <th className="py-2">Points</th>
                                  <th className="py-2">Played</th>
                                  <th className="py-2">Won</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((row) => (
                                  <tr key={row.id} className="border-t">
                                    <td className="py-2 pr-2">{row.name}</td>
                                    <td className="py-2">{row.points}</td>
                                    <td className="py-2">{row.played}</td>
                                    <td className="py-2">{row.won}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      );
                    })()
                  )}
                </div>

                {selectedTournament?.mode !== 'group' && (
                  <div className="rounded-xl border p-4 bg-white">
                    <div className="font-semibold mb-2">Knockout Points</div>
                    <div className="text-xs text-slate-500 mb-3">
                      Semifinal and Final points are tracked separately from group standings.
                    </div>
                    {!areAllGroupMatchesCompleted ? (
                      <div className="text-sm text-slate-500">
                        Knockout points will be available after all group matches are completed.
                      </div>
                    ) : knockoutRows.length === 0 ? (
                      <div className="text-sm text-slate-500">
                        No semifinal-qualified teams yet.
                      </div>
                    ) : (
                      <>
                        <div className="sm:hidden space-y-2">
                          {knockoutRows.map((row) => (
                            <div key={row.teamId} className="rounded-lg border p-2.5">
                              <div className="font-medium text-sm">{row.teamName}</div>
                              <div className="text-xs text-slate-500 mt-1">
                                SF: {row.semiPoints} | Final: {row.finalPoints} | Total: {row.totalKnockout}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-slate-500">
                                <th className="py-2 pr-2">Team</th>
                                <th className="py-2">Semifinal</th>
                                <th className="py-2">Final</th>
                                <th className="py-2">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {knockoutRows.map((row) => (
                                <tr key={row.teamId} className="border-t">
                                  <td className="py-2 pr-2">{row.teamName}</td>
                                  <td className="py-2">{row.semiPoints}</td>
                                  <td className="py-2">{row.finalPoints}</td>
                                  <td className="py-2 font-semibold">{row.totalKnockout}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}
