export const TEAMS = [
  ['Sobin', 'Prijesh', 'Gireesh', 'Sreejesh', 'Satheesh'],
  ['Manu', 'Santhosh', 'Vineesh', 'Sasidharan', 'Arjun'],
  ['Hareesh', 'Subin', 'Nishanth', 'Sumithran', 'Sam'],
  ['Johnson', 'Jithin', 'Shymon', 'Manoj Mash', 'Unni'],
  ['Rajeesh', 'Sonu', 'Raghu', 'Gino', 'Aneesh'],
].map((players, index) => ({ id: index + 1, name: `Team ${index + 1}`, players }));

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

export function getFixturePlayers(fixture, team) {
  return fixture.pairing.players
    .map((position) => team.players[position].toUpperCase())
    .join(' & ');
}
