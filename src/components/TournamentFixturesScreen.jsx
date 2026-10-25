import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PlayerProfileLink from './PlayerProfileLink.jsx';
import { buildPredictionModel, formatEventDate } from '../utils/tournamentPredictions.js';
import './FixturesScreen.css';

// Live-data twin of FixturesScreen: same layout and styles, but every team,
// player and match comes from the selected tournament instead of the static
// roster, and finished matches show their result.

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

function SidePlayers({ sidePlayers, players, onOpenPlayer }) {
  return sidePlayers.map((player, index) => (
    <React.Fragment key={`${player.id}-${index}`}>
      {index > 0 && ' & '}
      <PlayerProfileLink
        name={player.name}
        playerId={player.id || undefined}
        players={players}
        onOpenPlayer={onOpenPlayer}
        className="fixture-player-link"
      />
    </React.Fragment>
  ));
}

function statusChip(fixture) {
  if (fixture.completed) return { label: 'FINAL', className: 'is-final' };
  if (fixture.status === 'Live') return { label: 'LIVE', className: 'is-live' };
  return null;
}

export default function TournamentFixturesScreen({
  tournament,
  loadPredictionAnalytics,
  onOpenPredictions,
  onBack,
  players = [],
  onOpenPlayer,
}) {
  const model = useMemo(() => buildPredictionModel(tournament), [tournament]);
  const tournamentId = model.id;
  const [teamId, setTeamId] = useState('all');
  const [view, setView] = useState('cards');
  const [analytics, setAnalytics] = useState({ submissions: 0, fixtures: {} });
  const [analyticsError, setAnalyticsError] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const visibleFixtures = useMemo(
    () =>
      teamId === 'all'
        ? model.fixtures
        : model.fixtures.filter((fixture) => fixture.team1.id === teamId || fixture.team2.id === teamId),
    [model, teamId]
  );
  const selectedTeam = model.teams.find((team) => team.id === teamId);
  const completedCount = model.fixtures.filter((fixture) => fixture.completed).length;

  const fetchAnalytics = useCallback(() => {
    if (!loadPredictionAnalytics || !tournamentId) return Promise.resolve(null);
    return loadPredictionAnalytics(tournamentId);
  }, [loadPredictionAnalytics, tournamentId]);

  useEffect(() => {
    let active = true;
    if (!loadPredictionAnalytics || !tournamentId) {
      setAnalyticsLoading(false);
      return undefined;
    }
    setAnalyticsLoading(true);
    fetchAnalytics()
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
  }, [fetchAnalytics, loadPredictionAnalytics, tournamentId]);

  const eyebrow = [model.name.toUpperCase(), formatEventDate(model.eventDate)].filter(Boolean).join(' · ');

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
            {onBack && (
              <button type="button" className="fixtures-back" onClick={onBack}>
                Tournaments
              </button>
            )}
          </div>
        </nav>

        {!tournament ? (
          <div className="fixtures-loading" role="status">Loading tournament…</div>
        ) : (
          <>
            <header className="fixtures-heading">
              <div className="fixtures-heading-copy">
                <div className="fixtures-eyebrow">{eyebrow || 'TOURNAMENT'}</div>
                <h1>Match fixtures</h1>
                <p>Browse every matchup or filter to follow one team’s schedule. Results update as matches finish.</p>
              </div>
              <div className="fixtures-tools">
                <label className="fixtures-filter" aria-label="Filter fixtures by team">
                  <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                    <option value="all">All teams</option>
                    {model.teams.map((team) => (
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
                {selectedTeam ? ` for ${selectedTeam.name}` : ' across all teams'}
                {completedCount > 0 ? ` · ${completedCount} completed` : ''}
              </span>
            </div>
            {analyticsError && (
              <div className="fixtures-analytics-error" role="alert">{analyticsError}</div>
            )}

            <section
              className={`fixtures-grid ${view === 'list' ? 'is-list' : ''}`}
              aria-label="Match fixture list"
            >
              {visibleFixtures.length === 0 && (
                <div className="fixture-prediction-empty">No fixtures have been generated for this tournament yet.</div>
              )}
              {visibleFixtures.map((fixture) => {
                const chip = statusChip(fixture);
                const hasScore = fixture.completed && fixture.scoreA !== null && fixture.scoreB !== null;
                return (
                  <article className="fixture-card" key={fixture.id}>
                    <div className="fixture-card-title">
                      <span>
                        Match {String(fixture.number).padStart(2, '0')}
                        {chip && <span className={`fixture-status ${chip.className}`}>{chip.label}</span>}
                      </span>
                      <span className="fixture-pairing">{fixture.pairing.id}</span>
                    </div>
                    <div className="fixture-teams">
                      <div className={`fixture-team ${fixture.winnerTeamId === fixture.team1.id ? 'is-winner' : ''}`}>
                        <span>{fixture.team1.name}</span>
                        <strong>
                          <SidePlayers sidePlayers={fixture.team1Players} players={players} onOpenPlayer={onOpenPlayer} />
                        </strong>
                      </div>
                      <span className={`fixture-vs ${hasScore ? 'is-score' : ''}`}>
                        {hasScore ? `${fixture.scoreA}–${fixture.scoreB}` : 'VS'}
                      </span>
                      <div className={`fixture-team ${fixture.winnerTeamId === fixture.team2.id ? 'is-winner' : ''}`}>
                        <span>{fixture.team2.name}</span>
                        <strong>
                          <SidePlayers sidePlayers={fixture.team2Players} players={players} onOpenPlayer={onOpenPlayer} />
                        </strong>
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
                );
              })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
