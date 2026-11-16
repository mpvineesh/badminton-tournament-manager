import test from 'node:test';
import assert from 'node:assert/strict';
import { allPairings, buildTeamTournamentPayload, defaultPairingIds, validateTeamTournament } from './teamMatchTournament.js';
import { buildPredictionModel } from './tournamentPredictions.js';
import { computeStandings } from './tournament.js';

const players = Array.from({ length: 15 }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}`, skill: 5 + (i % 3) }));
const setup = (overrides = {}) => ({
  name: 'Club Teams',
  eventDate: '2027-01-10',
  teamSize: 5,
  pairingIds: defaultPairingIds(5),
  teams: [0, 1, 2].map((t) => ({ name: `Team ${t + 1}`, playerIds: players.slice(t * 5, t * 5 + 5).map((p) => p.id) })),
  players,
  pointSystem: { winnerPoints: 10 },
  createdByMobile: '+91 98765 43210',
  ...overrides,
});

test('pairings: every combination, and the November default for five players', () => {
  assert.deepEqual(allPairings(3).map((p) => p.id), ['AB', 'AC', 'BC']);
  assert.equal(allPairings(5).length, 10);
  assert.deepEqual(defaultPairingIds(5), ['AB', 'AC', 'BD', 'CE']);
  assert.deepEqual(defaultPairingIds(6), ['AB', 'CD', 'EF']);
  assert.deepEqual(defaultPairingIds(2), ['AB']);
});

test('builds every team-vs-team tie once per pairing with the right players', () => {
  const payload = buildTeamTournamentPayload(setup());
  assert.equal(payload.format, 'team-match');
  assert.equal(payload.mode, 'group');
  assert.equal(payload.groupMatches.length, 3 * 4);
  assert.equal(payload.createdByMobile, '9876543210');
  const first = payload.groupMatches[0];
  assert.equal(first.label, 'Match 01 · Pair AB');
  assert.deepEqual([first.teamAId, first.teamBId], ['TM-TEAM-1', 'TM-TEAM-2']);
  assert.deepEqual(first.teamAPlayerIds, ['p1', 'p2']);
  assert.deepEqual(first.teamBPlayerIds, ['p6', 'p7']);
  assert.equal(first.teamADisplay, 'PLAYER 1 & PLAYER 2');
  const last = payload.groupMatches.at(-1);
  assert.equal(last.label, 'Match 12 · Pair CE');
  assert.deepEqual(last.teamAPlayerIds, ['p8', 'p10']);
  assert.deepEqual(payload.pools[0].teamIds, ['TM-TEAM-1', 'TM-TEAM-2', 'TM-TEAM-3']);
  assert.equal(new Set(payload.groupMatches.map((m) => m.id)).size, 12);
});

test('the result works with predictions and standings', () => {
  const payload = buildTeamTournamentPayload(setup());
  const model = buildPredictionModel({ id: 't1', payload });
  assert.equal(model.fixtures.length, 12);
  assert.equal(model.fixtures[0].pairing.id, 'AB');
  assert.deepEqual(model.fixtures[0].team1Players.map((p) => p.name), ['Player 1', 'Player 2']);
  payload.groupMatches[0] = { ...payload.groupMatches[0], scoreA: 21, scoreB: 9, status: 'Completed' };
  const table = computeStandings(payload.pools, payload.teams, payload.groupMatches, payload.pointSystem)['TM-GROUP'];
  assert.equal(table[0].teamId, 'TM-TEAM-1');
  assert.equal(table[0].points, 10);
});

test('validation catches incomplete or conflicting setups', () => {
  assert.equal(validateTeamTournament(setup()), '');
  assert.match(validateTeamTournament(setup({ name: ' ' })), /name/);
  assert.match(validateTeamTournament(setup({ eventDate: '' })), /date/);
  assert.match(validateTeamTournament(setup({ pairingIds: [] })), /pair match/);
  assert.match(validateTeamTournament(setup({ pairingIds: ['AZ'] })), /pair match/);
  assert.match(validateTeamTournament(setup({ teams: setup().teams.slice(0, 1) })), /at least 2/);
  const dupName = setup(); dupName.teams[1].name = 'team 1';
  assert.match(validateTeamTournament(dupName), /different/);
  const missing = setup(); missing.teams[0].playerIds = ['p1', 'p2', '', 'p4', 'p5'];
  assert.match(validateTeamTournament(missing), /all 5 players/);
  const shared = setup(); shared.teams[1].playerIds = ['p1', 'p7', 'p8', 'p9', 'p10'];
  assert.match(validateTeamTournament(shared), /only be in one team/);
  assert.throws(() => buildTeamTournamentPayload(shared), /only be in one team/);
});
