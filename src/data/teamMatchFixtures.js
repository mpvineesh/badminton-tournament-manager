export const TEAMS = [
  { name: 'Five Fingers', players: ['Sobin', 'Projesh Kumar', 'Gireesh Kumar', 'Sreejesh', 'Satheeshan'] },
  { name: 'Lion Kings', players: ['Manu', 'Santhosh Kumar', 'Vineesh', 'Sasidharan', 'Arjun'] },
  { name: 'United 5', players: ['Hareesh', 'Subin', 'Nishanth', 'Sumithran', 'Sam John'] },
  { name: 'Pentablaze', players: ['Johnson Mathew', 'Jithin', 'Shymon', 'Manoj', 'Unnikrishnan'] },
  { name: 'Pentagon', players: ['Rajeesh', 'Sonu', 'Raghunath', 'Gino', 'Aneesh Chayoth'] },
].map((team, index) => ({ id: index + 1, ...team }));
export const TEAM_MATCH_TOURNAMENT_NAME = 'Whitefeather Morning Batch 2026';

export const PAIRINGS = [
  { id: 'AB', players: [0, 1] },
  { id: 'AC', players: [0, 2] },
  { id: 'BD', players: [1, 3] },
  { id: 'CE', players: [2, 4] },
];

export const FIXTURES = TEAMS.flatMap((team1, team1Index) =>
  TEAMS.slice(team1Index + 1).flatMap((team2) =>
    PAIRINGS.map((pairing) => ({
      id: `${team1.id}-${team2.id}-${pairing.id}`,
      team1,
      team2,
      pairing,
    }))
  )
).map((fixture, index) => ({ ...fixture, number: index + 1 }));

export function getFixturePlayers(fixture, team, players = [], rosterPlayerIds = {}) {
  return fixture.pairing.players
    .map((position) => {
      const rosterName = team.players[position];
      const playerId = rosterPlayerIds[rosterName];
      const matchedPlayer = playerId == null
        ? null
        : players.find((player) => String(player?.id) === String(playerId));
      return String(matchedPlayer?.name || rosterName);
    })
    .join(' & ');
}

export function normalizeRosterPlayerName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/^[a-e](?:\s*[-:.)]\s*|\s+)/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function resolveRosterPlayers(players) {
  const playersByName = new Map();
  for (const player of Array.isArray(players) ? players : []) {
    const key = normalizeRosterPlayerName(player?.name);
    if (!key) continue;
    const matches = playersByName.get(key) || [];
    matches.push(player);
    playersByName.set(key, matches);
  }

  const mapping = new Map();
  const unmatched = [];
  const ambiguous = [];
  for (const team of TEAMS) {
    for (const name of team.players) {
      const matches = playersByName.get(normalizeRosterPlayerName(name)) || [];
      if (matches.length === 1) mapping.set(name, matches[0]);
      else if (matches.length > 1) ambiguous.push(name);
      else unmatched.push(name);
    }
  }
  return { mapping, unmatched, ambiguous };
}

export function getTournamentRosterPlayerIds(tournament) {
  const payload = tournament?.payload || tournament || {};
  const tournamentTeams = Array.isArray(payload.teams) ? payload.teams : [];
  const playerIds = {};

  for (const team of TEAMS) {
    const savedTeam = tournamentTeams.find(
      (candidate) =>
        candidate?.id === `WF-TEAM-${team.id}` ||
        String(candidate?.name || '').trim().toLowerCase() === team.name.toLowerCase()
    );
    const savedPlayerIds = Array.isArray(savedTeam?.players) ? savedTeam.players : [];
    team.players.forEach((name, index) => {
      if (savedPlayerIds[index]) playerIds[name] = String(savedPlayerIds[index]);
    });
  }

  return playerIds;
}

export function buildTeamMatchTournamentPayload(players, createdByMobile = '') {
  const { mapping, unmatched, ambiguous } = resolveRosterPlayers(players);
  if (unmatched.length || ambiguous.length) {
    const details = [
      unmatched.length ? `Not found: ${unmatched.join(', ')}` : '',
      ambiguous.length ? `Duplicate names: ${ambiguous.join(', ')}` : '',
    ].filter(Boolean).join('. ');
    throw new Error(`Match every tournament roster name to exactly one app player. ${details}`);
  }

  const tournamentTeams = TEAMS.map((team) => {
    const teamPlayers = team.players.map((name) => mapping.get(name));
    const id = `WF-TEAM-${team.id}`;
    return {
      id,
      name: team.name,
      players: teamPlayers.map((player) => String(player.id)),
      avgSkill: teamPlayers.reduce((sum, player) => sum + (Number(player.skill) || 5), 0) / teamPlayers.length,
    };
  });
  const tournamentPlayers = [...mapping.values()].map((player) => ({
    id: String(player.id),
    name: String(player.name),
    skill: Number(player.skill) || 5,
  }));
  const tournamentTeamsById = new Map(tournamentTeams.map((team) => [team.id, team]));
  const groupId = 'WF-TEAM-GROUP';
  const groupMatches = FIXTURES.map((fixture) => {
    const teamA = tournamentTeamsById.get(`WF-TEAM-${fixture.team1.id}`);
    const teamB = tournamentTeamsById.get(`WF-TEAM-${fixture.team2.id}`);
    const pairPlayerIds = (roster) =>
      fixture.pairing.players.map((position) => String(mapping.get(roster.players[position]).id));
    const teamAPlayerIds = pairPlayerIds(fixture.team1);
    const teamBPlayerIds = pairPlayerIds(fixture.team2);
    const displayPair = (ids) =>
      ids.map((id) => tournamentPlayers.find((player) => player.id === id)?.name.toUpperCase()).join(' & ');
    return {
      id: `WF-GM-${String(fixture.number).padStart(2, '0')}`,
      poolId: groupId,
      round: 'Group',
      label: `Match ${String(fixture.number).padStart(2, '0')} · Pair ${fixture.pairing.id}`,
      teamAId: teamA.id,
      teamBId: teamB.id,
      teamAPlayerIds,
      teamBPlayerIds,
      teamADisplay: displayPair(teamAPlayerIds),
      teamBDisplay: displayPair(teamBPlayerIds),
      scoreA: null,
      scoreB: null,
      status: 'Pending',
    };
  });

  return {
    name: TEAM_MATCH_TOURNAMENT_NAME,
    format: 'team-match',
    mode: 'group',
    eventDate: '2026-11-15',
    numPools: 1,
    membersPerGroup: tournamentTeams.length,
    groupGamesBetweenGroups: 0,
    groupLevelPairings: [],
    pointSystem: {
      winnerPoints: 1,
      winnerBonusOppScoreLessThan: 0,
      winnerBonusPoints: 0,
      loserBonusScoreGreaterThan: 0,
      loserBonusPoints: 0,
    },
    players: tournamentPlayers,
    teams: tournamentTeams,
    pools: [{ id: groupId, name: 'Group A', teamIds: tournamentTeams.map((team) => team.id) }],
    groupMatches,
    semiMatches: [],
    finalMatch: null,
    createdByMobile: String(createdByMobile || '').replace(/\D/g, '').slice(-10),
    created_at: new Date().toISOString(),
    status: 'Upcoming',
  };
}
