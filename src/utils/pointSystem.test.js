import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStandings } from './tournament.js';
import { getWinnerBonusRules, winnerBonusForScore } from './pointSystem.js';

const rules = [{ opponentScoreLessThan: 10, points: 5 }, { opponentScoreLessThan: 15, points: 3 }];

test('highest matching bonus, strict thresholds, and order independence', () => {
  for (const ordered of [rules, [...rules].reverse()]) {
    for (const [score, expected] of [[0, 5], [8, 5], [10, 3], [14, 3], [15, 0], [21, 0]]) {
      assert.equal(winnerBonusForScore(ordered, score), expected);
    }
  }
});

test('legacy rules survive and an empty array explicitly disables bonuses', () => {
  const legacy = { winnerBonusOppScoreLessThan: 10, winnerBonusPoints: 5 };
  assert.equal(winnerBonusForScore(getWinnerBonusRules(legacy), 8), 5);
  assert.deepEqual(getWinnerBonusRules({ ...legacy, winnerBonusRules: [] }), []);
  assert.equal(winnerBonusForScore(getWinnerBonusRules({}), 0), 0);
  assert.deepEqual(getWinnerBonusRules({ winnerBonusRules: [{ opponentScoreLessThan: '10', points: '5' }] }), [rules[0]]);
});

test('standings award the bonus to either winning side and preserve loser bonuses', () => {
  for (const aWins of [true, false]) {
    const table = computeStandings(
      [{ id: 'pool', teamIds: ['a', 'b'] }], [{ id: 'a' }, { id: 'b' }],
      [{ status: 'Completed', teamAId: 'a', teamBId: 'b', scoreA: aWins ? 21 : 8, scoreB: aWins ? 8 : 21 },
       { status: 'Upcoming', teamAId: 'a', teamBId: 'b', scoreA: 21, scoreB: 0 }],
      { winnerPoints: 10, winnerBonusRules: rules, loserBonusScoreGreaterThan: 7, loserBonusPoints: 2 }
    ).pool;
    assert.equal(table.find((row) => row.teamId === (aWins ? 'a' : 'b')).points, 15);
    assert.equal(table.find((row) => row.teamId === (aWins ? 'b' : 'a')).points, 2);
    assert.ok(table.every((row) => row.played === 1));
  }
});
