import React from 'react';
import { computeStandings } from '../utils/tournament.js';
import { buildScoreRanges, formatEventDate } from '../utils/tournamentPredictions.js';
import './TournamentLeaderboard.css';

// Tournament standings, laid out like the SMASHPICKS team leaderboard: one
// full table per group with rank, record, scores and points.

const signed = (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`;

// Equal records share a rank (1, 1, 3 …).
function withRanks(rows, sameRecord) {
  let rank = 0;
  return rows.map((row, index) => {
    if (index === 0 || !sameRecord(rows[index - 1], row)) rank = index + 1;
    return { ...row, rank };
  });
}

function LeaderboardTable({ caption, columns, rows }) {
  return (
    <div className="tl-table-wrap">
      <table className="tl-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{columns.map((column) => <th scope="col" key={column.title}>{column.title}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.rank === 1 && row.leads ? 'is-leader' : ''}>
              {columns.map((column) =>
                column.header
                  ? <th scope="row" key={column.title}>{column.value(row)}</th>
                  : <td key={column.title} className={column.className ? column.className(row) : ''}>{column.value(row)}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const diffClass = (row) => (row.difference > 0 ? 'is-up' : row.difference < 0 ? 'is-down' : '');
const points = (row) => <strong>{row.points}</strong>;

const TEAM_COLUMNS = [
  { title: 'Rank', value: (row) => row.rank },
  { title: 'Team', header: true, value: (row) => row.name },
  { title: 'Played', value: (row) => row.played },
  { title: 'Won', value: (row) => row.won },
  { title: 'Lost', value: (row) => row.lost },
  { title: 'For', value: (row) => row.scored },
  { title: 'Against', value: (row) => row.conceded },
  { title: 'Diff', value: (row) => signed(row.difference), className: diffClass },
  { title: 'Points', value: points },
];

const GROUP_COLUMNS = [
  { title: 'Rank', value: (row) => row.rank },
  { title: 'Group', header: true, value: (row) => row.name },
  { title: 'Won', value: (row) => row.won },
  { title: 'Lost', value: (row) => row.lost },
  { title: 'Diff', value: (row) => signed(row.difference), className: diffClass },
  { title: 'Points', value: points },
];

const KNOCKOUT_COLUMNS = [
  { title: 'Rank', value: (row) => row.rank },
  { title: 'Team', header: true, value: (row) => row.name },
  { title: 'Semifinal', value: (row) => row.semiPoints },
  { title: 'Final', value: (row) => row.finalPoints },
  { title: 'Total', value: points },
];

function scoringNote(pointSystem) {
  const winnerPoints = Number(pointSystem?.winnerPoints ?? 2);
  const parts = [`Win: ${winnerPoints} ${winnerPoints === 1 ? 'point' : 'points'}.`];
  for (const range of buildScoreRanges(pointSystem)) {
    const effects = [
      range.winnerBonus ? `winner +${range.winnerBonus}` : '',
      range.loserBonus ? `loser ${signed(range.loserBonus)}` : '',
    ].filter(Boolean);
    const label = range.max === null ? `${range.min} or more` : range.min === 0 ? `${range.max} or less` : `${range.min}–${range.max}`;
    parts.push(`Loser ${label}: ${effects.length ? effects.join(', ') : 'no bonus'}.`);
  }
  return parts.join(' ');
}

export default function TournamentLeaderboard({ tournament, onBack }) {
  const pools = tournament?.pools || [];
  const teams = tournament?.teams || [];
  const groupMatches = tournament?.groupMatches || [];
  const semiMatches = tournament?.semiMatches || [];
  const finalMatch = tournament?.finalMatch;
  const teamsById = Object.fromEntries(teams.map((team) => [team.id, team]));
  const standings = computeStandings(pools, teams, groupMatches, tournament?.pointSystem || {});
  const isTeamMatch = tournament?.format === 'team-match';
  const groupVsGroup = tournament?.mode === 'group' && !isTeamMatch;
  const hasKnockout = tournament?.mode !== 'group';

  const allMatches = [...groupMatches, ...(hasKnockout ? [...semiMatches, ...(finalMatch ? [finalMatch] : [])] : [])];
  const completed = allMatches.filter((match) => match?.status === 'Completed').length;
  const allGroupMatchesCompleted = groupMatches.length > 0 && groupMatches.every((match) => match?.status === 'Completed');

  const poolTables = pools.map((pool, index) => {
    const rows = (standings[pool.id] || [])
      .map((row) => {
        const played = Number(row?.played || 0);
        const won = Number(row?.won || 0);
        const scored = Number(row?.pf || 0);
        const conceded = Number(row?.pa || 0);
        return {
          id: `${pool.id}-${row.teamId}`,
          name: teamsById[row.teamId]?.name || row.teamId,
          played,
          won,
          lost: Number(row?.lost ?? Math.max(0, played - won)),
          scored,
          conceded,
          difference: scored - conceded,
          points: Number(row?.points || 0),
          leads: played > 0,
        };
      })
      .sort((a, b) => b.points - a.points || b.difference - a.difference || b.won - a.won || a.name.localeCompare(b.name));
    return {
      id: pool.id,
      name: pool.name || `Group ${index + 1}`,
      rows: withRanks(rows, (a, b) => a.points === b.points && a.difference === b.difference && a.won === b.won),
    };
  });

  const groupRows = withRanks(
    poolTables
      .map((pool) => ({
        id: pool.id,
        name: pool.name,
        won: pool.rows.reduce((sum, row) => sum + row.won, 0),
        lost: pool.rows.reduce((sum, row) => sum + row.lost, 0),
        difference: pool.rows.reduce((sum, row) => sum + row.difference, 0),
        points: pool.rows.reduce((sum, row) => sum + row.points, 0),
        leads: pool.rows.some((row) => row.played > 0),
      }))
      .sort((a, b) => b.points - a.points || b.difference - a.difference || a.name.localeCompare(b.name)),
    (a, b) => a.points === b.points && a.difference === b.difference
  );

  // Knockout wins are tracked apart from the group standings: 2 points each.
  const knockoutPoints = {};
  const addKnockout = (teamId, field) => {
    knockoutPoints[teamId] = knockoutPoints[teamId] || { semiPoints: 0, finalPoints: 0 };
    knockoutPoints[teamId][field] += 2;
  };
  semiMatches.forEach((match) => {
    if (match?.status === 'Completed' && match?.winnerTeamId) addKnockout(match.winnerTeamId, 'semiPoints');
  });
  if (finalMatch?.status === 'Completed' && finalMatch?.winnerTeamId) addKnockout(finalMatch.winnerTeamId, 'finalPoints');
  const semiTeamIds = [...new Set(semiMatches.flatMap((match) => [match?.teamAId, match?.teamBId]).filter(Boolean))];
  const qualifiedTeamIds = semiTeamIds.length > 0
    ? semiTeamIds
    : pools.length === 1
      ? (standings[pools[0].id] || []).slice(0, 4).map((row) => row.teamId)
      : pools.flatMap((pool) => (standings[pool.id] || []).slice(0, 2).map((row) => row.teamId));
  const knockoutRows = withRanks(
    qualifiedTeamIds
      .map((teamId) => teamsById[teamId])
      .filter(Boolean)
      .map((team) => {
        const earned = knockoutPoints[team.id] || { semiPoints: 0, finalPoints: 0 };
        const total = earned.semiPoints + earned.finalPoints;
        return { id: team.id, name: team.name, ...earned, points: total, leads: total > 0 };
      })
      .sort((a, b) => b.semiPoints - a.semiPoints || b.finalPoints - a.finalPoints || a.name.localeCompare(b.name)),
    (a, b) => a.semiPoints === b.semiPoints && a.finalPoints === b.finalPoints
  );

  const eyebrow = [formatEventDate(tournament?.eventDate), String(tournament?.name || '').toUpperCase()].filter(Boolean).join(' · ');

  return (
    <div className="tl-board">
      <header className="tl-head">
        <div className="tl-heading">
          <div className="tl-eyebrow">{eyebrow || 'TOURNAMENT'}</div>
          <h2>{isTeamMatch ? 'Team leaderboard' : 'Leaderboard'}</h2>
          <p>Official match results · {completed} of {allMatches.length} matches completed</p>
        </div>
        <button type="button" className="btn-ghost" onClick={onBack}>Back</button>
      </header>

      {pools.length === 0 ? (
        <p className="tl-note">No groups available yet.</p>
      ) : (
        <>
          {completed === 0 && <p className="tl-note">No results recorded yet. Every team starts on zero points.</p>}
          {groupVsGroup ? (
            <LeaderboardTable caption="Group standings" columns={GROUP_COLUMNS} rows={groupRows} />
          ) : (
            poolTables.map((pool) => (
              <section key={pool.id} className="tl-section">
                {poolTables.length > 1 && <h3>{pool.name} <span>· {pool.rows.length} teams</span></h3>}
                {pool.rows.length === 0
                  ? <p className="tl-note">No teams in this group yet.</p>
                  : <LeaderboardTable caption={`${pool.name} standings`} columns={TEAM_COLUMNS} rows={pool.rows} />}
              </section>
            ))
          )}
        </>
      )}

      {hasKnockout && (
        <section className="tl-section">
          <h3>Knockout <span>· semifinal and final points are tracked separately</span></h3>
          {!allGroupMatchesCompleted ? (
            <p className="tl-note">Knockout points will be available after all group matches are completed.</p>
          ) : knockoutRows.length === 0 ? (
            <p className="tl-note">No semifinal-qualified teams yet.</p>
          ) : (
            <LeaderboardTable caption="Knockout points" columns={KNOCKOUT_COLUMNS} rows={knockoutRows} />
          )}
        </section>
      )}

      <p className="tl-note">{scoringNote(tournament?.pointSystem || {})}</p>
      <p className="tl-note">Ranked by points, then score difference, then wins. Equal records share a rank.</p>
    </div>
  );
}
