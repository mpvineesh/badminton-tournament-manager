import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXTURES } from '../data/teamMatchFixtures.js';
import {
  buildLegacyLeaderboard,
  buildLegacyTeamStandings,
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
  assert.equal(legacyResultsSignature({ [first.id]: { team1Score: 21, team2Score: 7 } }), `november-rules-v2:${first.id}:${first.team1.id}:7`);
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


test('team standings use actual results and all November bonus boundaries', () => {
  for (const [score, winnerPoints, loserPoints] of [[9, 15, -1], [10, 15, -1], [11, 13, 0], [16, 13, 0], [17, 13, 0], [18, 10, 0]]) {
    for (const reverse of [false, true]) {
      const rows = buildLegacyTeamStandings({ [first.id]: { team1Score: reverse ? score : 21, team2Score: reverse ? 21 : score } });
      const winner = rows.find((row) => row.id === String(reverse ? first.team2.id : first.team1.id));
      const loser = rows.find((row) => row.id === String(reverse ? first.team1.id : first.team2.id));
      assert.equal(winner.points, winnerPoints);
      assert.equal(loser.points, loserPoints);
      assert.equal(winner.wins, 1);
      assert.equal(loser.losses, 1);
      assert.equal(winner.difference, 21 - score);
      assert.equal(rows.reduce((sum, row) => sum + row.played, 0), 2);
    }
  }
});

test('empty or invalid results leave all teams tied; corrections replace scores', () => {
  const empty = buildLegacyTeamStandings({ [first.id]: { team1Score: 10, team2Score: 10 } });
  assert.equal(empty.length, 5);
  assert.ok(empty.every((row) => row.points === 0 && row.played === 0 && row.rank === 1));
  const rows = buildLegacyTeamStandings({ [first.id]: { team1Score: 8, team2Score: 21 } });
  assert.equal(rows[0].id, String(first.team2.id));
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[0].played, 1);
});


test('corrected brackets apply to locked predictions and leaderboard grading', () => {
  for (const [score, range] of [[10, 'below10'], [11, '10to16'], [17, '10to16'], [18, '17to21']]) {
    const results = { [first.id]: { team1Score: 21, team2Score: score } };
    assert.equal(legacyResultPicks(results)[first.id].range, range);
    const board = buildLegacyLeaderboard(results, [{ id: 'a', payload: {
      kind: 'team-match-predictions', predictorName: 'Asha', predictions: [{ fixtureId: first.id, winnerTeamId: first.team1.id, losingScoreRange: range }],
    } }]);
    assert.equal(board.rows[0].rangeHits, 1);
    assert.equal(board.resultsSignature, legacyResultsSignature(results));
  }
});
