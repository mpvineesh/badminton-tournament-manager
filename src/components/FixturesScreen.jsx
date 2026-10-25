import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FIXTURES, TEAMS } from '../data/teamMatchFixtures.js';
import { normalizeLegacyResult } from '../utils/legacyPredictionResults.js';
import PlayerProfileLink from './PlayerProfileLink.jsx';
import './FixturesScreen.css';

// Admin-only inline editor for one fixture's final score. Results feed the
// prediction leaderboard on the /predictions page.
function ResultEditor({ fixture, result, onSave, busy }) {
  const [team1Score, setTeam1Score] = useState(result ? String(result.team1Score) : '');
  const [team2Score, setTeam2Score] = useState(result ? String(result.team2Score) : '');
  const [error, setError] = useState('');

  useEffect(() => {
    setTeam1Score(result ? String(result.team1Score) : '');
    setTeam2Score(result ? String(result.team2Score) : '');
  }, [result]);

  async function submit(event) {
    event.preventDefault();
    const draft = normalizeLegacyResult(fixture, { team1Score, team2Score });
    if (!draft) {
      setError('Enter two different whole-number scores.');
      return;
    }
    setError('');
    try {
      await onSave(fixture.id, { team1Score: draft.team1Score, team2Score: draft.team2Score });
    } catch (saveError) {
      setError(saveError?.message || 'Unable to save the result.');
    }
  }

  async function clear() {
    setError('');
    try {
      await onSave(fixture.id, null);
    } catch (saveError) {
      setError(saveError?.message || 'Unable to clear the result.');
    }
  }

  return (
    <form className="fixture-result-form" onSubmit={submit} aria-label={`Update result for match ${fixture.number}`}>
      <label>
        <span>{fixture.team1.name}</span>
        <input type="number" inputMode="numeric" min={0} max={40} value={team1Score}
          onChange={(event) => setTeam1Score(event.target.value)} disabled={busy} />
      </label>
      <label>
        <span>{fixture.team2.name}</span>
        <input type="number" inputMode="numeric" min={0} max={40} value={team2Score}
          onChange={(event) => setTeam2Score(event.target.value)} disabled={busy} />
      </label>
      <button type="submit" className="primary" disabled={busy}>{busy ? '…' : result ? 'Update' : 'Save'}</button>
      <button type="button" onClick={clear} disabled={busy || !result}>Clear</button>
      {error && <div className="fixture-result-error" role="alert" style={{ gridColumn: '1 / -1' }}>{error}</div>}
    </form>
  );
}

function FixturePrediction({ fixture, stats, loading, error, compact = false }) {
  if (loading) {
    return <div className="fixture-prediction fixture-prediction-empty">Loading community picks…</div>;
  }
  if (error) {
    return <div className="fixture-prediction fixture-prediction-empty">Community picks unavailable</div>;
  }

  const team1Votes = Number(stats?.team1Votes) || 0;
  const team2Votes = Number(stats?.team2Votes) || 0;
  const totalVotes = team1Votes + team2Votes;
  if (!totalVotes) {
    return <div className="fixture-prediction fixture-prediction-empty">No match predictions yet</div>;
  }

  const team1Share = team1Votes / totalVotes * 100;
  const team2Share = team2Votes / totalVotes * 100;
  const mostPicked = team1Votes === team2Votes
    ? 'Evenly picked'
    : `Most picked: ${team1Votes > team2Votes ? fixture.team1.name : fixture.team2.name}`;
  return (
    <div className={`fixture-prediction ${compact ? 'is-compact' : ''}`}>
      <div className="fixture-prediction-top">
        <b>{team1Share.toFixed(0)}%</b>
        <span>Community predictions</span>
        <b>{team2Share.toFixed(0)}%</b>
      </div>
      <div
        className="fixture-prediction-bar"
        role="img"
        aria-label={`${fixture.team1.name} ${team1Share.toFixed(0)} percent, ${fixture.team2.name} ${team2Share.toFixed(0)} percent`}
      >
        <span style={{ width: `${team1Share}%` }} />
        <span style={{ width: `${team2Share}%` }} />
      </div>
      <div className="fixture-prediction-bottom">
        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
        <b>{mostPicked}</b>
      </div>
    </div>
  );
}

