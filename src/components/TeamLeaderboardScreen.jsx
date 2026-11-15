import React, { useEffect, useState } from 'react';
import { buildLegacyTeamStandings } from '../utils/legacyPredictionResults.js';
import { FIXTURES } from '../data/teamMatchFixtures.js';
import './FixturesScreen.css';

export default function TeamLeaderboardScreen({ loadResults, onOpenPredictions, onOpenFixtures }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const next = await loadResults();
        if (active) { setResults(next || {}); setError(''); }
      } catch (err) {
        if (active) setError(err?.message || 'Unable to load team standings.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 30000);
    return () => { active = false; clearInterval(timer); };
  }, [loadResults, refresh]);
  const rows = buildLegacyTeamStandings(results || {});
  const completed = rows.reduce((sum, row) => sum + row.played, 0) / 2;
  return (
    <div className="fixtures-page"><div className="fixtures-shell">
      <nav className="fixtures-nav team-leaderboard-nav" aria-label="Team leaderboard">
        <div className="fixtures-brand"><span aria-hidden="true">✳</span><strong>SMASH<span>PICKS</span></strong></div>
        <div className="fixtures-nav-actions">
          <button className="fixtures-back" onClick={onOpenPredictions}>Predictions</button>
          <button className="fixtures-back" onClick={onOpenFixtures}>Fixtures</button>
        </div>
      </nav>
      <header className="fixtures-heading">
        <div className="fixtures-heading-copy">
          <div className="fixtures-eyebrow">NOVEMBER 15, 2026 · WHITEFEATHER MORNING BATCH</div>
          <h1>Team leaderboard</h1>
          <p>Official match results · {completed} of {FIXTURES.length} matches completed</p>
        </div>
        <button className="fixtures-back" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>{loading ? 'Refreshing…' : '↻ Refresh'}</button>
      </header>
      {error && <div className="fixtures-analytics-error" role="alert">{error} Use Refresh to try again.</div>}
      {loading && results === null && <p role="status">Loading team standings…</p>}
      {results !== null && <>
        {!completed && <p className="fixture-result-note">No results recorded yet. All five teams start on zero points.</p>}
        <div className="team-leaderboard-table-wrap">
          <table className="team-leaderboard-table">
            <caption className="sr-only">November tournament team standings</caption>
            <thead><tr>{['Rank', 'Team', 'Played', 'Won', 'Lost', 'For', 'Against', 'Diff', 'Points'].map((title) => <th scope="col" key={title}>{title}</th>)}</tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
              <td>{row.rank}</td><th scope="row">{row.name}</th><td>{row.played}</td><td>{row.wins}</td><td>{row.losses}</td><td>{row.scored}</td><td>{row.conceded}</td><td>{row.difference > 0 ? '+' : ''}{row.difference}</td><td><strong>{row.points}</strong></td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
      <p className="fixture-result-note">Win: 10 points. Loser below 10: winner +5, loser −1. Loser 10–16: winner +3. Loser 17 or more: no bonus.</p>
      <p className="fixture-result-note">Ranked by points, then wins, then score difference. Equal records share a rank. Results refresh every 30 seconds.</p>
    </div></div>
  );
}
