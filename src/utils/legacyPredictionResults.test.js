import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../data/teamMatchFixtures.js';
import {
  buildLegacyLeaderboard,
  legacyResultPicks,
  legacyResultsSignature,
  normalizeLegacyResult,
} from './legacyPredictionResults.js';

const [first, second] = FIXTURES;

test('legacy results need two different whole-number scores', () => {
  assert.equal(normalizeLegacyResult(first, { team1Score: 21, team2Score: 21 }), null);
  assert.equal(normalizeLegacyResult(first, { team1Score: '', team2Score: 10 }), null);
  const result = normalizeLegacyResult(first, { team1Score: '18', team2Score: '21' });
  assert.equal(result.winnerTeamId, first.team2.id);
  assert.equal(result.loserScore, 18);
});

test('decided fixtures become locked picks with the matching score bracket', () => {
  const picks = legacyResultPicks({ [first.id]: { team1Score: 21, team2Score: 7 } });
  assert.deepEqual(Object.keys(picks), [first.id]);
  assert.equal(picks[first.id].winner, 0);
  assert.equal(picks[first.id].range, 'below10');
  assert.equal(picks[first.id].locked, true);
  assert.equal(legacyResultsSignature({ [first.id]: { team1Score: 21, team2Score: 7 } }), `${first.id}:${first.team1.id}:7`);
});

test('the legacy leaderboard scores numeric team ids against recorded results', () => {
  const results = {
    [first.id]: { team1Score: 21, team2Score: 7 },
    [second.id]: { team1Score: 15, team2Score: 21 },
  };
  const entry = (id, name, predictions) => ({
    id, updated_at: '2026-01-01', payload: { kind: 'team-match-predictions', predictorName: name, predictions },
  });
  const board = buildLegacyLeaderboard(results, [
    entry('a', 'Asha', [
      { fixtureId: first.id, team1Id: first.team1.id, team2Id: first.team2.id, winnerTeamId: first.team1.id, losingScoreRange: 'below10' },
      { fixtureId: second.id, team1Id: second.team1.id, team2Id: second.team2.id, winnerTeamId: second.team1.id },
    ]),
    entry('b', 'Bala', [
      { fixtureId: first.id, team1Id: first.team1.id, team2Id: first.team2.id, winnerTeamId: first.team2.id },
    ]),
  ]);
  assert.equal(board.completedCount, 2);
  assert.equal(board.fixtureCount, FIXTURES.length);
  assert.deepEqual(
    board.rows.map((row) => [row.rank, row.name, row.correct, row.graded, row.rangeHits]),
    [[1, 'Asha', 1, 2, 1], [2, 'Bala', 0, 1, 0]]
  );
});