export default function FixturesScreen({
  onOpenPredictions,
  loadPredictionAnalytics,
  loadResults,
  onSaveResult,
  isAdmin = false,
  players = [],
  rosterPlayerIds = {},
  onOpenPlayer,
}) {
  const [teamId, setTeamId] = useState('all');
  const [view, setView] = useState('cards');
  const [analytics, setAnalytics] = useState({ submissions: 0, fixtures: {} });
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [results, setResults] = useState({});
  const [resultsError, setResultsError] = useState('');
  const [savingFixtureId, setSavingFixtureId] = useState('');
  const resultsByFixture = useMemo(
    () => Object.fromEntries(FIXTURES.map((fixture) => [fixture.id, normalizeLegacyResult(fixture, results?.[fixture.id])])),
    [results]
  );
  const completedCount = Object.values(resultsByFixture).filter(Boolean).length;

  const refreshResults = useCallback(async () => {
    if (!loadResults) return;
    try {
      setResults((await loadResults()) || {});
      setResultsError('');
    } catch (error) {
      setResultsError(error?.message || 'Unable to load match results.');
    }
  }, [loadResults]);

  useEffect(() => {
    refreshResults();
  }, [refreshResults]);

  async function saveResult(fixtureId, result) {
    if (!onSaveResult) return;
    setSavingFixtureId(fixtureId);
    try {
      const next = await onSaveResult(fixtureId, result);
      if (next && typeof next === 'object') setResults(next);
      else await refreshResults();
    } finally {
      setSavingFixtureId('');
    }
  }
  const visibleFixtures = useMemo(
    () =>
      teamId === 'all'
        ? FIXTURES
        : FIXTURES.filter(
            (fixture) =>
              fixture.team1.id === Number(teamId) || fixture.team2.id === Number(teamId)
          ),
    [teamId]
  );

  useEffect(() => {
    let active = true;
    if (!loadPredictionAnalytics) {
      setAnalyticsLoading(false);
      return undefined;
    }
    loadPredictionAnalytics()
      .then((result) => {
        if (active) {
          setAnalytics(result || { submissions: 0, fixtures: {} });
          setAnalyticsError('');
        }
      })
      .catch((error) => {
        if (active) setAnalyticsError(error?.message || 'Unable to load prediction indicators.');
      })
      .finally(() => {
        if (active) setAnalyticsLoading(false);
      });
    return () => { active = false; };
  }, [loadPredictionAnalytics]);

  return (
    <div className="fixtures-page">
      <div className="fixtures-shell">
        <nav className="fixtures-nav" aria-label="Fixtures">
          <div className="fixtures-brand">
            <span aria-hidden="true">✳</span>
            <strong>SMASH<span>PICKS</span></strong>
          </div>
          <div className="fixtures-nav-actions">
            <button type="button" className="fixtures-back" onClick={onOpenPredictions}>
              ← Predictions
            </button>
          </div>
        </nav>

        <header className="fixtures-heading">
          <div className="fixtures-heading-copy">
            <div className="fixtures-eyebrow">WHITEFEATHER · MORNING BATCH 2026</div>
            <h1>Match fixtures</h1>
            <p>Browse every team matchup or filter to follow one team’s schedule.</p>
          </div>
          <div className="fixtures-tools">
            <label className="fixtures-filter" aria-label="Filter fixtures by team">
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                <option value="all">All teams</option>
                {TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="fixtures-view-toggle" role="group" aria-label="Fixture view">
              <button
                type="button"
                className={view === 'cards' ? 'active' : ''}
                aria-pressed={view === 'cards'}
                onClick={() => setView('cards')}
              >
                Cards
              </button>
              <button
                type="button"
                className={view === 'list' ? 'active' : ''}
                aria-pressed={view === 'list'}
                onClick={() => setView('list')}
              >
                List
              </button>
            </div>
          </div>
        </header>

        <div className="fixtures-summary" role="status">
          <strong>{visibleFixtures.length}</strong>
          <span>
            {visibleFixtures.length === 1 ? 'match' : 'matches'}
            {teamId !== 'all'
              ? ` for ${TEAMS.find((team) => team.id === Number(teamId))?.name}`
              : ' across all teams'}
            {completedCount > 0 ? ` · ${completedCount} completed` : ''}
          </span>
        </div>
        {analyticsError && (
          <div className="fixtures-analytics-error" role="alert">{analyticsError}</div>
        )}
        {resultsError && (
          <div className="fixtures-analytics-error" role="alert">{resultsError}</div>
        )}
        {isAdmin && (
          <p className="fixture-result-note">
            Admin: enter the final score under a fixture to record its result. The prediction leaderboard updates as soon as a result is saved.
          </p>
        )}

        <section
          className={`fixtures-grid ${view === 'list' ? 'is-list' : ''}`}
          aria-label="Match fixture list"
        >
          {visibleFixtures.map((fixture) => {
            const result = resultsByFixture[fixture.id];
            return (
            <article className="fixture-card" key={fixture.id}>
              <div className="fixture-card-title">
                <span>
                  Match {String(fixture.number).padStart(2, '0')}
                  {result && <span className="fixture-status is-final">FINAL</span>}
                </span>
                <span className="fixture-pairing">{fixture.pairing.id}</span>
              </div>
              <div className="fixture-teams">
                <div className={`fixture-team ${result?.winnerTeamId === fixture.team1.id ? 'is-winner' : ''}`}>
                  <span>{fixture.team1.name}</span>
                  <strong>
                    {fixture.pairing.players.map((position, index) => (
                      <React.Fragment key={position}>
                        {index > 0 && ' & '}
                        <PlayerProfileLink
                          name={fixture.team1.players[position]}
                          playerId={rosterPlayerIds[fixture.team1.players[position]]}
                          players={players}
                          onOpenPlayer={onOpenPlayer}
                          className="fixture-player-link"
                        />
                      </React.Fragment>
                    ))}
                  </strong>
                </div>
                <span className={`fixture-vs ${result ? 'is-score' : ''}`}>
                  {result ? `${result.team1Score}–${result.team2Score}` : 'VS'}
                </span>
                <div className={`fixture-team ${result?.winnerTeamId === fixture.team2.id ? 'is-winner' : ''}`}>
                  <span>{fixture.team2.name}</span>
                  <strong>
                    {fixture.pairing.players.map((position, index) => (
                      <React.Fragment key={position}>
                        {index > 0 && ' & '}
                        <PlayerProfileLink
                          name={fixture.team2.players[position]}
                          playerId={rosterPlayerIds[fixture.team2.players[position]]}
                          players={players}
                          onOpenPlayer={onOpenPlayer}
                          className="fixture-player-link"
                        />
                      </React.Fragment>
                    ))}
                  </strong>
                </div>
              </div>
              <div className="fixture-card-side">
                <FixturePrediction
                  fixture={fixture}
                  stats={analytics.fixtures?.[fixture.id]}
                  loading={analyticsLoading}
                  error={Boolean(analyticsError)}
                  compact={view === 'list'}
                />
                {isAdmin && onSaveResult && (
                  <ResultEditor
                    fixture={fixture}
                    result={result}
                    onSave={saveResult}
                    busy={savingFixtureId === fixture.id}
                  />
                )}
              </div>
            </article>
            );
          })}
        </section>
      </div>
    </div>
  );
}
