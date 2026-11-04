import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { computeStandings, isoDateToday } from '../utils/tournament.js';
import { isGamePoint } from '../utils/scoring.js';
import {
  buildPredictionModel,
  formatEventDate,
  isLeaderboardOpen,
  resultsSignature,
} from '../utils/tournamentPredictions.js';
import { resolveProfilePhotoUrl } from '../supabaseAdapter.js';
import './TvDisplayScreen.css';

// Big-screen dashboard for a TV or tablet on the court side: team standings,
// live match scores, the next matches and the prediction leaderboard. Fed by
// the live tournaments subscription, so it never needs a manual refresh.

const LIVE_PER_PAGE = 2;
const LIVE_PAGE_MS = 8000;
// Caps for stacked (tablet / portrait) layouts where the page scrolls; on a
// fixed-height TV layout the lists size themselves to the space available.
const UPCOMING_LIMIT = 6;
const PREDICTION_LIMIT = 10;
const DENSE_STANDINGS_ROWS = 8;
const NARROW_QUERY = '(max-width: 900px), (orientation: portrait)';

function payloadOf(row) {
  return row?.payload || row || {};
}

function toTime(value) {
  if (!value) return 0;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

function rowStatus(row) {
  return row?.status || payloadOf(row)?.status || 'Upcoming';
}

function stageMatches(payload) {
  const groups = (payload?.groupMatches || []).map((m) => ({ ...m, stage: 'Group' }));
  if (payload?.mode === 'group') return groups;
  const semis = (payload?.semiMatches || []).map((m) => ({ ...m, stage: 'Semifinal' }));
  const finals = payload?.finalMatch ? [{ ...payload.finalMatch, stage: 'Final' }] : [];
  return [...groups, ...semis, ...finals];
}

const isLiveMatch = (m) => m?.status === 'Live';

/**
 * Chooses the tournament the screen follows when none is pinned in the URL:
 * a live tournament (preferring one with a match in progress), else the next
 * upcoming one by event date, else the most recently finished one.
 */
export function pickDisplayTournament(rows, pinnedId) {
  const list = Array.isArray(rows) ? rows : [];
  if (pinnedId) return list.find((row) => row?.id === pinnedId) || null;
  if (list.length === 0) return null;

  const live = list.filter((row) => rowStatus(row) === 'Live');
  if (live.length) {
    return live.find((row) => stageMatches(payloadOf(row)).some(isLiveMatch)) || live[0];
  }

  const today = isoDateToday();
  const open = list.filter((row) => rowStatus(row) !== 'Completed');
  const future = open
    .filter((row) => String(payloadOf(row).eventDate || '') >= today)
    .sort((a, b) => String(payloadOf(a).eventDate).localeCompare(String(payloadOf(b).eventDate)));
  if (future[0]) return future[0];

  const byRecent = (a, b) =>
    toTime(b?.updated_at || b?.created_at) - toTime(a?.updated_at || a?.created_at);
  if (open[0]) return [...open].sort(byRecent)[0];
  return [...list].sort(byRecent)[0];
}

function buildTvModel(row) {
  const payload = payloadOf(row);
  const teams = Array.isArray(payload.teams) ? payload.teams : [];
  const players = Array.isArray(payload.players) ? payload.players : [];
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const playersById = Object.fromEntries(players.map((player) => [player.id, player]));

  const playerObjs = (ids) =>
    (ids || [])
      .filter(Boolean)
      .map((id) => playersById[id])
      .filter(Boolean)
      .map((p) => ({ id: p.id, name: String(p.name || '').trim(), avatarUrl: resolveProfilePhotoUrl(p.avatarUrl) }));

  const side = (match, which) => {
    const teamId = which === 'A' ? match.teamAId : match.teamBId;
    const team = teamsById[teamId || ''];
    const explicit = which === 'A' ? match.teamAPlayerIds : match.teamBPlayerIds;
    const ids = explicit?.length ? explicit : team?.players || [];
    return {
      id: teamId || '',
      name: (which === 'A' ? match.teamADisplay : match.teamBDisplay) || team?.name || 'TBD',
      players: playerObjs(ids),
    };
  };

  const toScore = (value) => (value == null || value === '' ? null : Number(value));
  const matches = stageMatches(payload).map((match, index) => ({
    key: `${match.stage}-${match.id ?? index}`,
    stage: match.stage,
    label: String(match.label || '').trim(),
    status: match.status || 'Pending',
    scoreA: toScore(match.scoreA),
    scoreB: toScore(match.scoreB),
    teamA: side(match, 'A'),
    teamB: side(match, 'B'),
  }));
  const scheduled = matches.filter((m) => m.teamA.id && m.teamB.id);
  const live = scheduled.filter((m) => m.status === 'Live');
  const upcoming = scheduled.filter((m) => m.status !== 'Live' && m.status !== 'Completed');

  const pools = Array.isArray(payload.pools) ? payload.pools : [];
  const table = computeStandings(pools, teams, payload.groupMatches || [], payload.pointSystem || {});
  const standings = pools
    .map((pool, index) => ({
      id: pool.id,
      name: pool.name || `Group ${index + 1}`,
      rows: (table[pool.id] || []).map((r) => ({
        ...r,
        team: teamsById[r.teamId],
        name: teamsById[r.teamId]?.name || r.teamId,
        players: playerObjs(teamsById[r.teamId]?.players),
      })),
    }))
    .filter((group) => group.rows.length > 0);

  return {
    id: row.id,
    name: row.name || payload.name || 'Tournament',
    status: rowStatus(row),
    eventDate: String(payload.eventDate || ''),
    matches,
    live,
    upcoming,
    completedCount: matches.filter((m) => m.status === 'Completed').length,
    standings,
    standingsRowCount: standings.reduce((sum, group) => sum + group.rows.length, 0),
    resultsSignature: resultsSignature(buildPredictionModel(row)),
  };
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Doubles teams are often named after their pair; don't print the names twice. */
function playersRepeatTeamName(team) {
  const joined = (team?.players || []).map((p) => p.name).filter(Boolean).join(' & ');
  return Boolean(joined) && normalizeName(joined) === normalizeName(team?.name);
}

function poolTitle(name) {
  return /^\d+$/.test(String(name).trim()) ? `Group ${String(name).trim()}` : name;
}

function useNarrowLayout() {
  const [narrow, setNarrow] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches
  );
  useEffect(() => {
    const query = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return narrow;
}

/**
 * Renders as many list rows as fit the container (fixed-height TV layout) so
 * nothing is cut off mid-row, falling back to a plain cap when the page scrolls.
 */
function FitList({ items, renderItem, max, fit, moreLabel }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(max);

  useLayoutEffect(() => {
    if (!fit) {
      setVisible(max);
      return undefined;
    }
    const container = ref.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const rows = Array.from(container.querySelectorAll('li'));
      const rowHeight = Math.max(0, ...rows.map((row) => row.getBoundingClientRect().height));
      if (!rowHeight) return;
      const fontPx = parseFloat(getComputedStyle(container).fontSize) || 16;
      const available = container.clientHeight;
      let count = Math.floor(available / rowHeight);
      // Leave room for the "+N more" line whenever rows will be hidden.
      if (count < items.length) count = Math.floor((available - fontPx * 1.9) / rowHeight);
      setVisible(Math.min(max, Math.max(1, count)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [fit, items.length, max]);

  const shown = items.slice(0, visible);
  const more = items.length - shown.length;
  return (
    <div ref={ref} className="tv-fit">
      <ol className="tv-list">{shown.map(renderItem)}</ol>
      {more > 0 && <p className="tv-more">{moreLabel(more)}</p>}
    </div>
  );
}

function Avatar({ player }) {
  return (
    <span className="tv-avatar" aria-hidden="true">
      {player.avatarUrl ? (
        <img src={player.avatarUrl} alt="" />
      ) : (
        <b>{(player.name || '?').charAt(0).toUpperCase()}</b>
      )}
    </span>
  );
}

function TeamBlock({ team, align, leading }) {
  return (
    <div className={`tv-team ${align === 'right' ? 'is-right' : ''} ${leading ? 'is-leading' : ''}`}>
      <div className="tv-team-name">{team.name}</div>
      {team.players.length > 0 && !playersRepeatTeamName(team) && (
        <div className="tv-team-players">
          {team.players.map((player) => (
            <span key={player.id} className="tv-player">
              <Avatar player={player} />
              <span>{player.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function matchHeading(match) {
  // Generated labels already name the stage ("Group 1 - Match 2", "Semifinal 1").
  if (match.label && normalizeName(match.label).includes(normalizeName(match.stage))) return match.label;
  return [match.stage, match.label].filter(Boolean).join(' · ');
}

function LiveMatchCard({ match, single }) {
  const a = match.scoreA ?? 0;
  const b = match.scoreB ?? 0;
  const gamePoint = isGamePoint(a, b);
  return (
    <article className={`tv-match ${single ? 'is-single' : ''}`}>
      <div className="tv-match-top">
        <span className="tv-chip is-live"><i /> Live</span>
        <span className="tv-match-heading">{matchHeading(match)}</span>
        {gamePoint && <span className="tv-chip is-gamepoint">Game point</span>}
      </div>
      <div className="tv-match-body">
        <TeamBlock team={match.teamA} align="left" leading={a > b} />
        <div className="tv-score" aria-label={`${match.teamA.name} ${a}, ${match.teamB.name} ${b}`}>
          <b className={a >= b ? 'is-leading' : ''}>{a}</b>
          <span>:</span>
          <b className={b >= a ? 'is-leading' : ''}>{b}</b>
        </div>
        <TeamBlock team={match.teamB} align="right" leading={b > a} />
      </div>
    </article>
  );
}

function sideNames(players, fallback) {
  const names = players.map((p) => p.name).filter(Boolean);
  return names.length ? names.join(' & ') : fallback;
}

function statusLabel(status) {
  return status === 'Pending' || !status ? 'Upcoming' : status;
}

export default function TvDisplayScreen({
  tournaments,
  pinnedTournamentId = null,
  subscribeLeaderboard,
  onExit,
}) {
  const row = useMemo(
    () => pickDisplayTournament(tournaments, pinnedTournamentId),
    [tournaments, pinnedTournamentId]
  );
  const model = useMemo(() => (row ? buildTvModel(row) : null), [row]);
  const tournamentId = model?.id || '';
  const leaderboardOpen = model ? isLeaderboardOpen(model.eventDate) : false;

  const [now, setNow] = useState(() => new Date());
  const [livePage, setLivePage] = useState(0);
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const narrow = useNarrowLayout();

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(clock);
  }, []);

  // With more live matches than fit at once, page through them.
  const liveCount = model?.live.length || 0;
  const livePages = Math.max(1, Math.ceil(liveCount / LIVE_PER_PAGE));
  useEffect(() => {
    setLivePage(0);
    if (livePages <= 1) return undefined;
    const timer = setInterval(() => setLivePage((page) => (page + 1) % livePages), LIVE_PAGE_MS);
    return () => clearInterval(timer);
  }, [livePages, tournamentId]);

  useEffect(() => {
    setLeaderboard(null);
    setLeaderboardError('');
    if (!tournamentId || !leaderboardOpen || !subscribeLeaderboard) return undefined;
    const unsubscribe = subscribeLeaderboard(tournamentId, (next, error) => {
      if (error) {
        setLeaderboardError(error?.message || 'Prediction leaderboard unavailable.');
        return;
      }
      setLeaderboardError('');
      setLeaderboard(next);
    });
    return () => {
      try {
        unsubscribe?.();
      } catch {
        /* noop */
      }
    };
  }, [tournamentId, leaderboardOpen, subscribeLeaderboard]);

  // Keep the screen awake while the dashboard is showing (where supported).
  useEffect(() => {
    let sentinel = null;
    let disposed = false;
    const request = async () => {
      if (disposed || document.hidden || !navigator.wakeLock?.request) return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        sentinel = null;
      }
    };
    const onVisibility = () => {
      if (!document.hidden) request();
    };
    request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release?.().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  const livePageMatches = model
    ? model.live.slice(livePage * LIVE_PER_PAGE, livePage * LIVE_PER_PAGE + LIVE_PER_PAGE)
    : [];
  const predictionRows = leaderboard?.rows || [];
  const denseStandings = (model?.standingsRowCount || 0) > DENSE_STANDINGS_ROWS;
  const leaderboardStale = Boolean(leaderboard) && leaderboard.resultsSignature !== model?.resultsSignature;

  const eyebrow = model
    ? [formatEventDate(model.eventDate), `${model.completedCount} of ${model.matches.length} matches played`]
        .filter(Boolean)
        .join(' · ')
    : '';
  const canFullscreen = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

  return (
    <div className="tv-page">
      <header className="tv-header">
        <div className="tv-brand">
          <span aria-hidden="true">✳</span>
          <strong>WHITE<span>FEATHER</span></strong>
        </div>
        <div className="tv-title">
          <div className="tv-eyebrow">{eyebrow || 'BADMINTON CLUB'}</div>
          <h1>{model?.name || 'Tournament display'}</h1>
        </div>
        <div className="tv-meta">
          {model && (
            <span className={`tv-status is-${String(model.status).toLowerCase()}`}>
              {model.status === 'Live' && <i />}
              {statusLabel(model.status)}
            </span>
          )}
          <span className="tv-clock">{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
          {canFullscreen && (
            <button
              type="button"
              className="tv-icon-button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? '⤢' : '⛶'}
            </button>
          )}
          {onExit && (
            <button type="button" className="tv-icon-button" onClick={onExit} title="Close display" aria-label="Close display">
              ✕
            </button>
          )}
        </div>
      </header>

      {!model ? (
        <div className="tv-empty tv-empty-page" role="status">
          <strong>No tournament to show yet</strong>
          <span>This screen updates automatically as soon as one is created.</span>
        </div>
      ) : (
        <main className="tv-grid">
          <div className="tv-col">
          <section className="tv-panel tv-live" aria-labelledby="tv-live-title">
            <div className="tv-panel-head">
              <h2 id="tv-live-title">Live now</h2>
              <span>
                {liveCount === 0 ? 'No match in progress' : `${liveCount} ${liveCount === 1 ? 'match' : 'matches'} on court`}
              </span>
            </div>
            <div className="tv-panel-body">
              {liveCount === 0 ? (
                <div className="tv-empty">
                  <strong>{model.status === 'Completed' ? 'Tournament finished' : 'Waiting for the next match'}</strong>
                  {model.upcoming[0] && model.status !== 'Completed' && (
                    <span>
                      Next up: {model.upcoming[0].teamA.name} vs {model.upcoming[0].teamB.name}
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div className="tv-live-cards" style={{ '--count': livePageMatches.length }}>
                    {livePageMatches.map((match) => (
                      <LiveMatchCard key={match.key} match={match} single={livePageMatches.length === 1} />
                    ))}
                  </div>
                  {livePages > 1 && (
                    <div className="tv-dots" aria-hidden="true">
                      {Array.from({ length: livePages }, (_, i) => (
                        <span key={i} className={i === livePage ? 'is-active' : ''} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="tv-panel tv-upcoming" aria-labelledby="tv-upcoming-title">
            <div className="tv-panel-head">
              <h2 id="tv-upcoming-title">Up next</h2>
              <span>{model.upcoming.length} {model.upcoming.length === 1 ? 'match' : 'matches'} to play</span>
            </div>
            <div className="tv-panel-body">
              {model.upcoming.length === 0 ? (
                <div className="tv-empty">
                  <strong>All matches have been played</strong>
                </div>
              ) : (
                <FitList
                  items={model.upcoming}
                  max={narrow ? UPCOMING_LIMIT : model.upcoming.length}
                  fit={!narrow}
                  moreLabel={(n) => `+${n} more to follow`}
                  renderItem={(match) => (
                    <li key={match.key} className="tv-up">
                      <span className="tv-up-label">{matchHeading(match) || 'Match'}</span>
                      <div className="tv-up-teams">
                        <span className="tv-up-team">
                          {match.teamA.name}
                          {!playersRepeatTeamName(match.teamA) && <small>{sideNames(match.teamA.players, '')}</small>}
                        </span>
                        <em className="tv-up-vs">vs</em>
                        <span className="tv-up-team is-right">
                          {match.teamB.name}
                          {!playersRepeatTeamName(match.teamB) && <small>{sideNames(match.teamB.players, '')}</small>}
                        </span>
                      </div>
                    </li>
                  )}
                />
              )}
            </div>
          </section>
          </div>

          <div className="tv-col">
          <section className="tv-panel tv-standings" aria-labelledby="tv-standings-title">
            <div className="tv-panel-head">
              <h2 id="tv-standings-title">Leaderboard</h2>
              <span>Points · wins · losses · score difference</span>
            </div>
            <div className={`tv-panel-body ${denseStandings ? 'is-dense' : ''}`}>
              {model.standings.length === 0 ? (
                <div className="tv-empty">
                  <strong>No standings yet</strong>
                  <span>The table fills in as group matches finish.</span>
                </div>
              ) : (
                model.standings.map((group) => (
                  <div key={group.id} className="tv-standings-group">
                    {model.standings.length > 1 && <div className="tv-pool-name">{poolTitle(group.name)}</div>}
                    <table className="tv-table">
                      <thead>
                        <tr>
                          <th className="tv-rank-col">#</th>
                          <th>Team</th>
                          <th className="num">P</th>
                          <th className="num">W</th>
                          <th className="num">L</th>
                          <th className="num">+/−</th>
                          <th className="num">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((r, index) => {
                          const diff = (r.pf || 0) - (r.pa || 0);
                          return (
                            <tr key={r.teamId} className={index === 0 && (r.played || 0) > 0 ? 'is-top' : ''}>
                              <td className="tv-rank">{index + 1}</td>
                              <td className="tv-team-cell">
                                {r.name}
                                {r.players.length > 0 && r.players.length <= 2 && !playersRepeatTeamName(r) && (
                                  <small>{sideNames(r.players, '')}</small>
                                )}
                              </td>
                              <td className="num">{r.played || 0}</td>
                              <td className="num">{r.won || 0}</td>
                              <td className="num">{r.lost ?? Math.max(0, (r.played || 0) - (r.won || 0))}</td>
                              <td className={`num ${diff > 0 ? 'is-pos' : diff < 0 ? 'is-neg' : ''}`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </td>
                              <td className="num tv-pts">{r.points || 0}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="tv-panel tv-predictions" aria-labelledby="tv-predictions-title">
            <div className="tv-panel-head">
              <h2 id="tv-predictions-title">Prediction leaderboard</h2>
              <span>
                {leaderboard
                  ? `After ${leaderboard.completedCount} of ${leaderboard.fixtureCount} matches`
                  : 'Correct winner picks'}
                {leaderboardStale ? ' · updating…' : ''}
              </span>
            </div>
            <div className="tv-panel-body">
              {!leaderboardOpen ? (
                <div className="tv-empty">
                  <strong>Opens on tournament day</strong>
                  <span>Members’ picks stay sealed until the first match.</span>
                </div>
              ) : leaderboardError ? (
                <div className="tv-empty">
                  <strong>Leaderboard unavailable</strong>
                  <span>{leaderboardError}</span>
                </div>
              ) : predictionRows.length === 0 ? (
                <div className="tv-empty">
                  <strong>{model.completedCount === 0 ? 'Fills in after the first result' : 'No scored predictions yet'}</strong>
                </div>
              ) : (
                <FitList
                  items={predictionRows}
                  max={narrow ? PREDICTION_LIMIT : predictionRows.length}
                  fit={!narrow}
                  moreLabel={(n) => `+${n} more ${n === 1 ? 'member' : 'members'}`}
                  renderItem={(entry) => (
                    <li key={entry.id || entry.name} className={`tv-pred ${entry.rank <= 3 ? 'is-podium' : ''}`}>
                      <span className={`tv-rank is-${entry.rank}`}>{entry.rank}</span>
                      <strong>
                        {entry.name}
                        {entry.rangeHits ? <small>{entry.rangeHits} bracket {entry.rangeHits === 1 ? 'hit' : 'hits'}</small> : null}
                      </strong>
                      <b>
                        {entry.correct}
                        <small> / {entry.graded}</small>
                      </b>
                    </li>
                  )}
                />
              )}
            </div>
          </section>
          </div>
        </main>
      )}
    </div>
  );
}
