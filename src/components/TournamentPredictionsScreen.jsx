import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './TeamPredictionsScreen.css';
import PlayerProfileLink from './PlayerProfileLink.jsx';
import {
  DEFAULT_SIMULATIONS,
  buildPredictionModel,
  calculateCommunityOdds,
  calculateForecast,
  effectivePicks,
  forecastFromSubmission,
  formatEventDate,
  gradePicks,
  isLeaderboardOpen,
  isSubmissionOpen,
  picksFromPayload,
  resultPick,
  resultsSignature,
  sideNames,
  submissionDeadlineLabel,
} from '../utils/tournamentPredictions.js';

// Live-data twin of TeamPredictionsScreen. Same look and flow, but teams,
// fixtures and scoring rules come from the selected tournament, picks lock
// once a match result is recorded, and every save is keyed by tournament id.

const EMPTY_PICK = { winner: undefined, range: null, open: false };
const MEMBER_PREVIEW_COUNT = 8;

function formatPredictionDate(value) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function normalizeMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

function TeamCard({ team, players, onOpenPlayer }) {
  return (
    <article className="smash-team-card">
      <div className="smash-team-number">SQUAD {String(team.index + 1).padStart(2, '0')}</div>
      <h3>{team.name}</h3>
      <ul>
        {team.players.map((name, index) => (
          <li key={`${team.playerIds[index] || name}-${index}`}>
            <b>{String.fromCharCode(65 + (index % 26))}</b>
            <PlayerProfileLink
              name={name}
              playerId={team.playerIds[index]}
              players={players}
              onOpenPlayer={onOpenPlayer}
              className="smash-player-link"
            />
          </li>
        ))}
      </ul>
    </article>
  );
}

function MatchCard({ fixture, scoreRanges, pick, userPick, locked, disabled = false, onPick, onRange, onToggleScore }) {
  const team1Players = sideNames(fixture.team1Players);
  const team2Players = sideNames(fixture.team2Players);
  const hasScore = fixture.scoreA !== null && fixture.scoreB !== null;
  const graded = locked && userPick?.winner !== undefined;
  const correct = graded && userPick.winner === pick.winner;
  const statusText = locked ? 'FINAL' : pick.winner !== undefined ? '✓ PICKED' : 'AWAITING PICK';
  return (
    <article className={`smash-match ${locked ? 'is-final' : ''}`}>
      <div className="smash-match-top">
        <span>
          Match {String(fixture.number).padStart(2, '0')} - {fixture.team1.name} vs {fixture.team2.name} ({fixture.pairing.id})
        </span>
        <span>{statusText}</span>
      </div>
      <div className="smash-versus">
        <button
          type="button"
          className={`smash-side ${pick.winner === 0 ? 'selected' : ''}`}
          onClick={() => onPick(0)}
          aria-pressed={pick.winner === 0}
          disabled={locked || disabled}
        >
          <strong>{team1Players}</strong>
          {pick.winner === 0 && <small>{locked ? '✓ WON' : '✓ WINNER'}</small>}
        </button>
        <span className="smash-vs">{locked && hasScore ? `${fixture.scoreA}–${fixture.scoreB}` : 'VS'}</span>
        <button
          type="button"
          className={`smash-side ${pick.winner === 1 ? 'selected' : ''}`}
          onClick={() => onPick(1)}
          aria-pressed={pick.winner === 1}
          disabled={locked || disabled}
        >
          <strong>{team2Players}</strong>
          {pick.winner === 1 && <small>{locked ? '✓ WON' : '✓ WINNER'}</small>}
        </button>
      </div>
      {locked ? (
        <div className="smash-result-line">
          <span>Result recorded · picks locked</span>
          {graded ? (
            <b className={correct ? 'hit' : 'miss'}>{correct ? '✓ Your pick was right' : '✗ Your pick missed'}</b>
          ) : (
            <b>No pick made</b>
          )}
        </div>
      ) : !disabled && scoreRanges.length > 0 && (
        <>
          <button
            type="button"
            className="smash-score-toggle"
            onClick={onToggleScore}
            aria-expanded={pick.open}
          >
            {pick.open ? '− Hide score' : '＋ Predict score'}
          </button>
          {pick.open && (
            <>
              <div className="smash-score-choice-label">Losing team's score range (optional)</div>
              <div className="smash-score-choices">
                {scoreRanges.map((range) => (
                  <button
                    key={range.id}
                    type="button"
                    className={`smash-score-choice ${pick.range === range.id ? 'chosen' : ''}`}
                    aria-pressed={pick.range === range.id}
                    onClick={() => onRange(range.id)}
                  >
                    {range.label}
                    <small>{range.detail}</small>
                  </button>
                ))}
              </div>
              {pick.winner === undefined && (
                <p className="smash-score-hint">Select a match winner above to apply bonus points.</p>
              )}
            </>
          )}
        </>
      )}
    </article>
  );
}

