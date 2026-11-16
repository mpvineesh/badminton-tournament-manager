import React from 'react';
import { computeStandings } from '../utils/tournament.js';
import MatchScoringScreen from './MatchScoringScreen.jsx';
import TournamentMatchesList from './TournamentMatchesList.jsx';
import TournamentLeaderboard from './TournamentLeaderboard.jsx';

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
  getTournamentCreatorName,
  onOpenTournamentDetails,
  onOpenTournamentSettings,
  onOpenTournamentFixture,
  onOpenTournamentPredictions,
  onOpenTournamentFixtures,
  onOpenTournamentTv,
  onCreateTournament,
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
    return 'bg-slate-50 text-slate-700 dark:text-slate-200 border-slate-200';
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
      return String(a.label || '').localeCompare(String(b.label || ''), undefined, { numeric: true });
    });
  const getTournamentStatusSortPriority = (status) => {
    if (status === 'Live') return 0;
    if (status === 'Upcoming') return 1;
    if (status === 'Completed') return 2;
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
      if (payload?.format === 'team-match' && pools.length === 1) {
        const winnerId = standings[pools[0].id]?.[0]?.teamId;
        return teams.find((team) => team.id === winnerId)?.name || '-';
      }
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
  const isScorableMatch = (status) =>
    status === 'Live' || status === 'Upcoming' || status === 'Pending' || !status;
  const openMatchFromWidget = (match) => {
    if (!match?.id || !match?.stage) return;
    openMatchTracking(
      { stage: match.stage, id: match.id },
      isScorableMatch(match.status) ? (match.status === 'Live' ? 'open' : 'start') : 'open'
    );
  };
  const [serveSide, setServeSide] = React.useState('A');
  const [servePlayerA, setServePlayerA] = React.useState(0);
  const [servePlayerB, setServePlayerB] = React.useState(0);
  const [historyStack, setHistoryStack] = React.useState([]);
  const [quickScores, setQuickScores] = React.useState({});
  const [posterNotice, setPosterNotice] = React.useState('');

  const activeMatch =
    tournamentView === 'match' && selectedTournament && selectedMatchRef
      ? findMatchByRef(selectedTournament, selectedMatchRef)
      : null;

  React.useEffect(() => {
    if (!activeMatch) return;
    setServeSide(activeMatch?.servingSide === 'B' ? 'B' : 'A');
    setServePlayerA(Number(activeMatch?.servingPlayerIndexA) === 1 ? 1 : 0);
    setServePlayerB(Number(activeMatch?.servingPlayerIndexB) === 1 ? 1 : 0);
    setHistoryStack([]);
  }, [activeMatch?.id, selectedTournament?.id, tournamentView]);

  React.useEffect(() => {
    setQuickScores({});
  }, [selectedTournament?.id, tournamentView]);

  // Auto-save live scores (debounced) so a point is never lost when leaving the
  // scoring screen — including via the device back button — and the scoreboard
  // updates in near real time. Only writes when the score actually changed.
  React.useEffect(() => {
    if (tournamentView !== 'match' || !selectedMatchRef) return undefined;
    const stored = findMatchByRef(selectedTournament, selectedMatchRef);
    const changed =
      String(matchScoreA ?? '') !== String(stored?.scoreA ?? '') ||
      String(matchScoreB ?? '') !== String(stored?.scoreB ?? '');
    if (!changed) return undefined;
    const timer = setTimeout(() => {
      saveMatchTracking({
        scoreA: matchScoreA,
        scoreB: matchScoreB,
        servingSide: serveSide,
        servingPlayerIndexA: servePlayerA,
        servingPlayerIndexB: servePlayerB,
        silent: true,
      });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchScoreA, matchScoreB, serveSide, servePlayerA, servePlayerB, tournamentView, selectedMatchRef, selectedTournament]);

  const normalizeScoreValue = (value) => {
    if (value === '' || value == null) return null;
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.floor(n));
  };

  const computeOutcome = (match, scoreA, scoreB) => {
    const a = normalizeScoreValue(scoreA);
    const b = normalizeScoreValue(scoreB);
    if (a == null || b == null) return { winnerId: '', status: 'Live' };
    const diff = Math.abs(a - b);
    const maxScore = Math.max(a, b);
    if (maxScore >= 21 && diff >= 2) {
      if (a > b) return { winnerId: match?.teamAId || '', status: 'Completed' };
      if (b > a) return { winnerId: match?.teamBId || '', status: 'Completed' };
    }
    return { winnerId: '', status: 'Live' };
  };

  const buildPosterPrompt = (row) => {
    const payload = row?.payload || {};
    const teams = Array.isArray(payload?.teams) ? payload.teams : [];
    const pools = Array.isArray(payload?.pools) ? payload.pools : [];
    const teamsById = Object.fromEntries(teams.map((tm) => [tm.id, tm]));
    const matches = [
      ...(Array.isArray(payload?.groupMatches) ? payload.groupMatches : []),
      ...(Array.isArray(payload?.semiMatches) ? payload.semiMatches : []),
      ...(payload?.finalMatch ? [payload.finalMatch] : []),
    ];
    const teamLines = teams.slice(0, 24).map((tm, idx) => `${idx + 1}. ${tm?.name || `Team ${idx + 1}`}`);
    const groupLines = pools
      .map((pool, idx) => {
        const memberNames = (pool?.teamIds || [])
          .map((id) => String(teamsById[id]?.name || '').trim())
          .filter(Boolean);
        const groupName = String(pool?.name || `Group ${idx + 1}`).trim();
        return memberNames.length > 0
          ? `${groupName}: ${memberNames.join(', ')}`
          : `${groupName}: TBD`;
      })
      .slice(0, 12);
    const heroTitle = String(row?.name || payload?.name || 'Badminton Tournament').trim();
    const dateText = payload?.eventDate || row?.created_at || 'TBD';
    const statusText = row?.status || payload?.status || 'Upcoming';
    const modeText = payload?.mode || 'doubles';
    const matchesCount = matches.length;
    return [
      'Create a premium, modern badminton tournament poster. Below are the tournament details',
      `Tournament Name: Wihtefeather Badminton Tournament`,
      `Location: Whitefeather Indoor Court`,
      `Date: ${dateText}`,
      `Format: ${modeText}`,
      `Total Teams: ${teams.length}`,
      `Total Matches: ${matchesCount}`,
      '',
      'Visual style:',
      '- Dynamic sporty look, clean typography, high contrast',
      '- Add badminton shuttle/court accents',
      '- Keep composition readable for social media share',
      '',
      teamLines.length > 0 ? 'Teams list:' : 'Teams list: TBD',
      ...(teamLines.length > 0 ? teamLines : []),
      '',
      groupLines.length > 0 ? 'Groups and Members:' : 'Groups and Members: N/A',
      ...(groupLines.length > 0 ? groupLines : []),
      '',
      'Output:',
      '- One vertical poster (1080x1350)',
    ].join('\n');
  };

  const handlePosterPrompt = async (row) => {
    try {
      const prompt = buildPosterPrompt(row);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(prompt);
      }
      window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
      setPosterNotice('Poster prompt copied. ChatGPT opened in a new tab.');
    } catch {
      setPosterNotice('Could not auto-copy. Opened ChatGPT, please copy prompt manually.');
      window.open('https://chatgpt.com', '_blank', 'noopener,noreferrer');
    }
  };

  const quickScoreKey = (m) => `${m?.stage || 'X'}:${m?.id || 'Y'}`;
  const getQuickScore = (m, side) => {
    const key = quickScoreKey(m);
    const current = quickScores[key];
    if (current && Object.prototype.hasOwnProperty.call(current, side)) {
      return current[side];
    }
    if (side === 'a') return m?.scoreA ?? '';
    return m?.scoreB ?? '';
  };
  const setQuickScore = (m, side, value) => {
    const key = quickScoreKey(m);
    setQuickScores((prev) => ({
      ...prev,
      [key]: {
        a: Object.prototype.hasOwnProperty.call(prev[key] || {}, 'a') ? prev[key].a : (m?.scoreA ?? ''),
        b: Object.prototype.hasOwnProperty.call(prev[key] || {}, 'b') ? prev[key].b : (m?.scoreB ?? ''),
        [side]: value,
      },
    }));
  };

  return (
    <section className="space-y-4">
      {(appError || tournamentsError) && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {appError || tournamentsError}
        </div>
      )}
      {posterNotice && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {posterNotice}
        </div>
      )}

      {showListView && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="font-semibold">All Tournaments</div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdminUser && (
                  <button
                    className="px-3 py-1.5 rounded-lg border border-navy-300 bg-navy-50 text-navy-800 hover:bg-navy-100 text-sm disabled:opacity-50"
                    onClick={onCreateTournament}
                  >
                    Create tournament
                  </button>
                )}
                <button
                  className="px-3 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                  onClick={refreshTournamentsList}
                >
                  Refresh
                </button>
              </div>
            </div>
            {tournamentsLoading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">Loading tournaments...</div>
            ) : tournamentsList.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No tournaments found.</div>
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
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Match: {getMatchDateTime(row)}
                      </div>
                      <div className="mt-3 grid grid-cols-1 gap-2">
                        {row.status === 'Completed' ? (
                          <div className="w-full px-2 py-1.5 rounded border bg-slate-50 dark:bg-navy-800 text-sm">
                            Winner: <span className="font-medium">{getWinnerTeamName(row)}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {row?.payload?.format !== 'team-match' && (
                          <button
                            className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                            onClick={() => onOpenTournamentFixture(row.id)}
                          >
                            Fixture
                          </button>
                        )}
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
                          Leaderboard
                        </button>
                        <button
                          className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={() => onOpenTournamentPredictions?.(row.id)}
                        >
                          Predictions
                        </button>
                        <button
                          className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={() => onOpenTournamentFixtures?.(row.id)}
                        >
                          Fixtures
                        </button>
                        <button
                          className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                          onClick={() => onOpenTournamentTv?.(row.id)}
                          title="Big-screen dashboard for this tournament"
                        >
                          TV
                        </button>
                        {isAdminUser && (
                          <button
                            className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                            onClick={() => handlePosterPrompt(row)}
                          >
                            Poster
                          </button>
                        )}
                        {isAdminUser && (
                          <button
                            className="px-2 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                            onClick={() => onOpenTournamentSettings?.(row.id)}
                          >
                            Settings
                          </button>
                        )}
                        {canDeleteTournament?.(row) && (
                          <button
                            className="px-2 py-1.5 rounded-lg border text-red-700 hover:bg-red-50 text-sm"
                            onClick={() => handleTournamentDelete(row)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      {isAdminUser && (
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 text-right">
                          Created by: {getTournamentCreatorName?.(row) || 'Unknown'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-navy-800 text-left text-slate-500 dark:text-slate-400">
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
                            {isAdminUser && (
                              <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 text-right">
                                Created by: {getTournamentCreatorName?.(row) || 'Unknown'}
                              </div>
                            )}
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
                              {row?.payload?.format !== 'team-match' && (
                                <button
                                  className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                  onClick={() => onOpenTournamentFixture(row.id)}
                                >
                                  Open Fixture
                                </button>
                              )}
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
                                Leaderboard
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                onClick={() => onOpenTournamentPredictions?.(row.id)}
                              >
                                Predictions
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                onClick={() => onOpenTournamentFixtures?.(row.id)}
                              >
                                Fixtures
                              </button>
                              <button
                                className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                onClick={() => onOpenTournamentTv?.(row.id)}
                                title="Big-screen dashboard for this tournament"
                              >
                                TV
                              </button>
                              {isAdminUser && (
                                <button
                                  className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                  onClick={() => handlePosterPrompt(row)}
                                >
                                  Poster Prompt
                                </button>
                              )}
                              {isAdminUser && (
                                <button
                                  className="px-2 py-1 rounded-lg border hover:bg-slate-100"
                                  onClick={() => onOpenTournamentSettings?.(row.id)}
                                >
                                  Settings
                                </button>
                              )}
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
        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          <TournamentMatchesList
            tournament={selectedTournament}
            matches={getOrderedMatches(selectedTournament)}
            onBack={() => setTournamentView('list')}
            onOpenMatch={openMatchFromWidget}
            isScorable={isScorableMatch}
            getQuickScore={getQuickScore}
            setQuickScore={setQuickScore}
            onQuickSave={(m, scores) =>
              saveMatchTracking({
                ref: { stage: m.stage, id: m.id },
                scoreA: scores ? scores.a : getQuickScore(m, 'a'),
                scoreB: scores ? scores.b : getQuickScore(m, 'b'),
              })
            }
            saving={savingMatch}
            canEditCompleted={isAdminUser}
          />
        </div>
      )}

      {tournamentView === 'match' && selectedTournament && selectedMatchRef && (
        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          {(() => {
            const match = findMatchByRef(selectedTournament, selectedMatchRef);
            if (!match) return <div className="text-sm text-slate-500 dark:text-slate-400">Match not found.</div>;

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
            const teamAName = withWinnerTrophy(match, 'A', getMatchSideName(match, teamsById, 'A'));
            const teamBName = withWinnerTrophy(match, 'B', getMatchSideName(match, teamsById, 'B'));
            const teamAPlayers = (
              match?.teamAPlayerIds?.length
                ? match.teamAPlayerIds
                : (teamA?.players || [])
            )
              .map((pid) => playersById[pid]?.name)
              .filter(Boolean);
            const teamBPlayers = (
              match?.teamBPlayerIds?.length
                ? match.teamBPlayerIds
                : (teamB?.players || [])
            )
              .map((pid) => playersById[pid]?.name)
              .filter(Boolean);

            const pushHistory = () => {
              setHistoryStack((prev) => [
                ...prev,
                {
                  scoreA: matchScoreA,
                  scoreB: matchScoreB,
                  winnerId: matchWinnerId,
                  status: matchStatus,
                  serving: serveSide,
                  servingPlayerA: servePlayerA,
                  servingPlayerB: servePlayerB,
                },
              ]);
            };

            const applyScores = (nextA, nextB) => {
              setMatchScoreA(nextA);
              setMatchScoreB(nextB);
              const outcome = computeOutcome(match, nextA, nextB);
              setMatchWinnerId(outcome.winnerId);
              setMatchStatus(outcome.status);
            };

            const incrementPoint = (side) => {
              if (isCompletedTournamentLocked || savingMatch) return;
              pushHistory();
              const a = normalizeScoreValue(matchScoreA) ?? 0;
              const b = normalizeScoreValue(matchScoreB) ?? 0;
              if (side === 'A') applyScores(a + 1, b);
              else applyScores(a, b + 1);
              if (side !== serveSide) {
                setServeSide(side);
                if (side === 'A') {
                  setServePlayerA((prev) => (teamAPlayers.length > 1 ? (prev === 0 ? 1 : 0) : 0));
                } else {
                  setServePlayerB((prev) => (teamBPlayers.length > 1 ? (prev === 0 ? 1 : 0) : 0));
                }
              }
            };

            const undoLast = () => {
              if (isCompletedTournamentLocked || savingMatch) return;
              setHistoryStack((prev) => {
                if (prev.length === 0) return prev;
                const last = prev[prev.length - 1];
                setMatchScoreA(last.scoreA);
                setMatchScoreB(last.scoreB);
                setMatchWinnerId(last.winnerId);
                setMatchStatus(last.status);
                setServeSide(last.serving === 'B' ? 'B' : 'A');
                setServePlayerA(Number(last.servingPlayerA) === 1 ? 1 : 0);
                setServePlayerB(Number(last.servingPlayerB) === 1 ? 1 : 0);
                return prev.slice(0, -1);
              });
            };

            const changeServe = () => {
              if (isCompletedTournamentLocked || savingMatch) return;
              pushHistory();
              const scoreAValue = normalizeScoreValue(matchScoreA) ?? 0;
              const scoreBValue = normalizeScoreValue(matchScoreB) ?? 0;
              const isPregame = scoreAValue === 0 && scoreBValue === 0;

              if (isPregame) {
                const options = [];
                if (teamAPlayers.length > 0) {
                  options.push({ side: 'A', idx: 0 });
                  if (teamAPlayers.length > 1) options.push({ side: 'A', idx: 1 });
                }
                if (teamBPlayers.length > 0) {
                  options.push({ side: 'B', idx: 0 });
                  if (teamBPlayers.length > 1) options.push({ side: 'B', idx: 1 });
                }
                if (options.length > 0) {
                  const currentIdx =
                    serveSide === 'A'
                      ? Number(servePlayerA) === 1 ? 1 : 0
                      : Number(servePlayerB) === 1 ? 1 : 0;
                  const currentOptionIndex = options.findIndex(
                    (opt) => opt.side === serveSide && opt.idx === currentIdx
                  );
                  const nextOption =
                    options[(currentOptionIndex >= 0 ? currentOptionIndex + 1 : 0) % options.length];
                  setServeSide(nextOption.side);
                  if (nextOption.side === 'A') setServePlayerA(nextOption.idx);
                  else setServePlayerB(nextOption.idx);
                  return;
                }
              }

              setServeSide((prev) => {
                const next = prev === 'A' ? 'B' : 'A';
                if (next === 'A') {
                  setServePlayerA((p) => (teamAPlayers.length > 1 ? (p === 0 ? 1 : 0) : 0));
                } else {
                  setServePlayerB((p) => (teamBPlayers.length > 1 ? (p === 0 ? 1 : 0) : 0));
                }
                return next;
              });
            };

            return (
              <MatchScoringScreen
                key={selectedMatchRef?.id || 'match'}
                title={`${match.label || `${selectedMatchRef.stage} Match`} | ${selectedTournament.name}`}
                statusLabel={getMatchStatusLabel(matchStatus || match.status)}
                teamAName={teamAName}
                teamBName={teamBName}
                teamAPlayers={teamAPlayers}
                teamBPlayers={teamBPlayers}
                scoreA={matchScoreA}
                scoreB={matchScoreB}
                servingSide={serveSide}
                servingPlayerIndexA={servePlayerA}
                servingPlayerIndexB={servePlayerB}
                onPointA={() => incrementPoint('A')}
                onPointB={() => incrementPoint('B')}
                onUndo={undoLast}
                onChangeServe={changeServe}
                onNextGame={() =>
                  saveMatchTracking({
                    servingSide: serveSide,
                    servingPlayerIndexA: servePlayerA,
                    servingPlayerIndexB: servePlayerB,
                  })
                }
                onBack={() => {
                  if (isCompletedTournamentLocked) {
                    setTournamentView('matches');
                  } else {
                    saveMatchTracking({
                      servingSide: serveSide,
                      servingPlayerIndexA: servePlayerA,
                      servingPlayerIndexB: servePlayerB,
                    });
                  }
                }}
                saving={savingMatch}
                locked={isCompletedTournamentLocked}
              />
            );
          })()}
        </div>
      )}

      {tournamentView === 'points' && selectedTournament && (
        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          <TournamentLeaderboard tournament={selectedTournament} onBack={() => setTournamentView('list')} />
        </div>
      )}
    </section>
  );
}
