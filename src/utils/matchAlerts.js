// Finds the matches a given player participates in across all tournaments,
// used to drive "your match is starting" notifications. Mirrors the
// participation-matching logic in PlayerStatsScreen (id / mobile / name).

function normMobile(value) {
  return String(value || '').replace(/\D/g, '');
}
function normName(value) {
  return String(value || '').trim().toLowerCase();
}

export function findPlayerMatches(tournaments, me) {
  if (!me) return [];
  const targetMobile = normMobile(me.mobile);
  const targetName = normName(me.name);
  const out = [];

  for (const tournament of tournaments || []) {
    const payload = tournament?.payload || tournament || {};
    const teams = Array.isArray(payload?.teams) ? payload.teams : [];
    const payloadPlayers = Array.isArray(payload?.players) ? payload.players : [];
    const matches = [
      ...(Array.isArray(payload?.groupMatches)
        ? payload.groupMatches.map((m) => ({ ...m, stage: 'Group' }))
        : []),
      ...(Array.isArray(payload?.semiMatches)
        ? payload.semiMatches.map((m) => ({ ...m, stage: 'Semifinal' }))
        : []),
      ...(payload?.finalMatch ? [{ ...payload.finalMatch, stage: 'Final' }] : []),
    ];
    if (teams.length === 0 || matches.length === 0) continue;

    const teamById = Object.fromEntries(teams.map((tm) => [tm.id, tm]));
    const candidateIds = new Set(
      [
        me.id,
        ...payloadPlayers
          .filter((p) => {
            if (!p) return false;
            if (p.id && p.id === me.id) return true;
            const mob = normMobile(p.mobile);
            if (targetMobile && mob && mob === targetMobile) return true;
            const nm = normName(p.name);
            if (targetName && nm && nm === targetName) return true;
            return false;
          })
          .map((p) => p.id),
      ].filter(Boolean)
    );

    const myTeamIds = teams
      .filter((tm) => {
        const members = Array.isArray(tm?.players)
          ? tm.players
          : Array.isArray(tm?.playerIds)
            ? tm.playerIds
            : [];
        if (members.some((pid) => candidateIds.has(pid))) return true;
        const tn = normName(tm?.name);
        return Boolean(targetName && tn && tn.includes(targetName));
      })
      .map((tm) => tm.id);
    if (myTeamIds.length === 0) continue;

    for (const match of matches) {
      const side = myTeamIds.includes(match?.teamAId)
        ? 'A'
        : myTeamIds.includes(match?.teamBId)
          ? 'B'
          : null;
      if (!side) continue;
      const opponentId = side === 'A' ? match.teamBId : match.teamAId;
      const opponent = teamById[opponentId];
      out.push({
        key: `${tournament?.id || payload?.id || 't'}:${match?.stage || 'M'}:${match?.id || match?.label || 'm'}`,
        status: String(match?.status || 'Pending'),
        label: String(match?.label || match?.stage || 'Match').trim(),
        tournamentName: String(tournament?.name || payload?.name || 'Tournament').trim(),
        opponentName: String(opponent?.name || 'TBD').trim(),
      });
    }
  }

  return out;
}
