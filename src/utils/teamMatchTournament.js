// Team-match tournaments: fixed teams whose players hold lettered positions
// (A, B, C …). Every team meets every other team once per chosen pairing, and
// each match is the same two positions from both sides (pair AB vs pair AB).

export const MIN_TEAM_SIZE = 2;
export const MAX_TEAM_SIZE = 8;
export const MIN_TEAMS = 2;
export const MAX_TEAMS = 12;

export function positionLetter(index) {
  return String.fromCharCode(65 + index);
}

/** Every possible pair of positions for a team size, e.g. 3 → AB, AC, BC. */
export function allPairings(teamSize) {
  const pairs = [];
  for (let first = 0; first < teamSize; first += 1) {
    for (let second = first + 1; second < teamSize; second += 1) {
      pairs.push({ id: `${positionLetter(first)}${positionLetter(second)}`, players: [first, second] });
    }
  }
  return pairs;
}

/**
 * Default pair matches. Five players use the club's usual set (AB, AC, BD, CE);
 * small teams play every combination; larger teams play neighbouring pairs so
 * each player gets one match per tie.
 */
export function defaultPairingIds(teamSize) {
  if (teamSize === 5) return ['AB', 'AC', 'BD', 'CE'];
  if (teamSize < 4) return allPairings(teamSize).map((pair) => pair.id);
  const ids = [];
  for (let index = 0; index + 1 < teamSize; index += 2) {
    ids.push(`${positionLetter(index)}${positionLetter(index + 1)}`);
  }
  return ids;
}

/** Returns an error message for an unusable setup, or '' when it can be built. */
export function validateTeamTournament({ name, eventDate, teams, teamSize, pairingIds }) {
  if (!String(name || '').trim()) return 'Enter a tournament name.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(eventDate || ''))) return 'Choose the tournament date.';
  if (!Array.isArray(teams) || teams.length < MIN_TEAMS) return `Add at least ${MIN_TEAMS} teams.`;
  const names = teams.map((team) => String(team?.name || '').trim().toLowerCase());
  if (names.some((teamName) => !teamName)) return 'Every team needs a name.';
  if (new Set(names).size !== names.length) return 'Team names must be different.';
  const ids = teams.flatMap((team) => (team?.playerIds || []).slice(0, teamSize));
  if (teams.some((team) => (team?.playerIds || []).slice(0, teamSize).filter(Boolean).length !== teamSize)) {
    return `Choose all ${teamSize} players for every team.`;
  }
  if (new Set(ids).size !== ids.length) return 'A player can only be in one team.';
  const valid = new Set(allPairings(teamSize).map((pair) => pair.id));
  const chosen = (pairingIds || []).filter((id) => valid.has(id));
  if (chosen.length === 0) return 'Choose at least one pair match.';
  return '';
}

/**
 * Builds the saved tournament payload.
 * @param {{name:string, eventDate:string, teamSize:number, pairingIds:string[],
 *   teams:{name:string, playerIds:string[]}[], players:{id:string,name:string,skill?:number}[],
 *   pointSystem:object, createdByMobile?:string}} input
 */
export function buildTeamTournamentPayload(input) {
  const error = validateTeamTournament(input);
  if (error) throw new Error(error);
  const { teamSize } = input;
  const playersById = new Map((input.players || []).map((player) => [String(player.id), player]));
  const pairings = allPairings(teamSize).filter((pair) => input.pairingIds.includes(pair.id));

  const teams = input.teams.map((team, index) => {
    const playerIds = team.playerIds.slice(0, teamSize).map(String);
    const missing = playerIds.find((id) => !playersById.has(id));
    if (missing) throw new Error(`Player not found for ${team.name}.`);
    const skills = playerIds.map((id) => Number(playersById.get(id).skill) || 5);
    return {
      id: `TM-TEAM-${index + 1}`,
      name: String(team.name).trim(),
      players: playerIds,
      avgSkill: skills.reduce((sum, skill) => sum + skill, 0) / skills.length,
    };
  });
  const players = teams.flatMap((team) => team.players).map((id) => {
    const player = playersById.get(id);
    return { id, name: String(player.name), skill: Number(player.skill) || 5 };
  });
  const nameOf = (id) => String(playersById.get(id).name).toUpperCase();

  const groupId = 'TM-GROUP';
  const groupMatches = [];
  teams.forEach((teamA, indexA) => {
    teams.slice(indexA + 1).forEach((teamB) => {
      pairings.forEach((pairing) => {
        const number = groupMatches.length + 1;
        const teamAPlayerIds = pairing.players.map((position) => teamA.players[position]);
        const teamBPlayerIds = pairing.players.map((position) => teamB.players[position]);
        groupMatches.push({
          id: `TM-GM-${String(number).padStart(2, '0')}`,
          poolId: groupId,
          round: 'Group',
          label: `Match ${String(number).padStart(2, '0')} · Pair ${pairing.id}`,
          teamAId: teamA.id,
          teamBId: teamB.id,
          teamAPlayerIds,
          teamBPlayerIds,
          teamADisplay: teamAPlayerIds.map(nameOf).join(' & '),
          teamBDisplay: teamBPlayerIds.map(nameOf).join(' & '),
          scoreA: null,
          scoreB: null,
          status: 'Pending',
        });
      });
    });
  });

  return {
    name: String(input.name).trim(),
    format: 'team-match',
    mode: 'group',
    eventDate: input.eventDate,
    numPools: 1,
    membersPerGroup: teams.length,
    groupGamesBetweenGroups: 0,
    groupLevelPairings: [],
    teamSize,
    teamPairings: pairings.map((pair) => pair.id),
    pointSystem: input.pointSystem || {},
    players,
    teams,
    pools: [{ id: groupId, name: 'Group A', teamIds: teams.map((team) => team.id) }],
    groupMatches,
    semiMatches: [],
    finalMatch: null,
    createdByMobile: String(input.createdByMobile || '').replace(/\D/g, '').slice(-10),
    created_at: new Date().toISOString(),
    status: 'Upcoming',
  };
}
