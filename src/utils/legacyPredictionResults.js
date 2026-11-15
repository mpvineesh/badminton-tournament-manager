// Results and leaderboard support for the original, static SMASHPICKS pages
// (/predictions and /fixtures). Those pages predate per-tournament data, so
// results are kept in their own small store keyed by the legacy prediction id
// and adapted into the shared leaderboard scoring.
import { FIXTURES, TEAMS } from '../data/teamMatchFixtures.js';
import { buildLeaderboard, rangeForScore, resultsSignature } from './tournamentPredictions.js';

export const LEGACY_TEAM_PREDICTION_ID = 'whitefeather-team-predictions-2026';
export const LEGACY_EVENT_DATE = '2026-11-15';

// Keep stored range IDs stable so existing predictions remain compatible.
export const LEGACY_SCORE_RANGES = [
  { id: 'below10', label: '10 or less', detail: 'Winner +5 · Loser −1', min: 0, max: 10, winnerBonus: 5, loserBonus: -1 },
  { id: '10to16', label: '11–17', detail: 'Winner +3', min: 11, max: 17, winnerBonus: 3, loserBonus: 0 },
  { id: '17to21', label: '18 or more', detail: 'No bonus', min: 18, max: null, winnerBonus: 0, loserBonus: 0 },
];

/** Validates a stored or drafted result; returns null when it is not a decided match. */
export function normalizeLegacyResult(fixture, raw) {
  if (!fixture || !raw) return null;
  // An empty field is "not entered", never a zero score.
  if ([raw.team1Score, raw.team2Score].some((value) => value === '' || value == null)) return null;
  const team1Score = Number(raw.team1Score);
  const team2Score = Number(raw.team2Score);
  if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) return null;
  if (team1Score < 0 || team2Score < 0 || team1Score === team2Score) return null;
  const winnerTeamId = team1Score > team2Score ? fixture.team1.id : fixture.team2.id;
  return {
    team1Score,
    team2Score,
    winnerTeamId,
    loserScore: Math.min(team1Score, team2Score),
    updatedAt: raw.updated_at || raw.updatedAt || null,
  };
}

export function legacyRangeForScore(score) {
  return rangeForScore(LEGACY_SCORE_RANGES, score)?.id || null;
}

/** Adapts the static roster plus recorded results into the shared model shape. */
export function buildLegacyModel(results = {}) {
  const teams = TEAMS.map((team) => ({
    ...team,
    id: String(team.id),
    index: team.id - 1,
    playerIds: [],
  }));
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const fixtures = FIXTURES.map((fixture) => {
    const result = normalizeLegacyResult(fixture, results?.[fixture.id]);
    return {
      id: fixture.id,
      number: fixture.number,
      stage: 'Group',
      label: `Match ${String(fixture.number).padStart(2, '0')}`,
      pairing: fixture.pairing,
      team1: teamsById.get(String(fixture.team1.id)),
      team2: teamsById.get(String(fixture.team2.id)),
      team1Players: fixture.pairing.players.map((position) => ({ id: '', name: fixture.team1.players[position] })),
      team2Players: fixture.pairing.players.map((position) => ({ id: '', name: fixture.team2.players[position] })),
      status: result ? 'Completed' : 'Pending',
      completed: Boolean(result),
      scoreA: result ? result.team1Score : null,
      scoreB: result ? result.team2Score : null,
      winnerTeamId: result ? String(result.winnerTeamId) : '',
      loserScore: result ? result.loserScore : null,
    };
  });
  return {
    id: LEGACY_TEAM_PREDICTION_ID,
    name: 'Whitefeather Morning Batch 2026',
    teams,
    fixtures,
    totalPlayers: TEAMS.reduce((total, team) => total + team.players.length, 0),
    winnerPoints: 10,
    scoreRanges: LEGACY_SCORE_RANGES,
  };
}

/** Locked picks for decided fixtures, in the legacy screen's pick shape. */
export function legacyResultPicks(results = {}) {
  const picks = {};
  for (const fixture of FIXTURES) {
    const result = normalizeLegacyResult(fixture, results?.[fixture.id]);
    if (!result) continue;
    picks[fixture.id] = {
      winner: result.winnerTeamId === fixture.team1.id ? 0 : 1,
      range: legacyRangeForScore(result.loserScore),
      open: false,
      locked: true,
      result,
    };
  }
  return picks;
}

export function legacyResultsSignature(results = {}) {
  return `november-rules-v2:${resultsSignature(buildLegacyModel(results))}`;
}

export function buildLegacyLeaderboard(results, entries) {
  return { ...buildLeaderboard(buildLegacyModel(results), entries), resultsSignature: legacyResultsSignature(results) };
}

/** Actual team standings for the November event, excluding unplayed fixtures. */
export function buildLegacyTeamStandings(results = {}) {
  const model = buildLegacyModel(results);
  const rows = model.teams.map((team) => ({ ...team, played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 }));
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const fixture of model.fixtures) {
    if (!fixture.completed) continue;
    const a = byId.get(fixture.team1.id);
    const b = byId.get(fixture.team2.id);
    const winner = fixture.winnerTeamId === a.id ? a : b;
    const loser = winner === a ? b : a;
    const range = rangeForScore(model.scoreRanges, fixture.loserScore);
    a.played++; b.played++;
    a.scored += fixture.scoreA; a.conceded += fixture.scoreB;
    b.scored += fixture.scoreB; b.conceded += fixture.scoreA;
    winner.wins++; loser.losses++;
    winner.points += model.winnerPoints + (range?.winnerBonus || 0);
    loser.points += range?.loserBonus || 0;
  }
  const compare = (a, b) => b.points - a.points || b.wins - a.wins || (b.scored - b.conceded) - (a.scored - a.conceded);
  rows.sort(compare);
  let rank = 1;
  return rows.map((row, index) => {
    if (index && compare(rows[index - 1], row) !== 0) rank = index + 1;
    return { ...row, rank, difference: row.scored - row.conceded };
  });
}
