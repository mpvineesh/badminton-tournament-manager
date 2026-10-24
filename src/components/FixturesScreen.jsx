import React, { useEffect, useMemo, useState } from 'react';
import { FIXTURES, TEAMS, getFixturePlayers } from '../data/teamMatchFixtures.js';
import './FixturesScreen.css';

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
}) {
  const [teamId, setTeamId] = useState('all');
  const [view, setView] = useState('cards');
  const [analytics, setAnalytics] = useState({ submissions: 0, fixtures: {} });
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
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
            <a className="fixtures-back" href="/prediction-walkthrough.mp4" target="_blank" rel="noreferrer">
              Watch guide
            </a>
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
          </span>
        </div>
        {analyticsError && (
          <div className="fixtures-analytics-error" role="alert">{analyticsError}</div>
        )}

        <section
          className={`fixtures-grid ${view === 'list' ? 'is-list' : ''}`}
          aria-label="Match fixture list"
        >
          {visibleFixtures.map((fixture) => (
            <article className="fixture-card" key={fixture.id}>
              <div className="fixture-card-title">
                <span>Match {String(fixture.number).padStart(2, '0')}</span>
                <span className="fixture-pairing">{fixture.pairing.id}</span>
              </div>
              <div className="fixture-teams">
                <div className="fixture-team">
                  <span>{fixture.team1.name}</span>
                  <strong>{getFixturePlayers(fixture, fixture.team1)}</strong>
                </div>
                <span className="fixture-vs">VS</span>
                <div className="fixture-team">
                  <span>{fixture.team2.name}</span>
                  <strong>{getFixturePlayers(fixture, fixture.team2)}</strong>
                </div>
              </div>
              <FixturePrediction
                fixture={fixture}
                stats={analytics.fixtures?.[fixture.id]}
                loading={analyticsLoading}
                error={Boolean(analyticsError)}
                compact={view === 'list'}
              />
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
