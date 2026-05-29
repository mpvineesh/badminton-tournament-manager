// Derived player analytics computed from the per-match rows already built by
// PlayerStatsScreen (each row: { completed, won, lost, opponentTeamName,
// partnerNames, when }). Kept pure so it can be unit-tested independently.

// Current win/loss streak. `rowsDescByTime` must be most-recent-first.
export function computeStreak(rowsDescByTime) {
  let type = null;
  let count = 0;
  for (const m of rowsDescByTime) {
    if (!m.completed) continue;
    const res = m.won ? 'W' : m.lost ? 'L' : null;
    if (!res) continue;
    if (type === null) {
      type = res;
      count = 1;
    } else if (res === type) {
      count += 1;
    } else {
      break;
    }
  }
  return { type, count }; // type: 'W' | 'L' | null
}

// Record against each opponent team, most-played first.
export function computeHeadToHead(completedRows) {
  const map = new Map();
  for (const m of completedRows) {
    const key = m.opponentTeamName || 'TBD';
    const e = map.get(key) || { opponent: key, played: 0, wins: 0, losses: 0 };
    e.played += 1;
    if (m.won) e.wins += 1;
    else if (m.lost) e.losses += 1;
    map.set(key, e);
  }
  return [...map.values()].sort(
    (a, b) => b.played - a.played || b.wins - a.wins
  );
}

// Win rate when paired with each partner (or "Singles" when none).
export function computePartnerSynergy(completedRows) {
  const map = new Map();
  for (const m of completedRows) {
    const key = (m.partnerNames || []).filter(Boolean).join(' & ') || 'Singles';
    const e = map.get(key) || { partner: key, played: 0, won: 0 };
    e.played += 1;
    if (m.won) e.won += 1;
    map.set(key, e);
  }
  return [...map.values()]
    .map((e) => ({
      ...e,
      winRate: e.played ? Math.round((e.won / e.played) * 100) : 0,
    }))
    .sort((a, b) => b.played - a.played || b.winRate - a.winRate);
}
