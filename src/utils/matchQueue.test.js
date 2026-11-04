import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMatchQueue, recommendCourtMatches } from './matchQueue.js';

// Four doubles pairs: T1 = a,b · T2 = c,d · T3 = e,f · T4 = g,h
const teamsById = {
  T1: { players: ['a', 'b'] },
  T2: { players: ['c', 'd'] },
  T3: { players: ['e', 'f'] },
  T4: { players: ['g', 'h'] },
};
const m = (id, teamAId, teamBId, status = 'Pending', extra = {}) => ({
  id,
  stage: 'Group',
  label: id,
  teamAId,
  teamBId,
  status,
  ...extra,
});

test('players on court are not sent straight back out when there is an alternative', () => {
  const matches = [
    m('M1', 'T1', 'T2', 'Live'),
    m('M2', 'T1', 'T3'), // T1 is playing in M1
    m('M3', 'T3', 'T4'), // nobody from M1
  ];
  const queue = buildMatchQueue(matches, teamsById);
  assert.deepEqual(queue.map((x) => x.id), ['M3', 'M2']);
});

test('consecutive picks avoid sharing players', () => {
  const matches = [m('M1', 'T1', 'T2'), m('M2', 'T1', 'T3'), m('M3', 'T3', 'T4'), m('M4', 'T2', 'T4')];
  const queue = buildMatchQueue(matches, teamsById).map((x) => x.id);
  // M1 first (fixture order), then M3 (no overlap with M1), then the rest.
  assert.equal(queue[0], 'M1');
  assert.equal(queue[1], 'M3');
  assert.equal(queue.length, 4);
});

test('a player who just finished gets a breather when possible', () => {
  const matches = [
    m('M1', 'T1', 'T2', 'Completed', { scoreUpdatedAt: '2026-06-05T09:30:00Z' }),
    m('M2', 'T1', 'T3'), // T1 just finished
    m('M3', 'T3', 'T4'),
  ];
  assert.equal(buildMatchQueue(matches, teamsById)[0].id, 'M3');
});

test('falls back to continuous matches when nothing else is left', () => {
  const matches = [m('M1', 'T1', 'T2', 'Live'), m('M2', 'T1', 'T3')];
  assert.deepEqual(buildMatchQueue(matches, teamsById).map((x) => x.id), ['M2']);
});

test('skipped matches go to the back of the queue', () => {
  const matches = [m('M1', 'T1', 'T2'), m('M2', 'T3', 'T4')];
  const queue = buildMatchQueue(matches, teamsById, { skippedKeys: ['Group:M1'] });
  assert.deepEqual(queue.map((x) => x.id), ['M2', 'M1']);
});

test('court recommendations never share a player across the two courts when avoidable', () => {
  const matches = [m('M1', 'T1', 'T2'), m('M2', 'T1', 'T3'), m('M3', 'T3', 'T4')];
  const { court1, court2, liveCount } = recommendCourtMatches(matches, teamsById);
  assert.equal(court1.id, 'M1');
  assert.equal(court2.id, 'M3');
  assert.equal(liveCount, 0);
});
