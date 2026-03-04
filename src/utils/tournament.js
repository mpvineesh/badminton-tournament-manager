// Utility + core tournament logic helpers

/** Return YYYY-MM-DD in local time. */
export function isoDateToday() {
  const now = new Date();
  const off = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return off.toISOString().slice(0, 10);
}

/** Convert Date -> local ISO string suitable for <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
export function toIsoLocal(d) {
  const off = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return off.toISOString().slice(0, 16);
}

/** Small id helper. */
export function nid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Clamp number between a..b. */
export function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}

/**
 * Single round-robin pairing for a list of team ids.
 * Returns an array of [teamAId, teamBId] pairs. Inserts BYE if odd, omits BYE matches.
 */
export function roundRobin(teamIds) {
  const ids = [...teamIds];
  const odd = ids.length % 2 === 1;
  if (odd) ids.push('BYE');
  const n = ids.length;
  const half = n / 2;
  const rounds = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < half; i++) {
      const a = ids[i];
      const b = ids[n - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') {
        rounds.push([a, b]);
      }
    }
    // rotate, keep first fixed
    ids.splice(1, 0, ids.pop());
  }
  return rounds;
}

/**
 * Compute pool standings from completed matches.
 * Points: win=2, loss=0. Tiebreaks: points desc → (PF-PA) desc → PF desc.
 * @returns {Record<string, {teamId:string, played:number, won:number, lost:number, pf:number, pa:number, points:number}[]>}
 */
export function computeStandings(pools, teams, matches, pointSystem = {}) {
  const winnerPoints = Number(pointSystem?.winnerPoints ?? 2);
  const winnerBonusOppScoreLessThan = Number(pointSystem?.winnerBonusOppScoreLessThan ?? NaN);
  const winnerBonusPoints = Number(pointSystem?.winnerBonusPoints ?? 0);
  const loserBonusScoreGreaterThan = Number(pointSystem?.loserBonusScoreGreaterThan ?? NaN);
  const loserBonusPoints = Number(pointSystem?.loserBonusPoints ?? 0);

  const result = {};
  const teamSet = new Set(teams.map((t) => t.id));

  for (const p of pools) {
    /** @type {Record<string, any>} */
    const table = {};
    for (const tid of p.teamIds) {
      table[tid] = {
        teamId: tid,
        played: 0,
        won: 0,
        lost: 0,
        pf: 0,
        pa: 0,
        points: 0,
      };
    }
    for (const m of matches.filter((m) => m.status === 'Completed')) {
      if (!teamSet.has(m.teamAId) || !teamSet.has(m.teamBId)) continue;
      const A = table[m.teamAId];
      const B = table[m.teamBId];
      if (!A && !B) continue;

      const scoreA = m.scoreA || 0;
      const scoreB = m.scoreB || 0;
      const aWon = scoreA > scoreB;
      const winnerScore = aWon ? scoreA : scoreB;
      const loserScore = aWon ? scoreB : scoreA;
      let winnerExtra = 0;
      let loserExtra = 0;
      if (
        Number.isFinite(winnerBonusOppScoreLessThan) &&
        loserScore < winnerBonusOppScoreLessThan
      ) {
        winnerExtra += Math.max(0, winnerBonusPoints);
      }
      if (
        Number.isFinite(loserBonusScoreGreaterThan) &&
        loserScore > loserBonusScoreGreaterThan
      ) {
        loserExtra += Math.max(0, loserBonusPoints);
      }

      if (A) {
        A.played++;
        A.pf += scoreA;
        A.pa += scoreB;
        if (aWon) {
          A.won++;
          A.points += Math.max(0, winnerPoints) + winnerExtra;
        } else {
          A.lost++;
          A.points += loserExtra;
        }
      }

      if (B) {
        B.played++;
        B.pf += scoreB;
        B.pa += scoreA;
        if (!aWon) {
          B.won++;
          B.points += Math.max(0, winnerPoints) + winnerExtra;
        } else {
          B.lost++;
          B.points += loserExtra;
        }
      }
    }

    const ordered = Object.values(table).sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      const diffY = y.pf - y.pa;
      const diffX = x.pf - x.pa;
      if (diffY !== diffX) return diffY - diffX;
      if (y.pf !== x.pf) return y.pf - x.pf;
      return 0;
    });

    result[p.id] = ordered;
  }

  return result;
}

/** Winner teamId for a completed match (null if not decided). */
export function winnerOf(m) {
  if (m?.scoreA == null || m?.scoreB == null) return null;
  return m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
}
