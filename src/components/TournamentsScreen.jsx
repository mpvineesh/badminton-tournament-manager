import React from 'react';
import { computeStandings } from '../utils/tournament.js';
import MatchScoringScreen from './MatchScoringScreen.jsx';

function fmtDiff(n) {
  const v = Number(n) || 0;
  return v > 0 ? `+${v}` : `${v}`;
}
function diffColorClass(n) {
  const v = Number(n) || 0;
  if (v > 0) return 'text-emerald-600 dark:text-emerald-400';
  if (v < 0) return 'text-rose-600 dark:text-rose-400';
  return 'text-slate-400';
}
function RankBadge({ rank }) {
  const styles = {
    1: 'bg-gold-400 text-navy-900',
    2: 'bg-slate-300 text-slate-800',
    3: 'bg-amber-700/80 text-white',
  };
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
        styles[rank] || 'bg-slate-100 text-slate-500 dark:bg-navy-800 dark:text-slate-300'
      }`}
    >
      {rank}
    </span>
  );
}

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
  onCreateTeamTournament,
  creatingTeamTournament = false,
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
      return String(a.label || '').localeCompare(String(b.label || ''));
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
                    onClick={onCreateTeamTournament}
                    disabled={creatingTeamTournament}
                  >
                    {creatingTeamTournament ? 'Creating…' : 'Create team tournament'}
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="font-semibold text-lg">Matches</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{selectedTournament.name}</div>
            </div>
            <button
              className="btn-ghost"
              onClick={() => setTournamentView('list')}
            >
              Back
            </button>
          </div>

          {(() => {
            const all = getOrderedMatches(selectedTournament);
            if (all.length === 0) {
              return (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-navy-700 py-12 text-center">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">No matches yet</div>
                  <p className="mt-1 text-xs text-slate-400">Generate fixtures to see matches here.</p>
                </div>
              );
            }
            const teamsById = Object.fromEntries(
              (selectedTournament.teams || []).map((tm) => [tm.id, tm])
            );
            const stageMeta = {
              Group: { label: 'Group Stage', dot: 'bg-navy-500' },
              Semifinal: { label: 'Semifinals', dot: 'bg-amber-500' },
              Final: { label: 'Final', dot: 'bg-gold-500' },
            };
            const order = ['Group', 'Semifinal', 'Final'];
            const grouped = all.reduce((acc, m) => {
              (acc[m.stage] = acc[m.stage] || []).push(m);
              return acc;
            }, {});
            const stages = [
              ...order.filter((s) => grouped[s]),
              ...Object.keys(grouped).filter((s) => !order.includes(s)),
            ];
            let counter = 0;
            return stages.map((stage) => (
              <section key={stage} className="mt-5 first:mt-2">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span className={`h-2 w-2 rounded-full ${(stageMeta[stage] || {}).dot || 'bg-slate-400'}`} />
                  {(stageMeta[stage] || {}).label || stage}
                  <span className="font-normal text-slate-400">· {grouped[stage].length}</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {grouped[stage].map((m) => {
                    counter += 1;
                    const teamA = withWinnerTrophy(m, 'A', getMatchSideName(m, teamsById, 'A'));
                    const teamB = withWinnerTrophy(m, 'B', getMatchSideName(m, teamsById, 'B'));
                    const winnerA = m.winnerTeamId && m.winnerTeamId === m.teamAId;
                    const winnerB = m.winnerTeamId && m.winnerTeamId === m.teamBId;
                    const live = m.status === 'Live';
                    const accent = live
                      ? 'border-l-4 border-l-orange-400'
                      : m.status === 'Completed'
                        ? 'border-l-4 border-l-emerald-400'
                        : 'border-l-4 border-l-slate-200 dark:border-l-navy-700';
                    const scorable = isScorableMatch(m.status);
                    return (
                      <div
                        key={`${m.stage}-${m.id}`}
                        className={`min-w-0 rounded-xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-sm ${accent}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {m.label || `Match ${counter}`}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${getMatchStatusBadgeClass(m.status)}`}
                          >
                            {live && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />}
                            {getMatchStatusLabel(m.status)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className={`min-w-0 flex-1 truncate text-right text-sm font-semibold ${winnerA ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}
                          >
                            {teamA}
                          </div>
                          <div className="shrink-0 rounded-lg bg-slate-100 dark:bg-navy-800 px-2.5 py-1 text-sm font-bold tabular-nums text-navy-800 dark:text-slate-100">
                            {m.scoreA ?? '–'}
                            <span className="px-1 text-slate-400">:</span>
                            {m.scoreB ?? '–'}
                          </div>
                          <div
                            className={`min-w-0 flex-1 truncate text-sm font-semibold ${winnerB ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}
                          >
                            {teamB}
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5">
                          {scorable && (
                            <>
                              <input
                                type="number"
                                min={0}
                                value={getQuickScore(m, 'a')}
                                onChange={(e) => setQuickScore(m, 'a', e.target.value)}
                                className="w-11 min-w-0 shrink-0 rounded-lg border px-1.5 py-1 text-center text-sm"
                                placeholder="A"
                              />
                              <input
                                type="number"
                                min={0}
                                value={getQuickScore(m, 'b')}
                                onChange={(e) => setQuickScore(m, 'b', e.target.value)}
                                className="w-11 min-w-0 shrink-0 rounded-lg border px-1.5 py-1 text-center text-sm"
                                placeholder="B"
                              />
                              <button
                                className="rounded-lg border border-slate-300 dark:border-navy-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-navy-800 disabled:opacity-60"
                                onClick={() =>
                                  saveMatchTracking({
                                    ref: { stage: m.stage, id: m.id },
                                    scoreA: getQuickScore(m, 'a'),
                                    scoreB: getQuickScore(m, 'b'),
                                  })
                                }
                                disabled={savingMatch}
                              >
                                {savingMatch ? '…' : 'Save'}
                              </button>
                            </>
                          )}
                          <button
                            className={`min-w-0 flex-1 truncate rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${scorable ? 'bg-navy-700 hover:bg-navy-600' : 'bg-slate-500 hover:bg-slate-600'}`}
                            onClick={() => openMatchFromWidget(m)}
                          >
                            {scorable ? 'Live scoring' : 'View'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ));
          })()}
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="font-semibold text-lg">Point Table - {selectedTournament.name}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Standings by group for this tournament.</div>
            </div>
            <button
              className="btn-ghost"
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
                <div className="rounded-xl border p-4 bg-white dark:bg-navy-900">
                  <div className="font-semibold mb-2">Group Points</div>
                  {pools.length === 0 ? (
                    <div className="text-sm text-slate-500 dark:text-slate-400">No groups available.</div>
                  ) : (
                    selectedTournament?.mode === 'group' &&
                    selectedTournament?.format !== 'team-match' ? (
                      (() => {
                        const groupRows = pools
                          .map((p, idx) => {
                            const rows = standings[p.id] || [];
                            const groupPoints = rows.reduce((sum, r) => sum + Number(r?.points || 0), 0);
                            const played = rows.reduce((sum, r) => sum + Number(r?.played || 0), 0);
                            const won = rows.reduce((sum, r) => sum + Number(r?.won || 0), 0);
                            const lost = rows.reduce(
                              (sum, r) =>
                                sum +
                                (Number(r?.lost ?? Math.max(0, Number(r?.played || 0) - Number(r?.won || 0))) || 0),
                              0
                            );
                            const pointDiff = rows.reduce(
                              (sum, r) => sum + (Number(r?.pf || 0) - Number(r?.pa || 0)),
                              0
                            );
                            return {
                              id: p.id,
                              groupName: p.name || `Group ${idx + 1}`,
                              points: groupPoints,
                              won,
                              lost,
                              pointDiff,
                            };
                          })
                          .sort((a, b) => {
                            if (b.points !== a.points) return b.points - a.points;
                            if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
                            return a.groupName.localeCompare(b.groupName);
                          });
                        return (
                          <>
                            <div className="sm:hidden space-y-2">
                              {groupRows.map((row, i) => (
                                <div
                                  key={row.id}
                                  className={`flex items-center gap-3 rounded-xl border p-2.5 ${i === 0 ? 'border-gold-300 bg-gold-50 dark:border-navy-700 dark:bg-navy-800' : 'border-slate-200 dark:border-navy-700'}`}
                                >
                                  <RankBadge rank={i + 1} />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{row.groupName}</div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.won}W · {row.lost}L</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold tabular-nums text-navy-800 dark:text-slate-100">{row.points}</div>
                                    <div className={`text-[11px] font-medium ${diffColorClass(row.pointDiff)}`}>{fmtDiff(row.pointDiff)}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-700">
                              <table className="w-full text-sm">
                                <thead className="bg-navy-800 text-left text-xs uppercase tracking-wide text-navy-50">
                                  <tr>
                                    <th className="py-2 pl-3 pr-2">#</th>
                                    <th className="py-2 pr-2">Group</th>
                                    <th className="py-2 pr-2 text-center">Pts</th>
                                    <th className="py-2 pr-2 text-center">W</th>
                                    <th className="py-2 pr-2 text-center">L</th>
                                    <th className="py-2 pr-3 text-center">Diff</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {groupRows.map((row, i) => (
                                    <tr key={row.id} className={`border-t border-slate-100 dark:border-navy-800 ${i === 0 ? 'bg-gold-50/70 dark:bg-navy-800/60' : ''}`}>
                                      <td className="py-2 pl-3 pr-2"><RankBadge rank={i + 1} /></td>
                                      <td className="py-2 pr-2 font-medium text-slate-800 dark:text-slate-100">{row.groupName}</td>
                                      <td className="py-2 pr-2 text-center font-bold tabular-nums text-navy-800 dark:text-slate-100">{row.points}</td>
                                      <td className="py-2 pr-2 text-center tabular-nums">{row.won}</td>
                                      <td className="py-2 pr-2 text-center tabular-nums">{row.lost}</td>
                                      <td className={`py-2 pr-3 text-center font-medium tabular-nums ${diffColorClass(row.pointDiff)}`}>{fmtDiff(row.pointDiff)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      (() => {
                      const poolTables = pools.map((p, idx) => ({
                        id: p.id,
                        name: p.name || `Group ${idx + 1}`,
                        rows: (standings[p.id] || [])
                          .map((r) => ({
                            id: `${p.id}-${r.teamId}`,
                            teamName: teamsById[r.teamId]?.name || r.teamId,
                            points: Number(r?.points || 0),
                            played: Number(r?.played || 0),
                            won: Number(r?.won || 0),
                            pointDiff: Number(r?.pf || 0) - Number(r?.pa || 0),
                          }))
                          .sort((a, b) => {
                            if (b.points !== a.points) return b.points - a.points;
                            if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
                            if (b.won !== a.won) return b.won - a.won;
                            return a.teamName.localeCompare(b.teamName);
                          }),
                      }));
                      return (
                        <div className="space-y-4">
                          {poolTables.map((pool) => (
                            <div key={pool.id}>
                              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-navy-500" />
                                {pool.name}
                                <span className="font-normal text-slate-400">· {pool.rows.length} teams</span>
                              </div>
                              {pool.rows.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 dark:border-navy-700 py-4 text-center text-xs text-slate-400">
                                  No teams in this group yet.
                                </div>
                              ) : (
                                <>
                                  <div className="sm:hidden space-y-2">
                                    {pool.rows.map((row, i) => (
                                      <div
                                        key={row.id}
                                        className={`flex items-center gap-3 rounded-xl border p-2.5 ${i === 0 ? 'border-gold-300 bg-gold-50 dark:border-navy-700 dark:bg-navy-800' : 'border-slate-200 dark:border-navy-700'}`}
                                      >
                                        <RankBadge rank={i + 1} />
                                        <div className="min-w-0 flex-1">
                                          <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{row.teamName}</div>
                                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.won}W · {row.played} played</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-lg font-bold tabular-nums text-navy-800 dark:text-slate-100">{row.points}</div>
                                          <div className={`text-[11px] font-medium ${diffColorClass(row.pointDiff)}`}>{fmtDiff(row.pointDiff)}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-700">
                                    <table className="w-full text-sm">
                                      <thead className="bg-navy-800 text-left text-xs uppercase tracking-wide text-navy-50">
                                        <tr>
                                          <th className="py-2 pl-3 pr-2">#</th>
                                          <th className="py-2 pr-2">Team</th>
                                          <th className="py-2 pr-2 text-center">Pts</th>
                                          <th className="py-2 pr-2 text-center">Diff</th>
                                          <th className="py-2 pr-2 text-center">P</th>
                                          <th className="py-2 pr-3 text-center">W</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {pool.rows.map((row, i) => (
                                          <tr
                                            key={row.id}
                                            className={`border-t border-slate-100 dark:border-navy-800 ${i === 0 ? 'bg-gold-50/70 dark:bg-navy-800/60' : ''}`}
                                          >
                                            <td className="py-2 pl-3 pr-2"><RankBadge rank={i + 1} /></td>
                                            <td className="py-2 pr-2 font-medium text-slate-800 dark:text-slate-100">{row.teamName}</td>
                                            <td className="py-2 pr-2 text-center font-bold tabular-nums text-navy-800 dark:text-slate-100">{row.points}</td>
                                            <td className={`py-2 pr-2 text-center font-medium tabular-nums ${diffColorClass(row.pointDiff)}`}>{fmtDiff(row.pointDiff)}</td>
                                            <td className="py-2 pr-2 text-center tabular-nums">{row.played}</td>
                                            <td className="py-2 pr-3 text-center tabular-nums">{row.won}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                      })()
                    )
                  )}
                </div>

                {selectedTournament?.mode !== 'group' && (
                  <div className="rounded-xl border p-4 bg-white dark:bg-navy-900">
                    <div className="font-semibold mb-2">Knockout Points</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                      Semifinal and Final points are tracked separately from group standings.
                    </div>
                    {!areAllGroupMatchesCompleted ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Knockout points will be available after all group matches are completed.
                      </div>
                    ) : knockoutRows.length === 0 ? (
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        No semifinal-qualified teams yet.
                      </div>
                    ) : (
                      <>
                        <div className="sm:hidden space-y-2">
                          {knockoutRows.map((row, i) => (
                            <div
                              key={row.teamId}
                              className={`flex items-center gap-3 rounded-xl border p-2.5 ${i === 0 ? 'border-gold-300 bg-gold-50 dark:border-navy-700 dark:bg-navy-800' : 'border-slate-200 dark:border-navy-700'}`}
                            >
                              <RankBadge rank={i + 1} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{row.teamName}</div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">SF {row.semiPoints} · Final {row.finalPoints}</div>
                              </div>
                              <div className="text-lg font-bold tabular-nums text-navy-800 dark:text-slate-100">{row.totalKnockout}</div>
                            </div>
                          ))}
                        </div>
                        <div className="hidden sm:block overflow-x-auto rounded-lg border border-slate-200 dark:border-navy-700">
                          <table className="w-full text-sm">
                            <thead className="bg-navy-800 text-left text-xs uppercase tracking-wide text-navy-50">
                              <tr>
                                <th className="py-2 pl-3 pr-2">#</th>
                                <th className="py-2 pr-2">Team</th>
                                <th className="py-2 pr-2 text-center">Semifinal</th>
                                <th className="py-2 pr-2 text-center">Final</th>
                                <th className="py-2 pr-3 text-center">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {knockoutRows.map((row, i) => (
                                <tr key={row.teamId} className={`border-t border-slate-100 dark:border-navy-800 ${i === 0 ? 'bg-gold-50/70 dark:bg-navy-800/60' : ''}`}>
                                  <td className="py-2 pl-3 pr-2"><RankBadge rank={i + 1} /></td>
                                  <td className="py-2 pr-2 font-medium text-slate-800 dark:text-slate-100">{row.teamName}</td>
                                  <td className="py-2 pr-2 text-center tabular-nums">{row.semiPoints}</td>
                                  <td className="py-2 pr-2 text-center tabular-nums">{row.finalPoints}</td>
                                  <td className="py-2 pr-3 text-center font-bold tabular-nums text-navy-800 dark:text-slate-100">{row.totalKnockout}</td>
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
