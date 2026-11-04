// Decides which upcoming matches should be played next. The club has two
// courts, so the goal is to keep both busy while giving players a rest: a
// player who is on court (or just walked off) is not sent straight back out
// unless no other match is possible.

export function getMatchKey(match) {
  return `${match?.stage || ''}:${match?.id || ''}`;
}

export function isUpcomingMatch(match) {
  return match?.status === 'Pending' || match?.status === 'Upcoming' || !match?.status;
}

export function getMatchPlayers(match, teamsById) {
  const explicit = [...(match?.teamAPlayerIds || []), ...(match?.teamBPlayerIds || [])].filter(Boolean);
  if (explicit.length > 0) return explicit;
  const teamAPlayers = teamsById?.[match?.teamAId || '']?.players || [];
  const teamBPlayers = teamsById?.[match?.teamBId || '']?.players || [];
  return [...teamAPlayers, ...teamBPlayers].filter(Boolean);
}

function toTime(value) {
  const ts = new Date(value || 0).getTime();
  return Number.isFinite(ts) ? ts : 0;
}

/** The match that finished most recently (by score timestamp, else fixture order). */
function mostRecentlyCompleted(matches) {
  const completed = matches.filter((m) => m?.status === 'Completed');
  if (completed.length === 0) return null;
  const timed = completed.filter((m) => toTime(m.scoreUpdatedAt) > 0);
  if (timed.length === 0) return completed[completed.length - 1];
  return timed.reduce((best, m) => (toTime(m.scoreUpdatedAt) > toTime(best.scoreUpdatedAt) ? m : best));
}

const overlap = (players, set) => players.filter((pid) => set.has(pid)).length;

/** Lexicographic compare of score tuples; lower is better. */
function compareScores(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

/**
 * Orders the upcoming matches into the sequence they should be played.
 *
 * Simulates the two courts: at any point the players of the last two matches
 * in the sequence (live matches first, then picks) count as "on court" and
 * the match before those as "just finished". Each pick is the remaining match
 * with the least overlap with players on court, then the least overlap with
 * players who just finished, then fixture order. Skipped matches (keys in
 * `skippedKeys`) go to the back of the queue in the order they were skipped.
 *
 * @param {Array} matches every match of the tournament, in fixture order
 * @param {Record<string, {players?: string[]}>} teamsById
 * @param {{ skippedKeys?: string[], courts?: number }} [options]
 * @returns {Array} the upcoming matches, best-first
 */
export function buildMatchQueue(matches, teamsById, { skippedKeys = [], courts = 2 } = {}) {
  const all = Array.isArray(matches) ? matches : [];
  const playersOf = new Map(all.map((m) => [m, getMatchPlayers(m, teamsById)]));
  const skipRank = (match) => skippedKeys.indexOf(getMatchKey(match));

  const remaining = all
    .map((match, index) => ({ match, index, players: playersOf.get(match) }))
    .filter((item) => isUpcomingMatch(item.match));
  if (remaining.length === 0) return [];

  // Matches currently on court seed the simulation; the one that finished
  // last gives its players a breather when there is an alternative.
  const sequence = all.filter((m) => m?.status === 'Live').map((m) => playersOf.get(m));
  const recent = mostRecentlyCompleted(all);
  const history = recent ? [playersOf.get(recent)] : [];

  const queue = [];
  while (remaining.length > 0) {
    const onCourt = new Set(sequence.slice(-courts).flat());
    const justFinished = new Set(
      (sequence.length >= courts + 1 ? sequence.slice(-(courts + 1), -courts) : history).flat()
    );
    const scoreOf = (item) => [
      skipRank(item.match),
      overlap(item.players, onCourt),
      overlap(item.players, justFinished),
      item.index,
    ];
    let best = remaining[0];
    let bestScore = scoreOf(best);
    for (const item of remaining.slice(1)) {
      const score = scoreOf(item);
      if (compareScores(score, bestScore) < 0) {
        best = item;
        bestScore = score;
      }
    }
    queue.push(best.match);
    sequence.push(best.players);
    remaining.splice(remaining.indexOf(best), 1);
  }
  return queue;
}

/**
 * The next match for each court, for screens that show the two courts side
 * by side. Court 2's match never shares a player with court 1's when any
 * alternative exists.
 */
export function recommendCourtMatches(matches, teamsById, skippedKeys = []) {
  const all = Array.isArray(matches) ? matches : [];
  const liveCount = all.filter((m) => m?.status === 'Live').length;
  const queue = buildMatchQueue(all, teamsById, { skippedKeys });
  const court1 = queue[0] || null;
  if (!court1) return { court1: null, court2: null, liveCount };
  const court1Players = new Set(getMatchPlayers(court1, teamsById));
  const rest = queue.slice(1);
  const clear = (items) => items.find((m) => getMatchPlayers(m, teamsById).every((pid) => !court1Players.has(pid)));
  const court2 =
    clear(rest.filter((m) => !skippedKeys.includes(getMatchKey(m)))) || clear(rest) || rest[0] || null;
  return { court1, court2, liveCount };
}
