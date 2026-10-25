import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPredictionModel,
  buildScoreRanges,
  buildLeaderboard,
  calculateForecast,
  effectivePicks,
  gradePicks,
  isLeaderboardOpen,
  isSubmissionOpen,
  submissionDeadlineLabel,
  picksFromPayload,
  rangeForScore,
  resultsSignature,
} from './tournamentPredictions.js';

const tournament = {
  id: 'T1',
  name: 'Club Cup',
  payload: {
    mode: 'group',
    eventDate: '2026-11-15',
    pointSystem: {
      winnerPoints: 10,
      winnerBonusRules: [
        { opponentScoreLessThan: 10, points: 5 },
        { opponentScoreLessThan: 17, points: 3 },
      ],
      loserBonusRules: [{ loserScoreGreaterThan: 16, points: 1 }],
    },
    players: [
      { id: 'p1', name: 'Anu' },
      { id: 'p2', name: 'Biju' },
      { id: 'p3', name: 'Cyril' },
      { id: 'p4', name: 'Deepa' },
    ],
    teams: [
      { id: 'A', name: 'Aces', players: ['p1', 'p2'] },
      { id: 'B', name: 'Birds', players: ['p3', 'p4'] },
    ],
    groupMatches: [
      { id: 'm2', label: 'Match 02', teamAId: 'A', teamBId: 'B', status: 'Pending' },
      { id: 'm1', label: 'Match 01 · Pair AB', teamAId: 'A', teamBId: 'B', status: 'Completed', scoreA: 21, scoreB: 8 },
      { id: 'bad', label: 'Match 03', teamAId: 'A', teamBId: 'ZZ', status: 'Pending' },
    ],
  },
};

test('score ranges follow the bonus thresholds and keep bonuses constant inside each range', () => {
  const ranges = buildScoreRanges(tournament.payload.pointSystem);
  assert.deepEqual(
    ranges.map((r) => [r.label, r.winnerBonus, r.loserBonus]),
    [['Below 10', 5, 0], ['10–16', 3, 0], ['17+', 0, 1]]
  );
  assert.equal(rangeForScore(ranges, 9).id, ranges[0].id);
  assert.equal(rangeForScore(ranges, 16).id, ranges[1].id);
  assert.equal(rangeForScore(ranges, 25).id, ranges[2].id);
  assert.deepEqual(buildScoreRanges({ winnerPoints: 2 }), []);
});

test('the model resolves teams, players, ordering and results from a saved tournament', () => {
  const model = buildPredictionModel(tournament);
  assert.equal(model.id, 'T1');
  assert.equal(model.winnerPoints, 10);
  assert.equal(model.totalPlayers, 4);
  assert.deepEqual(model.fixtures.map((f) => f.id), ['m1', 'm2']);
  const [done, pending] = model.fixtures;
  assert.equal(done.pairing.id, 'AB');
  assert.deepEqual(done.team1Players.map((p) => p.name), ['Anu', 'Biju']);
  assert.equal(done.completed, true);
  assert.equal(done.winnerTeamId, 'A');
  assert.equal(done.loserScore, 8);
  assert.equal(pending.completed, false);
});

test('completed fixtures lock to the real result and grade earlier picks', () => {
  const model = buildPredictionModel(tournament);
  const picks = picksFromPayload(model, {
    predictions: [
      { fixtureId: 'm1', winnerTeamId: 'B' },
      { fixtureId: 'm2', winnerTeamId: 'A', losingScoreRange: '10to16' },
    ],
  });
  const merged = effectivePicks(model, picks);
  assert.equal(merged.m1.winner, 0);
  assert.equal(merged.m1.locked, true);
  assert.equal(merged.m1.range, '0to9');
  assert.equal(merged.m2.winner, 0);
  assert.deepEqual(gradePicks(model, picks), { graded: 1, correct: 0 });

  const forecast = calculateForecast(model, merged, 200);
  assert.equal(forecast.playedCount, 2);
  const aces = forecast.table.find((row) => row.id === 'A');
  assert.equal(aces.points, 10 + 5 + 10 + 3);
  assert.equal(forecast.winner.id, 'A');
});

test('the leaderboard ranks members by correct picks, then bracket hits, sharing tied ranks', () => {
  const model = buildPredictionModel({
    ...tournament,
    payload: {
      ...tournament.payload,
      groupMatches: [
        { id: 'm1', label: 'Match 01', teamAId: 'A', teamBId: 'B', status: 'Completed', scoreA: 21, scoreB: 8 },
        { id: 'm2', label: 'Match 02', teamAId: 'A', teamBId: 'B', status: 'Completed', scoreA: 15, scoreB: 21 },
        { id: 'm3', label: 'Match 03', teamAId: 'A', teamBId: 'B', status: 'Pending' },
      ],
    },
  });
  const entry = (id, name, updated_at, predictions) => ({
    id, updated_at, payload: { kind: 'team-match-predictions', predictorName: name, predictions },
  });
  const board = buildLeaderboard(model, [
    entry('x', 'Xavier', '2026-01-02', [
      { fixtureId: 'm1', winnerTeamId: 'A', losingScoreRange: '0to9' },
      { fixtureId: 'm2', winnerTeamId: 'B' },
      { fixtureId: 'm3', winnerTeamId: 'A' },
    ]),
    entry('y', 'Yamini', '2026-01-01', [
      { fixtureId: 'm1', winnerTeamId: 'A' },
      { fixtureId: 'm2', winnerTeamId: 'B' },
    ]),
    entry('z', 'Zed', '2026-01-03', [{ fixtureId: 'm1', winnerTeamId: 'B' }]),
    entry('none', 'Nobody', '2026-01-03', []),
    { id: 'other', payload: { kind: 'something-else', predictions: [] } },
  ]);
  assert.equal(board.completedCount, 2);
  assert.equal(board.fixtureCount, 3);
  assert.deepEqual(
    board.rows.map((row) => [row.rank, row.name, row.correct, row.graded, row.rangeHits, row.pending]),
    [[1, 'Xavier', 2, 2, 1, 1], [2, 'Yamini', 2, 2, 0, 0], [3, 'Zed', 0, 1, 0, 0]]
  );
  assert.equal(resultsSignature(model), 'm1:A:8|m2:B:15');
});

test('the leaderboard only opens from the tournament date onwards', () => {
  assert.equal(isLeaderboardOpen('2026-11-15', '2026-11-14'), false);
  assert.equal(isLeaderboardOpen('2026-11-15', '2026-11-15'), true);
  assert.equal(isLeaderboardOpen('2026-11-15', '2026-12-01'), true);
  assert.equal(isLeaderboardOpen('', '2026-01-01'), true);
});

test('submissions close at the end of the day before the tournament', () => {
  assert.equal(isSubmissionOpen('2026-11-15', '2026-11-14'), true);
  assert.equal(isSubmissionOpen('2026-11-15', '2026-11-15'), false);
  assert.equal(isSubmissionOpen('2026-11-15', '2026-11-16'), false);
  assert.equal(isSubmissionOpen('', '2026-11-16'), true);
  assert.match(submissionDeadlineLabel('2026-11-15'), /14.*2026, 11:59 PM/);
  assert.equal(submissionDeadlineLabel(''), '');
});
