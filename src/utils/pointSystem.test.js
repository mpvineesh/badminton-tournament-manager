import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStandings } from './tournament.js';
import {
  getLoserBonusRules,
  getWinnerBonusRules,
  loserBonusForScore,
  winnerBonusForScore,
} from './pointSystem.js';

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

test('loser bonus rules award the highest matching bonus with strict thresholds', () => {
  const loserRules = [
    { loserScoreGreaterThan: 5, points: 1 },
    { loserScoreGreaterThan: 10, points: 3 },
  ];
  for (const ordered of [loserRules, [...loserRules].reverse()]) {
    for (const [score, expected] of [[0, 0], [5, 0], [6, 1], [10, 1], [11, 3]]) {
      assert.equal(loserBonusForScore(ordered, score), expected);
    }
  }

  const legacy = { loserBonusScoreGreaterThan: 7, loserBonusPoints: 2 };
  assert.deepEqual(getLoserBonusRules(legacy), [{ loserScoreGreaterThan: 7, points: 2 }]);
  assert.deepEqual(getLoserBonusRules({ ...legacy, loserBonusRules: [] }), []);
  assert.deepEqual(
    getLoserBonusRules({ loserBonusRules: [{ loserScoreGreaterThan: '10', points: '4' }] }),
    [{ loserScoreGreaterThan: 10, points: 4 }]
  );
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

test('standings apply the highest configured bonus to the losing team', () => {
  const table = computeStandings(
    [{ id: 'pool', teamIds: ['a', 'b'] }],
    [{ id: 'a' }, { id: 'b' }],
    [{ status: 'Completed', teamAId: 'a', teamBId: 'b', scoreA: 21, scoreB: 12 }],
    {
      winnerPoints: 1,
      loserBonusRules: [
        { loserScoreGreaterThan: 5, points: 1 },
        { loserScoreGreaterThan: 10, points: 3 },
      ],
    }
  ).pool;
  assert.equal(table.find((row) => row.teamId === 'a').points, 1);
  assert.equal(table.find((row) => row.teamId === 'b').points, 3);
});
