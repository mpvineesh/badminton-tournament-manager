export function computeStandings(pools, teams, matches) {
  const result = {};
  const teamSet = new Set(teams.map((t) => t.id));
  for (const p of pools) {
    const table = {};
    for (const tid of p.teamIds)
      table[tid] = {
        teamId: tid,
        played: 0,
        won: 0,
        lost: 0,
        pf: 0,
        pa: 0,
        points: 0,
      };
    for (const m of matches.filter(
      (m) => m.poolId === p.id && m.status === 'Completed'
    )) {
      if (!teamSet.has(m.teamAId) || !teamSet.has(m.teamBId)) continue;
      const A = table[m.teamAId],
        B = table[m.teamBId];
      A.played++;
      B.played++;
      A.pf += m.scoreA || 0;
      A.pa += m.scoreB || 0;
      B.pf += m.scoreB || 0;
      B.pa += m.scoreA || 0;
      if ((m.scoreA || 0) > (m.scoreB || 0)) {
        A.won++;
        B.lost++;
        A.points += 2;
      } else {
        B.won++;
        A.lost++;
        B.points += 2;
      }
    }
    result[p.id] = Object.values(table).sort(
      (x, y) => y.points - x.points || y.pf - y.pa - (x.pf - x.pa)
    );
  }
  return result;
}
export function winnerOf(m) {
  if (m.scoreA == null || m.scoreB == null) return null;
  return m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
}
