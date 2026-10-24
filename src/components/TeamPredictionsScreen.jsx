import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './TeamPredictionsScreen.css';
import { TEAMS, PAIRINGS, FIXTURES, getFixturePlayers } from '../data/teamMatchFixtures.js';

const SCORE_RANGES = [
  { id: 'below10', label: 'Below 10', detail: 'Winner +5 · Loser −1' },
  { id: '10to16', label: '10–16', detail: 'Winner +3' },
  { id: '17to21', label: '17–21', detail: 'No bonus' },
];
const TOTAL_PLAYERS = TEAMS.reduce((total, team) => total + team.players.length, 0);
const SIMULATIONS = 6000;
const MIN_CORRECT_FOR_WIN = 31;

function calculateForecast(picks) {
  const played = FIXTURES.filter((fixture) => picks[fixture.id]?.winner !== undefined);
  const remaining = FIXTURES.filter((fixture) => picks[fixture.id]?.winner === undefined);
  const scores = Array(TEAMS.length).fill(0);
  const wins = Array(TEAMS.length).fill(0);

  if (played.length === 0) {
    return {
      playedCount: 0,
      winner: TEAMS[0],
      runnerUp: TEAMS[1],
      winnerChance: 0,
      runnerUpChance: 0,
      table: TEAMS.map((team) => ({ ...team, wins: 0, points: 0 })),
      odds: TEAMS.map((team) => ({ ...team, winner: 0, runnerUp: 0 })),
    };
  }

  function applyPick(fixture, winnerSide, targetScores, targetWins, range) {
    const winner = winnerSide === 0 ? fixture.team1.id - 1 : fixture.team2.id - 1;
    const loser = winnerSide === 0 ? fixture.team2.id - 1 : fixture.team1.id - 1;
    targetWins[winner] += 1;
    targetScores[winner] += 10;
    if (range === 'below10') {
      targetScores[winner] += 5;
      targetScores[loser] -= 1;
    } else if (range === '10to16') {
      targetScores[winner] += 3;
    }
  }

  for (const fixture of played) {
    const pick = picks[fixture.id];
    applyPick(fixture, pick.winner, scores, wins, pick.range);
  }

  let seed = 2463534242;
  for (const fixture of played) {
    const pick = picks[fixture.id];
    seed = (Math.imul(seed ^ (fixture.team1.id * 67 + fixture.team2.id * 17 + fixture.number * 7 + pick.winner), 1664525) + 1013904223) >>> 0;
  }
  if (seed === 0) seed = 2463534242;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }

  const firstPlace = Array(TEAMS.length).fill(0);
  const secondPlace = Array(TEAMS.length).fill(0);
  for (let trial = 0; trial < SIMULATIONS; trial += 1) {
    const trialScores = scores.slice();
    const trialWins = wins.slice();
    for (const fixture of remaining) {
      applyPick(fixture, random() < 0.5 ? 0 : 1, trialScores, trialWins, null);
    }
    const ranking = TEAMS.map((team) => ({ id: team.id - 1, tie: random() })).sort(
      (left, right) =>
        trialScores[right.id] - trialScores[left.id] ||
        trialWins[right.id] - trialWins[left.id] ||
        left.tie - right.tie
    );
    firstPlace[ranking[0].id] += 1;
    secondPlace[ranking[1].id] += 1;
  }

  const winnerId = firstPlace.indexOf(Math.max(...firstPlace));
  const runnerUpId = TEAMS.map((team) => team.id - 1)
    .filter((id) => id !== winnerId)
    .sort((left, right) => secondPlace[right] - secondPlace[left])[0];
  const table = TEAMS.map((team) => ({
    ...team,
    wins: wins[team.id - 1],
    points: scores[team.id - 1],
  })).sort((left, right) => right.points - left.points || right.wins - left.wins || left.id - right.id);
  const odds = TEAMS.map((team) => ({
    ...team,
    winner: firstPlace[team.id - 1] / SIMULATIONS * 100,
    runnerUp: secondPlace[team.id - 1] / SIMULATIONS * 100,
  })).sort((left, right) => right.winner - left.winner);

  return {
    playedCount: played.length,
    winner: TEAMS[winnerId],
    runnerUp: TEAMS[runnerUpId],
    winnerChance: firstPlace[winnerId] / SIMULATIONS * 100,
    runnerUpChance: secondPlace[runnerUpId] / SIMULATIONS * 100,
    table,
    odds,
  };
}

