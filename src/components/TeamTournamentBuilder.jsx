import React from 'react';
import Card from './Card.jsx';
import BonusRulesEditor from './BonusRulesEditor.jsx';
import { getLoserBonusRules, getLoserPenaltyRules, getWinnerBonusRules } from '../utils/pointSystem.js';
import {
  MAX_TEAMS,
  MAX_TEAM_SIZE,
  MIN_TEAMS,
  MIN_TEAM_SIZE,
  allPairings,
  defaultPairingIds,
  positionLetter,
  validateTeamTournament,
} from '../utils/teamMatchTournament.js';

// Create-wizard section for the Teams format: fixed teams with lettered
// positions, playing every other team once per chosen pair (AB vs AB, …).

const inputClass = 'w-full px-3 py-2 border rounded-lg bg-white dark:bg-navy-900 text-slate-900 dark:text-slate-100';
const clampInt = (value, min, max) => Math.min(max, Math.max(min, Math.round(Number(value)) || min));

function resize(list, length, make) {
  return Array.from({ length }, (_, index) => list[index] ?? make(index));
}

export default function TeamTournamentBuilder({ name, eventDate, players, onCreate, creating = false }) {
  const [teamCount, setTeamCount] = React.useState(5);
  const [teamSize, setTeamSize] = React.useState(5);
  const [teams, setTeams] = React.useState(() =>
    Array.from({ length: 5 }, (_, index) => ({ name: `Team ${index + 1}`, playerIds: Array(5).fill('') }))
  );
  const [pairingIds, setPairingIds] = React.useState(() => defaultPairingIds(5));
  const [winnerPoints, setWinnerPoints] = React.useState(10);
  const [winnerBonusRules, setWinnerBonusRules] = React.useState([
    { opponentScoreLessThan: 11, points: 5 },
    { opponentScoreLessThan: 18, points: 3 },
  ]);
  const [loserBonusRules, setLoserBonusRules] = React.useState([]);
  const [loserPenaltyRules, setLoserPenaltyRules] = React.useState([{ loserScoreLessThan: 11, points: 1 }]);
  const [error, setError] = React.useState('');

  const sortedPlayers = React.useMemo(
    () => [...(players || [])].sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
    [players]
  );
  const visibleTeams = resize(teams, teamCount, (index) => ({ name: `Team ${index + 1}`, playerIds: [] }))
    .map((team) => ({ ...team, playerIds: resize(team.playerIds || [], teamSize, () => '') }));
  const taken = new Set(visibleTeams.flatMap((team) => team.playerIds).filter(Boolean));
  const pairings = allPairings(teamSize);
  const chosenPairings = pairings.filter((pair) => pairingIds.includes(pair.id));
  const ties = teamCount * (teamCount - 1) / 2;
  const matchCount = ties * chosenPairings.length;
  const needed = teamCount * teamSize;

  function changeTeamSize(value) {
    const next = clampInt(value, MIN_TEAM_SIZE, MAX_TEAM_SIZE);
    setTeamSize(next);
    setPairingIds(defaultPairingIds(next));
  }

  function updateTeam(index, change) {
    setTeams(visibleTeams.map((team, i) => (i === index ? change(team) : team)));
    setError('');
  }

  function togglePairing(id) {
    setPairingIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    setError('');
  }

  async function submit() {
    const pointRules = [
      ...winnerBonusRules.flatMap((rule) => [rule.opponentScoreLessThan, rule.points]),
      ...loserBonusRules.flatMap((rule) => [rule.loserScoreGreaterThan, rule.points]),
      ...loserPenaltyRules.flatMap((rule) => [rule.loserScoreLessThan, rule.points]),
      winnerPoints,
    ];
    if (pointRules.some((value) => value === '' || !Number.isFinite(Number(value)) || Number(value) < 0)) {
      setError('Point system values must be non-negative numbers.');
      return;
    }
    const input = {
      name,
      eventDate,
      teamSize,
      pairingIds: chosenPairings.map((pair) => pair.id),
      teams: visibleTeams,
      players,
      pointSystem: {
        winnerPoints: Number(winnerPoints),
        winnerBonusRules: getWinnerBonusRules({ winnerBonusRules }),
        loserBonusRules: getLoserBonusRules({ loserBonusRules }),
        loserPenaltyRules: getLoserPenaltyRules({ loserPenaltyRules }),
        loserBonusScoreGreaterThan: getLoserBonusRules({ loserBonusRules })[0]?.loserScoreGreaterThan || 0,
        loserBonusPoints: getLoserBonusRules({ loserBonusRules })[0]?.points || 0,
      },
    };
    const problem = validateTeamTournament(input);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    try {
      await onCreate(input);
    } catch (createError) {
      setError(createError?.message || 'Unable to create the tournament.');
    }
  }

  return (
    <>
      <Card title="Teams">
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            Number of teams
            <input
              type="number"
              min={MIN_TEAMS}
              max={MAX_TEAMS}
              value={teamCount}
              onChange={(event) => setTeamCount(clampInt(event.target.value, MIN_TEAMS, MAX_TEAMS))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm">
            Players per team
            <input
              type="number"
              min={MIN_TEAM_SIZE}
              max={MAX_TEAM_SIZE}
              value={teamSize}
              onChange={(event) => changeTeamSize(event.target.value)}
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Needs {needed} players · {taken.size} chosen · {(players || []).length} available.
        </p>
      </Card>

      <div className="sm:col-span-2">
        <Card title="Pair matches">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Each player holds a lettered position in their team. When two teams meet, they play one match for
            every pair selected here, e.g. AB means players A and B of one team against A and B of the other.
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Pair matches played when two teams meet">
            {pairings.map((pair) => {
              const selected = pairingIds.includes(pair.id);
              return (
                <button
                  key={pair.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => togglePairing(pair.id)}
                  className={`min-w-[52px] px-3 py-2 rounded-lg border text-sm font-semibold ${
                    selected ? 'btn-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pair.id}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-200 mt-3">
            {teamCount} teams × {chosenPairings.length} {chosenPairings.length === 1 ? 'pair match' : 'pair matches'} ={' '}
            <span className="font-semibold">{matchCount} matches</span> ({ties} team meetings).
          </p>
        </Card>
      </div>

      <div className="sm:col-span-3">
        <Card title="Team rosters">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleTeams.map((team, teamIndex) => (
              <div key={teamIndex} className="rounded-xl border border-slate-200 dark:border-navy-700 p-3">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Team {teamIndex + 1} name
                  <input
                    type="text"
                    value={team.name}
                    onChange={(event) => updateTeam(teamIndex, (current) => ({ ...current, name: event.target.value }))}
                    className={`mt-1 normal-case tracking-normal text-sm font-medium ${inputClass}`}
                  />
                </label>
                <div className="mt-3 grid gap-2">
                  {team.playerIds.map((playerId, position) => (
                    <label key={position} className="flex items-center gap-2 text-sm">
                      <span className="w-5 shrink-0 font-bold text-slate-500 dark:text-slate-400">{positionLetter(position)}</span>
                      <select
                        aria-label={`${team.name || `Team ${teamIndex + 1}`} player ${positionLetter(position)}`}
                        value={playerId}
                        onChange={(event) =>
                          updateTeam(teamIndex, (current) => ({
                            ...current,
                            playerIds: current.playerIds.map((id, i) => (i === position ? event.target.value : id)),
                          }))
                        }
                        className={`min-w-0 ${inputClass}`}
                      >
                        <option value="">Choose player</option>
                        {sortedPlayers
                          .filter((player) => String(player.id) === playerId || !taken.has(String(player.id)))
                          .map((player) => (
                            <option key={player.id} value={String(player.id)}>{player.name}</option>
                          ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="sm:col-span-3">
        <Card title="Point System">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              Winner Team Point
              <input
                type="number"
                min={0}
                value={winnerPoints}
                onChange={(event) => setWinnerPoints(event.target.value)}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            <div />
            <div className="sm:col-span-2">
              <BonusRulesEditor rules={winnerBonusRules} onChange={setWinnerBonusRules} />
            </div>
            <div className="sm:col-span-2 border-t border-slate-200 dark:border-navy-700 pt-4">
              <BonusRulesEditor
                rules={loserBonusRules}
                onChange={setLoserBonusRules}
                title="Loser bonus rules"
                thresholdField="loserScoreGreaterThan"
                thresholdLabel="Losing team score greater than"
                pointsLabel="Loser bonus points"
                emptyLabel="No loser bonus rules."
                description="Only the highest matching bonus is added to the losing team’s points. Their score must be strictly above the threshold."
              />
            </div>
            <div className="sm:col-span-2 border-t border-slate-200 dark:border-navy-700 pt-4">
              <BonusRulesEditor
                rules={loserPenaltyRules}
                onChange={setLoserPenaltyRules}
                title="Loser penalty rules"
                addLabel="+ Add penalty rule"
                thresholdField="loserScoreLessThan"
                thresholdLabel="Losing team score less than"
                pointsLabel="Penalty points deducted"
                emptyLabel="No loser penalty rules."
                description="Only the highest matching penalty is deducted from the losing team’s points. Their score must be strictly below the threshold."
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="sm:col-span-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mr-auto" role="alert">
            {error}
          </div>
        )}
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={submit} disabled={creating}>
          {creating ? 'Creating…' : `Create tournament · ${matchCount} matches`}
        </button>
      </div>
    </>
  );
}