function IdentityDialog({ onClose, onContinue, busy, error, onClearError, initialMobile = '' }) {
  const [mobile, setMobile] = useState(initialMobile);

  function submit(event) {
    event.preventDefault();
    const cleanMobile = normalizeMobile(mobile);
    if (!cleanMobile) {
      onContinue({ error: 'Enter a valid 10-digit Indian mobile number.' });
      return;
    }
    onContinue({ mobile: cleanMobile });
  }

  return (
    <div className="smash-modal" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose();
    }}>
      <div className="smash-dialog" role="dialog" aria-modal="true" aria-labelledby="smash-dialog-title">
        <button className="smash-dialog-close" type="button" onClick={onClose} disabled={busy} aria-label="Close">
          ×
        </button>
        <div className="smash-eyebrow">WELCOME TO SMASH PICKS</div>
        <h2 id="smash-dialog-title">Predict &amp; Win 🏸</h2>

        <form onSubmit={submit}>
          <label className="smash-field">
            Mobile number
            <input
              autoFocus
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              required
              value={mobile}
              onChange={(event) => {
                setMobile(event.target.value.replace(/\D/g, '').slice(0, 10));
                onClearError();
              }}
              placeholder="10-digit Indian mobile number"
            />
          </label>
          {error && <div className="smash-form-error" role="alert">{error}</div>}

          <div className="smash-dialog-actions">
            <button className="smash-secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="smash-primary" type="submit" disabled={busy}>
              {busy ? 'Looking up…' : 'Continue →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TournamentPredictionsScreen({
  tournament,
  onSave,
  loadPredictionByMobile,
  loadPlayerByMobile,
  publishLegacySummary,
  loadPredictions,
  loadPredictionDetails,
  loadPredictionAnalytics,
  initializePredictionAnalytics,
  loadLeaderboard,
  refreshLeaderboard,
  isAdmin = false,
  authenticatedMobile = '',
  onPredictionIdentity,
  busy = false,
  onOpenFixtures,
  onBack,
  players = [],
  onOpenPlayer,
}) {
  const model = useMemo(() => buildPredictionModel(tournament), [tournament]);
  const tournamentId = model.id;
  const { fixtures, teams, scoreRanges } = model;

  const [picks, setPicks] = useState({});
  const [identityDialogOpen, setIdentityDialogOpen] = useState(!authenticatedMobile);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [identityName, setIdentityName] = useState('');
  const [identityMobile, setIdentityMobile] = useState('');
  const [formError, setFormError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [memberEntries, setMemberEntries] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberError, setMemberError] = useState('');
  const [adminEntries, setAdminEntries] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [analytics, setAnalytics] = useState({ submissions: 0, fixtures: {} });
  const [analyticsError, setAnalyticsError] = useState('');
  const [leaderboard, setLeaderboard] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [myEntryId, setMyEntryId] = useState('');
  const [showAllMembers, setShowAllMembers] = useState(false);
  const restoredMobileRef = useRef('');

  // Picks on finished matches are replaced by the real result everywhere the
  // forecast is concerned; the user's original pick is kept for grading.
  const combinedPicks = useMemo(() => effectivePicks(model, picks), [model, picks]);
  const userPickCount = fixtures.filter((fixture) => picks[fixture.id]?.winner !== undefined).length;
  const forecast = useMemo(() => calculateForecast(model, combinedPicks), [model, combinedPicks]);
  const communityOdds = useMemo(() => calculateCommunityOdds(model, analytics), [model, analytics]);
  const grade = useMemo(() => gradePicks(model, picks), [model, picks]);
  const completedCount = fixtures.filter((fixture) => fixture.completed).length;
  const openFixtures = fixtures.filter((fixture) => !fixture.completed);
  // Entries freeze at the end of the day before the tournament.
  const submissionOpen = isSubmissionOpen(model.eventDate);
  const deadlineLabel = submissionDeadlineLabel(model.eventDate);
  const allOpenPicked = openFixtures.every((fixture) => picks[fixture.id]?.winner !== undefined);

  const members = useMemo(
    () =>
      memberEntries
        .map((entry) => {
          const storedSummary = entry.summary;
          const summary = storedSummary
            ? {
                playedCount: storedSummary.playedCount,
                winner: teams.find((team) => team.id === String(storedSummary.winnerTeamId)),
                runnerUp: teams.find((team) => team.id === String(storedSummary.runnerUpTeamId)),
              }
            : forecastFromSubmission(model, entry);
          return {
            id: entry.id,
            name: entry.payload?.predictorName || 'Tournament player',
            updatedAt: entry.updated_at,
            ...summary,
          };
        })
        .filter((entry) => entry.winner && entry.runnerUp)
        .filter((entry) => entry.playedCount > 0),
    [memberEntries, model, teams]
  );

  const refreshMembers = useCallback(async () => {
    if (!loadPredictions || !tournamentId) {
      setMemberEntries([]);
      setLoadingMembers(false);
      if (tournamentId) setMemberError('Member predictions are not available.');
      return;
    }
    setLoadingMembers(true);
    setMemberError('');
    try {
      const entries = await loadPredictions(tournamentId);
      setMemberEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      setMemberError(error?.message || 'Unable to load member predictions.');
    } finally {
      setLoadingMembers(false);
    }
  }, [loadPredictions, tournamentId]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  // Reset per-tournament state when the screen is reused for another tournament.
  useEffect(() => {
    setPicks({});
    setSubmitted(false);
    setFormError('');
    setSaveError('');
    restoredMobileRef.current = '';
  }, [tournamentId]);

  useEffect(() => {
    const mobile = normalizeMobile(authenticatedMobile);
    if (!mobile || !tournamentId || restoredMobileRef.current === mobile) return;
    restoredMobileRef.current = mobile;
    continueWithIdentity({ mobile }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedMobile, tournamentId]);

  useEffect(() => {
    let active = true;
    const getAnalytics = isAdmin && initializePredictionAnalytics
      ? initializePredictionAnalytics
      : loadPredictionAnalytics;
    if (!getAnalytics || !tournamentId) return undefined;
    getAnalytics(tournamentId)
      .then((result) => {
        if (active) {
          setAnalytics(result || { submissions: 0, fixtures: {} });
          setAnalyticsError('');
        }
      })
      .catch((error) => {
        if (active) setAnalyticsError(error?.message || 'Unable to load community match predictions.');
      });
    return () => { active = false; };
  }, [initializePredictionAnalytics, isAdmin, loadPredictionAnalytics, tournamentId]);

  useEffect(() => {
    let active = true;
    if (!isAdmin || !loadPredictionDetails || !tournamentId) {
      setAdminEntries([]);
      setAdminLoading(false);
      setAdminError('');
      return undefined;
    }
    setAdminLoading(true);
    setAdminError('');
    loadPredictionDetails(tournamentId)
      .then((entries) => {
        if (active) setAdminEntries(Array.isArray(entries) ? entries : []);
      })
      .catch((error) => {
        if (active) setAdminError(error?.message || 'Unable to load detailed predictions.');
      })
      .finally(() => {
        if (active) setAdminLoading(false);
      });
    return () => { active = false; };
  }, [isAdmin, loadPredictionDetails, tournamentId]);

  // The leaderboard is published by whoever records a result. If results have
  // moved on since it was written, an admin viewing the page rebuilds it.
  const currentSignature = resultsSignature(model);
  const leaderboardOpen = isLeaderboardOpen(model.eventDate);
  const leaderboardStale = Boolean(leaderboard) && leaderboard.resultsSignature !== currentSignature;
  const fetchLeaderboard = useCallback(async () => {
    if (!leaderboardOpen || !tournamentId || (!loadLeaderboard && !refreshLeaderboard)) return;
    setLeaderboardLoading(true);
    setLeaderboardError('');
    try {
      let next = loadLeaderboard ? await loadLeaderboard(tournamentId) : null;
      const stale = !next || next.resultsSignature !== currentSignature;
      if (stale && isAdmin && refreshLeaderboard) {
        next = (await refreshLeaderboard(tournamentId)) || next;
      }
      setLeaderboard(next);
    } catch (error) {
      setLeaderboardError(error?.message || 'Unable to load the prediction leaderboard.');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [currentSignature, isAdmin, leaderboardOpen, loadLeaderboard, refreshLeaderboard, tournamentId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  function updatePick(fixtureId, changes) {
    if (!submissionOpen) return;
    setPicks((current) => ({
      ...current,
      [fixtureId]: { ...EMPTY_PICK, ...current[fixtureId], ...changes },
    }));
    setFormError('');
    setSaveError('');
    setSubmitted(false);
  }

  function summaryFor(result) {
    return {
      predictorName: identityName,
      winnerTeamId: result.winner?.id,
      runnerUpTeamId: result.runnerUp?.id,
      playedCount: result.playedCount,
    };
  }

  async function continueWithIdentity(contact) {
    if (contact.error) {
      setFormError(contact.error);
      return;
    }
    if (!loadPredictionByMobile) {
      setFormError('Prediction lookup is not available. Please try again later.');
      return;
    }
    setFormError('');
    setSaveError('');
    setIdentityBusy(true);
    try {
      if (!loadPlayerByMobile) {
        throw new Error('Player lookup is not available. Please try again later.');
      }
      const player = await loadPlayerByMobile(contact.mobile);
      if (!player?.name || !player?.mobile) {
        throw new Error('That mobile number was not found in the players list. Please contact the tournament organizer.');
      }
      const memberName = String(player.name).trim();
      const memberMobile = normalizeMobile(player.mobile) || contact.mobile;
      restoredMobileRef.current = memberMobile;
      onPredictionIdentity?.({ ...player, name: memberName, mobile: memberMobile });
      const saved = await loadPredictionByMobile(tournamentId, memberMobile);
      setMyEntryId(String(saved?.id || ''));
      const payload = saved?.payload;
      if (payload?.kind === 'team-match-predictions') {
        const restoredPicks = picksFromPayload(model, payload);
        setPicks(restoredPicks);
        const name = String(payload.predictorName || memberName).trim();
        setIdentityName(name);
        setIdentityMobile(memberMobile);
        setSubmitted(Object.keys(restoredPicks).length > 0);
        if (publishLegacySummary && Object.keys(restoredPicks).length > 0 && saved?.id) {
          const restoredSummary = forecastFromSubmission(model, saved);
          try {
            await publishLegacySummary({
              id: saved.id,
              tournamentId,
              summary: {
                predictorName: name,
                winnerTeamId: restoredSummary.winner?.id,
                runnerUpTeamId: restoredSummary.runnerUp?.id,
                playedCount: restoredSummary.playedCount,
              },
            });
          } catch (error) {
            setSaveError(
              `Your picks were restored, but your community card could not be refreshed: ${error?.message || 'Please try again.'}`
            );
          }
        }
        await refreshMembers();
      } else {
        setPicks({});
        setIdentityName(memberName);
        setIdentityMobile(memberMobile);
        setSubmitted(false);
      }
      setIdentityName((currentName) => currentName || memberName);
      setIdentityMobile(memberMobile);
      setIdentityDialogOpen(false);
    } catch (error) {
      setFormError(error?.message || 'Unable to look up your saved predictions. Please try again.');
      if (authenticatedMobile) setIdentityDialogOpen(true);
    } finally {
      setIdentityBusy(false);
    }
  }

  async function submitPredictions() {
    if (!identityMobile || !identityName) {
      setFormError('Enter your mobile number to continue.');
      setIdentityDialogOpen(true);
      return;
    }
    if (!submissionOpen) {
      setFormError(`Submissions closed on ${deadlineLabel}. Picks can no longer be changed.`);
      return;
    }
    if (userPickCount === 0) {
      setFormError('Pick at least one match winner first.');
      return;
    }
    setFormError('');
    setSaveError('');
    const predictions = fixtures
      .filter((fixture) => picks[fixture.id]?.winner !== undefined)
      .map((fixture) => {
        const pick = picks[fixture.id];
        return {
          fixtureId: fixture.id,
          team1Id: fixture.team1.id,
          team2Id: fixture.team2.id,
          pairing: fixture.pairing.id,
          winnerTeamId: pick.winner === 0 ? fixture.team1.id : fixture.team2.id,
          losingScoreRange: pick.range || null,
        };
      });

    try {
      const savedEntry = await onSave(tournamentId, {
        name: identityName,
        mobile: identityMobile,
        predictions,
        publicSummary: summaryFor(forecast),
      });
      if (savedEntry?.id) setMyEntryId(String(savedEntry.id));
      setSubmitted(true);
      await Promise.all([refreshMembers(), fetchLeaderboard()]);
    } catch (error) {
      setSaveError(error?.message || 'Unable to save your predictions. Please try again.');
    }
  }

  function sharePredictionOnWhatsApp() {
    if (!identityName || forecast.playedCount === 0) return;
    const link = `${window.location.origin}/tournament/${encodeURIComponent(tournamentId)}/predictions`;
    const message = [
      `🏸 *${model.name.toUpperCase()} · SMASH PICKS*`,
      '━━━━━━━━━━━━━━━━━━━━',
      `👤 *${identityName}*`,
      '',
      `🏆 Projected winner: *${forecast.winner?.name || '-'}*`,
      `🥈 Runner-up: *${forecast.runnerUp?.name || '-'}*`,
      '',
      `🎯 ${userPickCount} of ${fixtures.length} matches predicted.`,
      '━━━━━━━━━━━━━━━━━━━━',
      `Create your prediction: ${link}`,
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  function applySamplePicks() {
    const sample = {};
    openFixtures.forEach((fixture, index) => {
      sample[fixture.id] = { winner: (index * 13 + Math.floor(index / 4)) % 3 === 0 ? 0 : 1, range: null, open: false };
    });
    setPicks(sample);
    setFormError('');
    setSaveError('');
    setSubmitted(false);
  }

  const eyebrow = [formatEventDate(model.eventDate), 'TOURNAMENT DAY'].filter(Boolean).join(' · ');
  const progress = fixtures.length ? forecast.playedCount / fixtures.length * 100 : 0;
  const scoringNote = (() => {
    const base = `A win is worth ${model.winnerPoints} base ${model.winnerPoints === 1 ? 'point' : 'points'}.`;
    if (scoreRanges.length === 0) return `${base} This tournament has no score-based bonuses.`;
    const bonuses = scoreRanges
      .filter((range) => range.winnerBonus || range.loserBonus)
      .map((range) => `a losing score of ${range.label.toLowerCase()} ${[
        range.winnerBonus ? `adds ${range.winnerBonus} to the winner` : '',
        range.loserBonus ? `adds ${range.loserBonus} to the loser` : '',
      ].filter(Boolean).join(' and ')}`);
    if (!bonuses.length) return base;
    const joined = bonuses.join('; ');
    return `${base} ${joined.charAt(0).toUpperCase()}${joined.slice(1)}.`;
  })();

  return (
    <div className="smash-picks">
      <div className="smash-picks-shell">
        <nav className="smash-nav" aria-label="Tournament predictions">
          <div className="smash-brand">
            <span className="smash-mark">✳</span>
            <span>SMASH<span>PICKS</span></span>
          </div>
          <div className="smash-nav-actions">
            <button type="button" onClick={onOpenFixtures} className="fixtures-back">
              Fixtures
            </button>
            {onBack && (
              <button type="button" onClick={onBack} className="fixtures-back">
                Tournaments
              </button>
            )}
          </div>
        </nav>

        {!tournament ? (
          <div className="smash-loading" role="status">Loading tournament…</div>
        ) : (
          <>
            <section className="smash-hero">
              <div>
                <div className="smash-eyebrow">{eyebrow}</div>
                <h1>{model.name.toUpperCase()}<br /><span>PREDICT &amp; WIN.</span></h1>
                <p className="smash-muted">
                  Pick the winner of every fixture before it is played. Picks lock as soon as a result is recorded, and the member with the most correct picks takes the prize.
                  {deadlineLabel && (
                    <>
                      {' '}<strong>{submissionOpen ? 'Last date for submissions:' : 'Submissions closed on'} {deadlineLabel}.</strong>
                    </>
                  )}
                </p>
              </div>
              <div className="smash-hero-card">
                <div className="smash-eyebrow">YOUR PREDICTION CARD</div>
                <div>
                  <strong>{userPickCount} / {fixtures.length}</strong>
                  <p className="smash-muted">Matches predicted</p>
                </div>
                {grade.graded > 0 && (
                  <div>
                    <strong>{grade.correct} / {grade.graded}</strong>
                    <p className="smash-muted">Correct so far</p>
                  </div>
                )}
                <div className="smash-hero-card-footer">
                  {identityMobile && (
                    <div className="smash-welcome">Welcome, {identityName}!</div>
                  )}
                </div>
              </div>
            </section>

            <div className="smash-stats" aria-label="Tournament details">
              <div className="smash-stat"><b>{String(teams.length).padStart(2, '0')}</b><small>Teams</small></div>
              <div className="smash-stat"><b>{model.totalPlayers}</b><small>Players</small></div>
              <div className="smash-stat"><b>{fixtures.length}</b><small>Fixtures</small></div>
            </div>

            <section className="smash-community-odds" aria-labelledby="community-odds-title">
              <div className="smash-community-odds-head">
                <div>
                  <span className="smash-forecast-label">✦ COMMUNITY FORECAST</span>
                  <h2 id="community-odds-title">Team winning probability</h2>
                </div>
                <span className="smash-community-count">
                  {analytics.submissions} {analytics.submissions === 1 ? 'prediction' : 'predictions'}
                </span>
              </div>
              {analyticsError ? (
                <p className="smash-community-error" role="alert">{analyticsError}</p>
              ) : analytics.submissions === 0 && completedCount === 0 ? (
                <p className="smash-community-empty">Team odds will appear once predictions are submitted.</p>
              ) : (
                <div className="smash-community-bars">
                  {communityOdds.map(({ team, probability }) => (
                    <div className="smash-community-bar-row" key={team.id}>
                      <span>{team.name}</span>
                      <div
                        className="smash-community-bar-track"
                        role="img"
                        aria-label={`${team.name}: ${probability.toFixed(1)} percent chance to win`}
                      >
                        <div style={{ width: `${probability}%` }} />
                      </div>
                      <b>{probability.toFixed(1)}%</b>
                    </div>
                  ))}
                </div>
              )}
              <p className="smash-community-footnote">
                Estimated from the community’s match picks across {fixtures.length} fixtures
                {completedCount > 0 ? `, with ${completedCount} recorded ${completedCount === 1 ? 'result' : 'results'} applied` : ''}.
              </p>
            </section>

            {leaderboardOpen && (
            <section className="smash-forecast" aria-labelledby="leaderboard-title">
              <div className="smash-forecast-head">
                <div>
                  <span className="smash-forecast-label">✦ PREDICTION LEADERBOARD</span>
                  <h2 id="leaderboard-title">Who is calling it right?</h2>
                  <p className="smash-muted">
                    One point for every correctly predicted winner. Ties are split by correct losing-score brackets, then by who submitted first.
                  </p>
                </div>
                <button
                  type="button"
                  className="smash-mini-button"
                  onClick={fetchLeaderboard}
                  disabled={leaderboardLoading}
                >
                  {leaderboardLoading ? 'Refreshing…' : '↻ Refresh'}
                </button>
              </div>
              {leaderboardError ? (
                <div className="smash-members-message error" role="alert">
                  <span>{leaderboardError}</span>
                  <button type="button" onClick={fetchLeaderboard} disabled={leaderboardLoading}>Try again</button>
                </div>
              ) : leaderboardLoading && !leaderboard ? (
                <div className="smash-members-message" role="status">Loading leaderboard…</div>
              ) : !leaderboard || leaderboard.rows.length === 0 ? (
                <div className="smash-members-message">
                  {completedCount === 0
                    ? 'The leaderboard fills in as soon as the first match result is recorded.'
                    : 'No scored predictions yet.'}
                </div>
              ) : (
                <div className="smash-forecast-table">
                  <p className="smash-mini-title">
                    Standings <span>· after {leaderboard.completedCount} of {leaderboard.fixtureCount} {leaderboard.fixtureCount === 1 ? 'match' : 'matches'}</span>
                  </p>
                  {leaderboard.rows.map((row) => (
                    <div
                      className={`smash-forecast-row smash-leaderboard-row ${row.id && row.id === myEntryId ? 'is-me' : ''}`}
                      key={row.id || row.name}
                    >
                      <span className="smash-rank">{row.rank}</span>
                      <strong>{row.name}{row.id && row.id === myEntryId ? ' (you)' : ''}</strong>
                      <small>
                        {row.rangeHits ? `${row.rangeHits} bracket ${row.rangeHits === 1 ? 'hit' : 'hits'}` : ''}
                        {row.rangeHits && row.pending ? ' · ' : ''}
                        {row.pending ? `${row.pending} pending` : ''}
                      </small>
                      <b>{row.correct} / {row.graded}</b>
                    </div>
                  ))}
                  {leaderboardStale && (
                    <p className="smash-leaderboard-stale" role="status">
                      New results have been recorded since this leaderboard was updated. It refreshes automatically when the next score is saved.
                    </p>
                  )}
                </div>
              )}
            </section>
            )}

            <section className="smash-member-results" aria-labelledby="member-results-title">
              <div className="smash-member-results-head">
                <div>
                  <h2 id="member-results-title">Member predictions</h2>
                </div>
                <button
                  type="button"
                  className="smash-mini-button smash-member-refresh"
                  onClick={refreshMembers}
                  disabled={loadingMembers}
                >
                  {loadingMembers ? 'Refreshing…' : '↻ Refresh'}
                </button>
              </div>
              {memberError ? (
                <div className="smash-members-message error" role="alert">
                  <span>{memberError}</span>
                  <button type="button" onClick={refreshMembers} disabled={loadingMembers}>Try again</button>
                </div>
              ) : loadingMembers ? (
                <div className="smash-members-message" role="status">Loading member predictions…</div>
              ) : members.length === 0 ? (
                <div className="smash-members-message">No member predictions yet. Be the first to submit your picks.</div>
              ) : (
                <>
                <div className="smash-member-grid" aria-label="Member predictions">
                  {(showAllMembers ? members : members.slice(0, MEMBER_PREVIEW_COUNT)).map((member) => (
                    <article className="smash-member-card" key={member.id}>
                      <div className="smash-member-name">
                        <span className="smash-member-avatar" aria-hidden="true">
                          {member.name.slice(0, 1).toUpperCase()}
                        </span>
                        <div>
                          <strong>{member.name}</strong>
                          <small>{member.playedCount} {member.playedCount === 1 ? 'match' : 'matches'} predicted</small>
                        </div>
                      </div>
                      <div className="smash-member-picks">
                        <div><span>🏆 Winner</span><b>{member.winner.name}</b></div>
                        <div><span>🥈 Runner-up</span><b>{member.runnerUp.name}</b></div>
                      </div>
                    </article>
                  ))}
                </div>
                {members.length > MEMBER_PREVIEW_COUNT && (
                  <div className="smash-member-more">
                    <button type="button" className="smash-mini-button" onClick={() => setShowAllMembers((value) => !value)}>
                      {showAllMembers ? 'Show fewer' : `Show all ${members.length} members`}
                    </button>
                  </div>
                )}
                </>
              )}
            </section>

            {isAdmin && (
              <section className="smash-admin-predictions" aria-labelledby="admin-predictions-title">
                <details className="smash-admin-collapsible">
                <summary className="smash-section-title smash-admin-summary">
                  <div>
                    <h2 id="admin-predictions-title">Admin · detailed predictions</h2>
                    <p className="smash-muted">Tap to expand, then select a member to review their individual match picks.</p>
                  </div>
                  <span className="smash-admin-total">{adminEntries.length} members <i aria-hidden="true">⌄</i></span>
                </summary>
                {adminError ? (
                  <div className="smash-members-message error" role="alert">{adminError}</div>
                ) : adminLoading ? (
                  <div className="smash-members-message" role="status">Loading detailed predictions…</div>
                ) : adminEntries.length === 0 ? (
                  <div className="smash-members-message">No detailed predictions have been submitted.</div>
                ) : (
                  <div className="smash-admin-list" aria-label="Detailed predictions by member">
                    {adminEntries.map((entry) => {
                      const memberPicks = picksFromPayload(model, entry.payload);
                      const memberGrade = gradePicks(model, memberPicks);
                      const memberPredictions = fixtures
                        .filter((fixture) => memberPicks[fixture.id]?.winner !== undefined)
                        .map((fixture) => {
                          const pick = memberPicks[fixture.id];
                          const winner = pick.winner === 0 ? fixture.team1 : fixture.team2;
                          const actual = resultPick(model, fixture);
                          return {
                            fixture,
                            pick,
                            winnerPlayers: sideNames(pick.winner === 0 ? fixture.team1Players : fixture.team2Players),
                            winnerName: winner.name,
                            outcome: actual ? (actual.winner === pick.winner ? 'hit' : 'miss') : '',
                          };
                        });
                      return (
                        <details className="smash-admin-member" key={entry.id}>
                          <summary>
                            <span>
                              <strong>{entry.payload?.predictorName || 'Tournament player'}</strong>
                              <small>
                                {memberPredictions.length} matches
                                {memberGrade.graded ? ` · ${memberGrade.correct}/${memberGrade.graded} correct` : ''}
                                {' '}· Updated {formatPredictionDate(entry.updated_at)}
                              </small>
                            </span>
                            <b>View picks <i aria-hidden="true">⌄</i></b>
                          </summary>
                          <div
                            className="smash-admin-match-list"
                                                        aria-label={`Match picks for ${entry.payload?.predictorName || 'tournament player'}`}
                          >
                            {memberPredictions.length === 0 ? (
                              <p>No match picks saved.</p>
                            ) : memberPredictions.map(({ fixture, pick, winnerPlayers, winnerName, outcome }) => (
                              <div className="smash-admin-match" key={fixture.id}>
                                <span>
                                  Match {String(fixture.number).padStart(2, '0')} · {sideNames(fixture.team1Players)} vs {sideNames(fixture.team2Players)} ({fixture.pairing.id})
                                </span>
                                <strong>
                                  <span aria-hidden="true">🏆</span> Winner pick: {winnerName} · {winnerPlayers}
                                  {outcome && <span className={outcome}> {outcome === 'hit' ? '✓' : '✗'}</span>}
                                </strong>
                                {pick.range && (
                                  <small>Losing score: {scoreRanges.find((range) => range.id === pick.range)?.label || pick.range}</small>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                )}
                </details>
              </section>
            )}

            <section aria-labelledby="squads-title">
              <div className="smash-section-title">
                <h2 id="squads-title">Meet the squads</h2>
                <span className="smash-muted">{teams.length} {teams.length === 1 ? 'team' : 'teams'}</span>
              </div>
              {teams.length === 0 ? (
                <div className="smash-empty">No teams have been added to this tournament yet.</div>
              ) : (
                <div className="smash-team-grid">
                  {teams.map((team) => (
                    <TeamCard key={team.id} team={team} players={players} onOpenPlayer={onOpenPlayer} />
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="matches-title">
              <div className="smash-section-title smash-match-section-title">
                <div>
                  <h2 id="matches-title">Match predictions</h2>
                  <p className="smash-muted">Choose the winning side in each fixture.</p>
                </div>
              </div>
              <p className="smash-notice">
                Fixtures come straight from the tournament schedule and update as matches are played.
                {scoreRanges.length > 0 ? ' Losing-team score ranges are optional and follow the tournament’s bonus rules.' : ''}
                {completedCount > 0 ? ` ${completedCount} ${completedCount === 1 ? 'match has' : 'matches have'} finished and can no longer be changed.` : ''}
              </p>
              {deadlineLabel && (
                <p className="smash-notice">
                  {submissionOpen
                    ? `Submit or update your picks by ${deadlineLabel}. No submissions are accepted after that.`
                    : `Submissions closed on ${deadlineLabel}. Your saved picks are final.`}
                </p>
              )}
              <div className="smash-matches">
                {fixtures.length ? fixtures.map((fixture) => {
                  const locked = resultPick(model, fixture);
                  return (
                    <MatchCard
                      key={fixture.id}
                      fixture={fixture}
                      scoreRanges={scoreRanges}
                      locked={Boolean(locked)}
                      disabled={!submissionOpen}
                      userPick={picks[fixture.id]}
                      pick={locked || picks[fixture.id] || EMPTY_PICK}
                      onPick={(winner) => updatePick(fixture.id, { winner: picks[fixture.id]?.winner === winner ? undefined : winner })}
                      onRange={(range) => updatePick(fixture.id, { range: picks[fixture.id]?.range === range ? null : range })}
                      onToggleScore={() => updatePick(fixture.id, { open: !picks[fixture.id]?.open })}
                    />
                  );
                }) : (
                  <div className="smash-empty">No matches available.</div>
                )}
              </div>
            </section>

            <section className="smash-forecast" aria-labelledby="forecast-title">
              <div className="smash-forecast-head">
                <div>
                  <span className="smash-forecast-label"><i /> LIVE FORECAST · UPDATES WITH EVERY PICK</span>
                  <h2 id="forecast-title">Who takes the trophy?</h2>
                  <p className="smash-muted">Projected standings and title chances based on recorded results and your match predictions.</p>
                </div>
                {submissionOpen && openFixtures.length > 0 && (
                  <button className="smash-mini-button" type="button" onClick={applySamplePicks}>Try sample picks</button>
                )}
              </div>
              <div className="smash-forecast-grid">
                <div className="smash-forecast-table">
                  <p className="smash-mini-title">Projected table <span>· predicted points</span></p>
                  {forecast.table.map((team, index) => (
                    <div className="smash-forecast-row" key={team.id}>
                      <span className="smash-rank">{index + 1}</span>
                      <strong>{team.name}</strong>
                      <small>{team.wins} wins</small>
                      <b>{team.points} pt</b>
                    </div>
                  ))}
                </div>
                <div className="smash-forecast-bars">
                  <p className="smash-mini-title">Finishing probabilities</p>
                  <div className="smash-legend">
                    <span><i />Champion</span><span><i className="runner" />Runner-up</span>
                  </div>
                  {forecast.odds.map((team) => (
                    <div className="smash-barrow" key={team.id}>
                      <div className="smash-barline">
                        <strong>{team.name}</strong>
                        <b>{team.winner.toFixed(1)}% winner · {team.runnerUp.toFixed(1)}% runner-up</b>
                      </div>
                      <div className="smash-track"><div className="smash-fill-win" style={{ width: `${team.winner}%` }} /></div>
                      <div className="smash-track runner"><div className="smash-fill-runner" style={{ width: `${team.runnerUp}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="smash-forecast-note">
                {forecast.playedCount} of {fixtures.length} fixtures decided or predicted. {scoringNote} For unpicked fixtures, each side has an equal chance in the {DEFAULT_SIMULATIONS.toLocaleString()} simulations. Unresolved ties are broken randomly, so these are scenario probabilities—not guarantees.
              </p>
            </section>

            <section className="smash-my-result" aria-live="polite">
              <div className="smash-my-result-header">
                <div>
                  <div className="smash-forecast-label">✦ YOUR PERSONAL TOURNAMENT FORECAST</div>
                  <h2>My Prediction Result</h2>
                </div>
                <span className="smash-forecast-badge">
                  {userPickCount} / {fixtures.length} games picked
                </span>
              </div>
              <div className="smash-my-result-grid">
                <div className="smash-my-result-card">
                  <div className="smash-my-result-icon">🏆</div>
                  <div className="smash-my-result-label">PREDICTED WINNER</div>
                  <div className="smash-my-result-name">{forecast.playedCount ? forecast.winner?.name : 'Make your picks'}</div>
                  <div className="smash-my-result-percent">
                    {forecast.playedCount ? `${forecast.winnerChance.toFixed(1)}%` : '—'}
                  </div>
                  <div className="smash-my-result-hint">Chance to finish 1st</div>
                </div>
                <div className="smash-my-result-card runner">
                  <div className="smash-my-result-icon">🥈</div>
                  <div className="smash-my-result-label">PREDICTED RUNNER-UP</div>
                  <div className="smash-my-result-name">{forecast.playedCount ? forecast.runnerUp?.name : 'Make your picks'}</div>
                  <div className="smash-my-result-percent">
                    {forecast.playedCount ? `${forecast.runnerUpChance.toFixed(1)}%` : '—'}
                  </div>
                  <div className="smash-my-result-hint">Chance to finish 2nd</div>
                </div>
              </div>
              {forecast.playedCount > 0 && (
                <p className="smash-my-result-caption">
                  Based on recorded results, your picks and {DEFAULT_SIMULATIONS.toLocaleString()} simulated tournament outcomes. The most likely winner and runner-up are calculated independently.
                </p>
              )}
            </section>

            {(formError || saveError) && !identityDialogOpen && (
              <div className="smash-inline-error" role="alert">{formError || saveError}</div>
            )}
            {submitted && (
              <div className="smash-submit-success" role="status">
                Your predictions are saved. Adjust your picks and update this entry before you leave.
              </div>
            )}
          </>
        )}
      </div>

      {tournament && (
        <div className="smash-sticky">
          <div className="smash-sticky-inner">
            <div className="smash-sticky-summary">
              <b id="summary">{userPickCount} of {fixtures.length} picks completed</b>
              <div className="smash-progress"><div style={{ width: `${progress}%` }} /></div>
            </div>
            <button
              className="smash-primary"
              type="button"
              id="submit"
              disabled={busy || identityBusy || userPickCount === 0 || !submissionOpen}
              onClick={submitPredictions}
            >
              {!submissionOpen ? 'Submissions closed' : busy ? 'Saving…' : submitted ? 'Update predictions →' : 'Submit predictions →'}
            </button>
          </div>
        </div>
      )}

      {identityName && fixtures.length > 0 && allOpenPicked && userPickCount > 0 && (
        <button
          className="smash-whatsapp-float"
          type="button"
          onClick={sharePredictionOnWhatsApp}
          aria-label="Share prediction on WhatsApp"
          title="Share prediction on WhatsApp"
        >
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M16.04 3C8.9 3 3.1 8.75 3.1 15.84c0 2.27.6 4.48 1.75 6.42L3 29l6.94-1.81a13.1 13.1 0 0 0 6.1 1.5h.01c7.14 0 12.95-5.76 12.95-12.85A12.75 12.75 0 0 0 16.04 3Zm.01 23.52h-.01a10.9 10.9 0 0 1-5.55-1.51l-.4-.24-4.12 1.08 1.1-4-.26-.41a10.68 10.68 0 0 1-1.67-5.6c0-5.98 4.9-10.85 10.92-10.85 2.92 0 5.66 1.13 7.72 3.18a10.76 10.76 0 0 1 3.2 7.68c0 5.98-4.9 10.85-10.93 10.85Zm5.99-8.13c-.33-.16-1.95-.96-2.25-1.07-.3-.11-.52-.16-.74.16-.22.32-.85 1.07-1.04 1.29-.19.22-.38.24-.71.08-.33-.16-1.39-.51-2.65-1.62-.98-.87-1.64-1.94-1.83-2.27-.19-.32-.02-.5.14-.66.15-.14.33-.38.49-.57.16-.19.22-.32.33-.54.11-.22.06-.4-.03-.57-.08-.16-.74-1.77-1.01-2.42-.27-.63-.54-.54-.74-.55l-.63-.01c-.22 0-.57.08-.87.4-.3.32-1.14 1.11-1.14 2.7s1.17 3.13 1.34 3.35c.16.22 2.3 3.49 5.57 4.9.78.34 1.39.55 1.86.7.78.24 1.49.21 2.05.13.63-.1 1.95-.8 2.23-1.56.27-.77.27-1.43.19-1.56-.08-.14-.3-.22-.63-.38Z" />
          </svg>
        </button>
      )}

      {identityDialogOpen && tournament && (
        <IdentityDialog
          onClose={() => {
            if (!identityBusy) setIdentityDialogOpen(false);
          }}
          onContinue={continueWithIdentity}
          onClearError={() => {
            setFormError('');
            setSaveError('');
          }}
          busy={identityBusy}
          error={formError}
          initialMobile={identityMobile}
        />
      )}
    </div>
  );
}