function calculateCommunityOdds(analytics) {
  const firstPlace = Array(TEAMS.length).fill(0);
  const fixtureStats = analytics?.fixtures || {};
  let seed = 1831565813;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }

  for (let trial = 0; trial < SIMULATIONS; trial += 1) {
    const scores = Array(TEAMS.length).fill(0);
    const wins = Array(TEAMS.length).fill(0);
    for (const fixture of FIXTURES) {
      const stats = fixtureStats[fixture.id] || {};
      const team1Votes = Number(stats.team1Votes) || 0;
      const team2Votes = Number(stats.team2Votes) || 0;
      const totalVotes = team1Votes + team2Votes;
      const team1WinShare = totalVotes > 0 ? team1Votes / totalVotes : 0.5;
      const winnerSide = random() >= team1WinShare ? 1 : 0;
      const winnerIndex = (winnerSide === 0 ? fixture.team1 : fixture.team2).id - 1;
      const loserIndex = (winnerSide === 0 ? fixture.team2 : fixture.team1).id - 1;
      const side = winnerSide === 0 ? 'team1' : 'team2';
      const sideVotes = winnerSide === 0 ? team1Votes : team2Votes;
      const rangeCounts = stats[`${side}ScoreRanges`] || {};
      const rangesTotal = Object.values(rangeCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);
      const noRangeCount = Math.max(0, sideVotes - rangesTotal);
      let rangeRoll = random() * Math.max(1, sideVotes);
      let range = null;
      if (rangeRoll >= noRangeCount) {
        rangeRoll -= noRangeCount;
        for (const scoreRange of SCORE_RANGES) {
          const count = Number(rangeCounts[scoreRange.id]) || 0;
          if (rangeRoll < count) {
            range = scoreRange.id;
            break;
          }
          rangeRoll -= count;
        }
      }
      scores[winnerIndex] += 10;
      wins[winnerIndex] += 1;
      if (range === 'below10') {
        scores[winnerIndex] += 5;
        scores[loserIndex] -= 1;
      } else if (range === '10to16') {
        scores[winnerIndex] += 3;
      }
    }
    const ranking = TEAMS.map((team) => ({ index: team.id - 1, tie: random() })).sort(
      (left, right) =>
        scores[right.index] - scores[left.index] ||
        wins[right.index] - wins[left.index] ||
        left.tie - right.tie
    );
    firstPlace[ranking[0].index] += 1;
  }

  return TEAMS.map((team) => ({
    team,
    probability: firstPlace[team.id - 1] / SIMULATIONS * 100,
  })).sort((left, right) => right.probability - left.probability);
}

function forecastFromSubmission(submission) {
  const picks = {};
  for (const prediction of submission?.payload?.predictions || []) {
    const fixture = FIXTURES.find((item) => item.id === prediction?.fixtureId);
    if (!fixture) continue;
    const winnerId = Number(prediction.winnerTeamId);
    if (winnerId === fixture.team1.id) {
      picks[fixture.id] = { winner: 0, range: prediction.losingScoreRange || null };
    } else if (winnerId === fixture.team2.id) {
      picks[fixture.id] = { winner: 1, range: prediction.losingScoreRange || null };
    }
  }
  const result = calculateForecast(picks);
  return {
    playedCount: result.playedCount,
    winner: result.winner,
    runnerUp: result.runnerUp,
  };
}

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

function TeamCard({ team }) {
  return (
    <article className="smash-team-card">
      <div className="smash-team-number">SQUAD 0{team.id}</div>
      <h3>{team.name}</h3>
      <ul>
        {team.players.map((player, index) => (
          <li key={player}>
            <b>{String.fromCharCode(65 + index)}</b>
            <span>{player.toUpperCase()}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function MatchCard({ fixture, pick, onPick, onRange, onToggleScore }) {
  const team1Players = getFixturePlayers(fixture, fixture.team1);
  const team2Players = getFixturePlayers(fixture, fixture.team2);
  return (
    <article className="smash-match">
      <div className="smash-match-top">
        <span>
          Match {String(fixture.number).padStart(2, '0')} - {fixture.team1.name} vs {fixture.team2.name} ({fixture.pairing.id})
        </span>
        <span>{pick.winner !== undefined ? '✓ PICKED' : 'AWAITING PICK'}</span>
      </div>
      <div className="smash-versus">
        <button
          type="button"
          className={`smash-side ${pick.winner === 0 ? 'selected' : ''}`}
          onClick={() => onPick(0)}
          aria-pressed={pick.winner === 0}
        >
          <strong>{team1Players}</strong>
          {pick.winner === 0 && <small>✓ WINNER</small>}
        </button>
        <span className="smash-vs">VS</span>
        <button
          type="button"
          className={`smash-side ${pick.winner === 1 ? 'selected' : ''}`}
          onClick={() => onPick(1)}
          aria-pressed={pick.winner === 1}
        >
          <strong>{team2Players}</strong>
          {pick.winner === 1 && <small>✓ WINNER</small>}
        </button>
      </div>
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
            {SCORE_RANGES.map((range) => (
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
    </article>
  );
}

function IdentityDialog({
  onClose,
  onContinue,
  busy,
  error,
  onClearError,
  initialMobile = '',
}) {
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

export default function TeamPredictionsScreen({
  onSave,
  loadPredictionByMobile,
  loadPlayerByMobile,
  publishLegacySummary,
  loadPredictions,
  loadPredictionDetails,
  loadPredictionAnalytics,
  initializePredictionAnalytics,
  isAdmin = false,
  authenticatedMobile = '',
  onPredictionIdentity,
  busy = false,
  onOpenFixtures,
}) {
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
  const restoredMobileRef = useRef('');
  const forecast = useMemo(() => calculateForecast(picks), [picks]);
  const communityOdds = useMemo(() => calculateCommunityOdds(analytics), [analytics]);
  const members = useMemo(
    () =>
      memberEntries
        .map((entry) => {
          const storedSummary = entry.summary;
          const summary = storedSummary
            ? {
                playedCount: storedSummary.playedCount,
                winner: TEAMS.find((team) => team.id === storedSummary.winnerTeamId),
                runnerUp: TEAMS.find((team) => team.id === storedSummary.runnerUpTeamId),
              }
            : forecastFromSubmission(entry);
          return {
            id: entry.id,
            name: entry.payload?.predictorName || 'Tournament player',
            updatedAt: entry.updated_at,
            ...summary,
          };
        })
        .filter((entry) => entry.winner && entry.runnerUp)
        .filter((entry) => entry.playedCount > 0),
    [memberEntries]
  );
  const refreshMembers = useCallback(async () => {
    if (!loadPredictions) {
      setMemberEntries([]);
      setLoadingMembers(false);
      setMemberError('Member predictions are not available.');
      return;
    }
    setLoadingMembers(true);
    setMemberError('');
    try {
      const entries = await loadPredictions();
      setMemberEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      setMemberError(error?.message || 'Unable to load member predictions.');
    } finally {
      setLoadingMembers(false);
    }
  }, [loadPredictions]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    const mobile = normalizeMobile(authenticatedMobile);
    if (!mobile || restoredMobileRef.current === mobile) return;
    restoredMobileRef.current = mobile;
    continueWithIdentity({ mobile }).catch(() => {});
  }, [authenticatedMobile]);

  useEffect(() => {
    let active = true;
    const getAnalytics = isAdmin && initializePredictionAnalytics
      ? initializePredictionAnalytics
      : loadPredictionAnalytics;
    if (!getAnalytics) return undefined;
    getAnalytics()
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
  }, [initializePredictionAnalytics, isAdmin, loadPredictionAnalytics]);

  useEffect(() => {
    let active = true;
    if (!isAdmin || !loadPredictionDetails) {
      setAdminEntries([]);
      setAdminLoading(false);
      setAdminError('');
      return undefined;
    }
    setAdminLoading(true);
    setAdminError('');
    loadPredictionDetails()
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
  }, [isAdmin, loadPredictionDetails]);

  function updatePick(fixtureId, changes) {
    setPicks((current) => ({
      ...current,
      [fixtureId]: { winner: undefined, range: null, open: false, ...current[fixtureId], ...changes },
    }));
    setFormError('');
    setSaveError('');
    setSubmitted(false);
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
      const saved = await loadPredictionByMobile(memberMobile);
      const payload = saved?.payload;
      if (payload?.kind === 'team-match-predictions') {
        const restoredPicks = {};
        for (const prediction of payload.predictions || []) {
          const fixture = FIXTURES.find((item) => item.id === prediction?.fixtureId);
          if (!fixture) continue;
          const winnerTeamId = Number(prediction.winnerTeamId);
          const winner =
            winnerTeamId === fixture.team1.id ? 0 :
              winnerTeamId === fixture.team2.id ? 1 : undefined;
          if (winner === undefined) continue;
          restoredPicks[fixture.id] = {
            winner,
            range: prediction.losingScoreRange || null,
            open: false,
          };
        }
        setPicks(restoredPicks);
        const name = String(payload.predictorName || memberName).trim();
        setIdentityName(name);
        setIdentityMobile(memberMobile);
        setSubmitted(Object.keys(restoredPicks).length > 0);
        if (publishLegacySummary && Object.keys(restoredPicks).length > 0 && saved?.id) {
          const restoredSummary = forecastFromSubmission(saved);
          try {
            await publishLegacySummary({
              id: saved.id,
              summary: {
                predictorName: name,
                winnerTeamId: restoredSummary.winner.id,
                runnerUpTeamId: restoredSummary.runnerUp.id,
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
      setFormError('Enter your name and mobile number to continue.');
      setIdentityDialogOpen(true);
      return;
    }
    if (forecast.playedCount === 0) {
      setFormError('Pick at least one match winner first.');
      return;
    }
    setFormError('');
    setSaveError('');
    const predictions = FIXTURES
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
      await onSave({
        name: identityName,
        mobile: identityMobile,
        predictions,
        publicSummary: {
          predictorName: identityName,
          winnerTeamId: forecast.winner.id,
          runnerUpTeamId: forecast.runnerUp.id,
          playedCount: forecast.playedCount,
        },
      });
      setSubmitted(true);
      await refreshMembers();
    } catch (error) {
      setSaveError(error?.message || 'Unable to save your predictions. Please try again.');
    }
  }

  function openIdentityDialog() {
    setFormError('');
    setSaveError('');
    setIdentityDialogOpen(true);
  }

  function sharePredictionOnWhatsApp() {
    if (!identityName || forecast.playedCount === 0) return;

    const message = [
      '🏸 *WHITEFEATHER · SMASH PICKS*',
      '━━━━━━━━━━━━━━━━━━━━',
      `👤 *${identityName}*`,
      '',
      `🏆 Projected winner: *${forecast.winner.name}*`,
      `🥈 Runner-up: *${forecast.runnerUp.name}*`,
      '',
      '🎯 Predict more than 30 games correctly to qualify.',
      '━━━━━━━━━━━━━━━━━━━━',
      'Create your prediction: https://white-feather.web.app/predictions',
    ].join('\n');

    const shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }

  function applySamplePicks() {
    const sample = {};
    FIXTURES.forEach((fixture, index) => {
      sample[fixture.id] = {
        winner: (index * 13 + Math.floor(index / PAIRINGS.length)) % 3 === 0 ? 0 : 1,
        range: null,
        open: false,
      };
    });
    setPicks(sample);
    setFormError('');
    setSaveError('');
    setSubmitted(false);
  }

  return (
    <div className="smash-picks">
      <div className="smash-picks-shell">
        <nav className="smash-nav" aria-label="Tournament predictions">
          <div className="smash-brand">
            <span className="smash-mark">✳</span>
            <span>SMASH<span>PICKS</span></span>
          </div>
          <span className="smash-pill">
            🏸 MORNING BATCH · 2026
            <button type="button" onClick={onOpenFixtures} className="smash-fixtures-link">
              Fixtures
            </button>
          </span>
        </nav>

        <section className="smash-hero">
          <div>
            <div className="smash-eyebrow">NOVEMBER 15, 2026 · TOURNAMENT DAY</div>
            <h1>PREDICT &amp;<br /><span>WIN PRIZES.</span></h1>
            <p className="smash-muted">
              Correctly predict more than 30 games to qualify. One winner will be selected from everyone who qualifies. That means at least {MIN_CORRECT_FOR_WIN} correct picks.
            </p>
          </div>
          <div className="smash-hero-card">
            <div className="smash-eyebrow">YOUR PREDICTION CARD</div>
            <div>
              <strong>{forecast.playedCount} / {FIXTURES.length}</strong>
              <p className="smash-muted">Matches predicted</p>
            </div>
            <div className="smash-hero-card-footer">
              {identityMobile && (
                <div className="smash-welcome">Welcome, {identityName}!</div>
              )}
            </div>
          </div>
        </section>

        <div className="smash-stats" aria-label="Tournament details">
          <div className="smash-stat"><b>05</b><small>Teams</small></div>
          <div className="smash-stat"><b>{TOTAL_PLAYERS}</b><small>Players</small></div>
          <div className="smash-stat"><b>{FIXTURES.length}</b><small>Fixtures</small></div>
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
          ) : analytics.submissions === 0 ? (
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
            Estimated from the community’s match picks across {FIXTURES.length} fixtures.
          </p>
        </section>

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
            <div className="smash-member-grid">
              {members.map((member) => (
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
          )}
        </section>

        {isAdmin && (
          <section className="smash-admin-predictions" aria-labelledby="admin-predictions-title">
            <div className="smash-section-title">
              <div>
                <h2 id="admin-predictions-title">Admin · detailed predictions</h2>
                <p className="smash-muted">Select a member to review their individual match picks.</p>
              </div>
              <span className="smash-admin-total">{adminEntries.length} members</span>
            </div>
            {adminError ? (
              <div className="smash-members-message error" role="alert">{adminError}</div>
            ) : adminLoading ? (
              <div className="smash-members-message" role="status">Loading detailed predictions…</div>
            ) : adminEntries.length === 0 ? (
              <div className="smash-members-message">No detailed predictions have been submitted.</div>
            ) : (
              <div className="smash-admin-list">
                {adminEntries.map((entry) => {
                  const memberPredictions = (entry.payload?.predictions || [])
                    .map((prediction) => {
                      const fixture = FIXTURES.find((item) => item.id === prediction.fixtureId);
                      const winnerTeamId = Number(prediction.winnerTeamId);
                      if (!fixture || ![fixture.team1.id, fixture.team2.id].includes(winnerTeamId)) return null;
                      const winner = winnerTeamId === fixture.team1.id ? fixture.team1 : fixture.team2;
                      return {
                        fixture,
                        prediction,
                        winnerPlayers: getFixturePlayers(fixture, winner),
                      };
                    })
                    .filter(Boolean)
                    .sort((left, right) => left.fixture.number - right.fixture.number);
                  return (
                    <details className="smash-admin-member" key={entry.id}>
                      <summary>
                        <span>
                          <strong>{entry.payload?.predictorName || 'Tournament player'}</strong>
                          <small>{memberPredictions.length} matches · Updated {formatPredictionDate(entry.updated_at)}</small>
                        </span>
                        <b>View picks <i aria-hidden="true">⌄</i></b>
                      </summary>
                      <div className="smash-admin-match-list">
                        {memberPredictions.length === 0 ? (
                          <p>No match picks saved.</p>
                        ) : memberPredictions.map(({ fixture, prediction, winnerPlayers }) => (
                          <div className="smash-admin-match" key={fixture.id}>
                            <span>Match {String(fixture.number).padStart(2, '0')} · {getFixturePlayers(fixture, fixture.team1)} vs {getFixturePlayers(fixture, fixture.team2)} ({fixture.pairing.id})</span>
                            <strong><span aria-hidden="true">🏆</span> Winner pick: {winnerPlayers}</strong>
                            {prediction.losingScoreRange && (
                              <small>Losing score: {SCORE_RANGES.find((range) => range.id === prediction.losingScoreRange)?.label || prediction.losingScoreRange}</small>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="squads-title">
          <div className="smash-section-title">
            <h2 id="squads-title">Meet the squads</h2>
            <span className="smash-muted">A → E player tiers</span>
          </div>
          <div className="smash-team-grid">
            {TEAMS.map((team) => <TeamCard key={team.id} team={team} />)}
          </div>
        </section>

        <section aria-labelledby="matches-title">
          <div className="smash-section-title smash-match-section-title">
            <div>
              <h2 id="matches-title">Match predictions</h2>
              <p className="smash-muted">Choose the winning side in each fixture.</p>
            </div>
          </div>
          <p className="smash-notice">
            Fixtures are generated from the team pairings in the tournament rules: A+B, A+C, B+D and C+E. Each team matchup includes all four pairings. Losing-team score ranges are optional.
          </p>
          <div className="smash-matches">
            {FIXTURES.length ? FIXTURES.map((fixture) => (
              <MatchCard
                key={fixture.id}
                fixture={fixture}
                pick={picks[fixture.id] || { winner: undefined, range: null, open: false }}
                onPick={(winner) => updatePick(fixture.id, { winner })}
                onRange={(range) => updatePick(fixture.id, { range: picks[fixture.id]?.range === range ? null : range })}
                onToggleScore={() => updatePick(fixture.id, { open: !picks[fixture.id]?.open })}
              />
            )) : (
              <div className="smash-empty">No matches available.</div>
            )}
          </div>
        </section>

        <section className="smash-forecast" aria-labelledby="forecast-title">
          <div className="smash-forecast-head">
            <div>
              <span className="smash-forecast-label"><i /> LIVE FORECAST · UPDATES WITH EVERY PICK</span>
              <h2 id="forecast-title">Who takes the trophy?</h2>
              <p className="smash-muted">Projected standings and title chances based on your match predictions.</p>
            </div>
            <button className="smash-mini-button" type="button" onClick={applySamplePicks}>Try sample picks</button>
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
            {forecast.playedCount} of {FIXTURES.length} fixtures predicted. A win is worth 10 base points. A losing score below 10 adds 5 points to the winner and −1 to the loser; 10–16 adds 3 points to the winner; 17–21 adds no bonus. For unpicked fixtures, each side has an equal chance in the {SIMULATIONS.toLocaleString()} simulations. Unresolved ties are broken randomly, so these are scenario probabilities—not guarantees.
          </p>
        </section>

        <section className="smash-my-result" aria-live="polite">
          <div className="smash-my-result-header">
            <div>
              <div className="smash-forecast-label">✦ YOUR PERSONAL TOURNAMENT FORECAST</div>
              <h2>My Prediction Result</h2>
            </div>
            <span className="smash-forecast-badge">
              {forecast.playedCount} / {FIXTURES.length} games picked
            </span>
          </div>
          <div className="smash-my-result-grid">
            <div className="smash-my-result-card">
              <div className="smash-my-result-icon">🏆</div>
              <div className="smash-my-result-label">PREDICTED WINNER</div>
              <div className="smash-my-result-name">{forecast.playedCount ? forecast.winner.name : 'Make your picks'}</div>
              <div className="smash-my-result-percent">
                {forecast.playedCount ? `${forecast.winnerChance.toFixed(1)}%` : '—'}
              </div>
              <div className="smash-my-result-hint">Chance to finish 1st</div>
            </div>
            <div className="smash-my-result-card runner">
              <div className="smash-my-result-icon">🥈</div>
              <div className="smash-my-result-label">PREDICTED RUNNER-UP</div>
              <div className="smash-my-result-name">{forecast.playedCount ? forecast.runnerUp.name : 'Make your picks'}</div>
              <div className="smash-my-result-percent">
                {forecast.playedCount ? `${forecast.runnerUpChance.toFixed(1)}%` : '—'}
              </div>
              <div className="smash-my-result-hint">Chance to finish 2nd</div>
            </div>
          </div>
          {forecast.playedCount > 0 && (
            <p className="smash-my-result-caption">
              Based on your picks and {SIMULATIONS.toLocaleString()} simulated tournament outcomes. The most likely winner and runner-up are calculated independently.
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
      </div>

      <div className="smash-sticky">
        <div className="smash-sticky-inner">
          <div className="smash-sticky-summary">
            <b id="summary">{forecast.playedCount} of {FIXTURES.length} picks completed</b>
            <div className="smash-progress"><div style={{ width: `${forecast.playedCount / FIXTURES.length * 100}%` }} /></div>
          </div>
          <button
            className="smash-primary"
            type="button"
            id="submit"
            disabled={busy || identityBusy || forecast.playedCount === 0}
            onClick={submitPredictions}
          >
            {busy ? 'Saving…' : submitted ? 'Update predictions →' : 'Submit predictions →'}
          </button>
        </div>
      </div>

      {identityName && forecast.playedCount === FIXTURES.length && (
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

      {identityDialogOpen && (
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
