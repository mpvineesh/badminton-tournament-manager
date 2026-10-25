// Builds a tournament-agnostic "prediction model" from any saved tournament so
// the SMASHPICKS fixtures and predictions screens can run on live data instead
// of the hard-coded roster in data/teamMatchFixtures.js.
import { isoDateToday } from './tournament.js';
import {
  getLoserBonusRules,
  getWinnerBonusRules,
  loserBonusForScore,
  winnerBonusForScore,
} from './pointSystem.js';

export const DEFAULT_SIMULATIONS = 6000;

function stagePriority(stage) {
  if (stage === 'Group') return 0;
  if (stage === 'Semifinal') return 1;
  if (stage === 'Final') return 2;
  return 3;
}

function isCompleted(match) {
  return match?.status === 'Completed';
}

function parsePairing(label, stage) {
  const text = String(label || '');
  const pair = text.match(/pair\s+([A-Z]{1,3})/i);
  if (pair) return pair[1].toUpperCase();
  if (stage && stage !== 'Group') return stage.slice(0, 5).toUpperCase();
  return 'MATCH';
}

/**
 * Collapses the point system's bonus thresholds into disjoint losing-score
 * ranges. Within each range the winner and loser bonuses are constant, so a
 * predictor only has to pick a bracket rather than an exact score.
 */
export function buildScoreRanges(pointSystem = {}, maxScore = 30) {
  const winnerRules = getWinnerBonusRules(pointSystem).filter((rule) => rule.points > 0);
  const loserRules = getLoserBonusRules(pointSystem).filter((rule) => rule.points > 0);
  const boundaries = [
    ...winnerRules.map((rule) => Math.ceil(rule.opponentScoreLessThan)),
    ...loserRules.map((rule) => Math.floor(rule.loserScoreGreaterThan) + 1),
  ]
    .filter((value) => Number.isFinite(value) && value > 0 && value <= maxScore)
    .sort((a, b) => a - b)
    .filter((value, index, list) => list.indexOf(value) === index);
  if (boundaries.length === 0) return [];

  const starts = [0, ...boundaries];
  return starts.map((min, index) => {
    const next = starts[index + 1];
    const max = next === undefined ? null : next - 1;
    const winnerBonus = winnerBonusForScore(winnerRules, min);
    const loserBonus = loserBonusForScore(loserRules, min);
    let label;
    if (index === 0) label = max === 0 ? '0' : `Below ${next}`;
    else if (max === null) label = `${min}+`;
    else label = min === max ? String(min) : `${min}–${max}`;
    const parts = [];
    if (winnerBonus) parts.push(`Winner +${winnerBonus}`);
    if (loserBonus) parts.push(`Loser +${loserBonus}`);
    return {
      id: max === null ? `${min}plus` : `${min}to${max}`,
      label,
      detail: parts.length ? parts.join(' · ') : 'No bonus',
      min,
      max,
      winnerBonus,
      loserBonus,
    };
  });
}

export function rangeForScore(scoreRanges, score) {
  const value = Number(score);
  if (!Number.isFinite(value)) return null;
  return (
    scoreRanges.find((range) => value >= range.min && (range.max === null || value <= range.max)) ||
    null
  );
}

function resolvePlayerName(playersById, idOrName) {
  const key = String(idOrName ?? '');
  const player = playersById.get(key);
  return String(player?.name || idOrName || '').trim();
}

export function buildPredictionModel(tournament) {
  const source = tournament?.payload ? { ...tournament, ...tournament.payload } : tournament || {};
  const playersById = new Map(
    (Array.isArray(source.players) ? source.players : []).map((player) => [String(player?.id), player])
  );
  const teams = (Array.isArray(source.teams) ? source.teams : []).map((team, index) => {
    const playerIds = (Array.isArray(team?.players) ? team.players : []).map((id) => String(id));
    return {
      id: String(team?.id ?? index + 1),
      index,
      name: String(team?.name || `Team ${index + 1}`),
      playerIds,
      players: playerIds.map((id) => resolvePlayerName(playersById, id)).filter(Boolean),
    };
  });
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  const rawMatches = [
    ...(Array.isArray(source.groupMatches) ? source.groupMatches : []).map((m) => ({ ...m, stage: 'Group' })),
    ...(source.mode === 'group'
      ? []
      : [
          ...(Array.isArray(source.semiMatches) ? source.semiMatches : []).map((m) => ({ ...m, stage: 'Semifinal' })),
          ...(source.finalMatch ? [{ ...source.finalMatch, stage: 'Final' }] : []),
        ]),
  ];

  const fixtures = rawMatches
    .filter((match) => teamsById.has(String(match?.teamAId)) && teamsById.has(String(match?.teamBId)))
    .sort((a, b) => {
      const stageDiff = stagePriority(a.stage) - stagePriority(b.stage);
      if (stageDiff !== 0) return stageDiff;
      return String(a.label || '').localeCompare(String(b.label || ''), undefined, { numeric: true });
    })
    .map((match, index) => {
      const team1 = teamsById.get(String(match.teamAId));
      const team2 = teamsById.get(String(match.teamBId));
      // Each side is a list of { id, name } so the UI can link to player profiles.
      const sidePlayers = (explicitIds, team) => {
        const ids = Array.isArray(explicitIds) && explicitIds.length ? explicitIds : team.playerIds;
        const entries = ids
          .map((id) => ({ id: String(id), name: resolvePlayerName(playersById, id) }))
          .filter((entry) => entry.name);
        return entries.length ? entries : [{ id: '', name: team.name }];
      };
      const completed = isCompleted(match);
      const scoreA = Number(match.scoreA);
      const scoreB = Number(match.scoreB);
      const winnerTeamId = completed
        ? String(match.winnerTeamId || (scoreA > scoreB ? team1.id : scoreB > scoreA ? team2.id : ''))
        : '';
      return {
        id: String(match.id ?? `${match.stage}-${index + 1}`),
        number: index + 1,
        stage: match.stage,
        label: String(match.label || `Match ${String(index + 1).padStart(2, '0')}`),
        pairing: { id: parsePairing(match.label, match.stage) },
        team1,
        team2,
        team1Players: sidePlayers(match.teamAPlayerIds, team1),
        team2Players: sidePlayers(match.teamBPlayerIds, team2),
        status: match.status || 'Pending',
        completed,
        scoreA: Number.isFinite(scoreA) ? scoreA : null,
        scoreB: Number.isFinite(scoreB) ? scoreB : null,
        winnerTeamId,
        loserScore: completed && Number.isFinite(scoreA) && Number.isFinite(scoreB)
          ? Math.min(scoreA, scoreB)
          : null,
      };
    });

  const pointSystem = source.pointSystem || {};
  return {
    id: String(tournament?.id || ''),
    name: String(source.name || tournament?.name || 'Tournament'),
    status: String(source.status || tournament?.status || 'Upcoming'),
    eventDate: String(source.eventDate || ''),
    format: String(source.format || ''),
    teams,
    fixtures,
    totalPlayers: new Set(teams.flatMap((team) => team.playerIds)).size,
    winnerPoints: Number(pointSystem.winnerPoints ?? 2),
    scoreRanges: buildScoreRanges(pointSystem),
  };
}

/** The pick a completed fixture forces: its real winner and losing-score bracket. */
export function resultPick(model, fixture) {
  if (!fixture?.completed || !fixture.winnerTeamId) return null;
  const winner = fixture.winnerTeamId === fixture.team1.id ? 0 : fixture.winnerTeamId === fixture.team2.id ? 1 : undefined;
  if (winner === undefined) return null;
  return {
    winner,
    range: rangeForScore(model.scoreRanges, fixture.loserScore)?.id || null,
    open: false,
    locked: true,
  };
}

/** Merges the user's picks with locked results for finished fixtures. */
export function effectivePicks(model, picks) {
  const merged = {};
  for (const fixture of model.fixtures) {
    const locked = resultPick(model, fixture);
    if (locked) merged[fixture.id] = locked;
    else if (picks?.[fixture.id]?.winner !== undefined) merged[fixture.id] = picks[fixture.id];
  }
  return merged;
}

export function gradePicks(model, picks) {
  let graded = 0;
  let correct = 0;
  for (const fixture of model.fixtures) {
    const locked = resultPick(model, fixture);
    const pick = picks?.[fixture.id];
    if (!locked || pick?.winner === undefined) continue;
    graded += 1;
    if (pick.winner === locked.winner) correct += 1;
  }
  return { graded, correct };
}

function makeRandom(seedValue) {
  let seed = seedValue >>> 0 || 2463534242;
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function emptyForecast(model) {
  return {
    playedCount: 0,
    winner: model.teams[0] || null,
    runnerUp: model.teams[1] || model.teams[0] || null,
    winnerChance: 0,
    runnerUpChance: 0,
    table: model.teams.map((team) => ({ ...team, wins: 0, points: 0 })),
    odds: model.teams.map((team) => ({ ...team, winner: 0, runnerUp: 0 })),
  };
}

export function calculateForecast(model, picks, simulations = DEFAULT_SIMULATIONS) {
  const teamCount = model.teams.length;
  if (teamCount === 0) return emptyForecast(model);
  const played = model.fixtures.filter((fixture) => picks?.[fixture.id]?.winner !== undefined);
  const remaining = model.fixtures.filter((fixture) => picks?.[fixture.id]?.winner === undefined);
  if (played.length === 0) return emptyForecast(model);

  const rangesById = new Map(model.scoreRanges.map((range) => [range.id, range]));
  const applyPick = (fixture, winnerSide, scores, wins, rangeId) => {
    const winner = winnerSide === 0 ? fixture.team1.index : fixture.team2.index;
    const loser = winnerSide === 0 ? fixture.team2.index : fixture.team1.index;
    wins[winner] += 1;
    scores[winner] += model.winnerPoints;
    const range = rangeId ? rangesById.get(rangeId) : null;
    if (range) {
      scores[winner] += range.winnerBonus;
      scores[loser] += range.loserBonus;
    }
  };

  const scores = Array(teamCount).fill(0);
  const wins = Array(teamCount).fill(0);
  let seed = 2463534242;
  for (const fixture of played) {
    const pick = picks[fixture.id];
    applyPick(fixture, pick.winner, scores, wins, pick.range);
    seed = (Math.imul(seed ^ (fixture.team1.index * 67 + fixture.team2.index * 17 + fixture.number * 7 + pick.winner), 1664525) + 1013904223) >>> 0;
  }
  const random = makeRandom(seed);

  const firstPlace = Array(teamCount).fill(0);
  const secondPlace = Array(teamCount).fill(0);
  for (let trial = 0; trial < simulations; trial += 1) {
    const trialScores = scores.slice();
    const trialWins = wins.slice();
    for (const fixture of remaining) {
      applyPick(fixture, random() < 0.5 ? 0 : 1, trialScores, trialWins, null);
    }
    const ranking = model.teams.map((team) => ({ id: team.index, tie: random() })).sort(
      (left, right) =>
        trialScores[right.id] - trialScores[left.id] ||
        trialWins[right.id] - trialWins[left.id] ||
        left.tie - right.tie
    );
    firstPlace[ranking[0].id] += 1;
    if (ranking[1]) secondPlace[ranking[1].id] += 1;
  }

  const winnerIndex = firstPlace.indexOf(Math.max(...firstPlace));
  const runnerUpIndex = model.teams
    .map((team) => team.index)
    .filter((index) => index !== winnerIndex)
    .sort((left, right) => secondPlace[right] - secondPlace[left])[0];
  const table = model.teams
    .map((team) => ({ ...team, wins: wins[team.index], points: scores[team.index] }))
    .sort((left, right) => right.points - left.points || right.wins - left.wins || left.index - right.index);
  const odds = model.teams
    .map((team) => ({
      ...team,
      winner: firstPlace[team.index] / simulations * 100,
      runnerUp: secondPlace[team.index] / simulations * 100,
    }))
    .sort((left, right) => right.winner - left.winner);

  return {
    playedCount: played.length,
    winner: model.teams[winnerIndex],
    runnerUp: runnerUpIndex === undefined ? model.teams[winnerIndex] : model.teams[runnerUpIndex],
    winnerChance: firstPlace[winnerIndex] / simulations * 100,
    runnerUpChance: runnerUpIndex === undefined ? 0 : secondPlace[runnerUpIndex] / simulations * 100,
    table,
    odds,
  };
}

export function calculateCommunityOdds(model, analytics, simulations = DEFAULT_SIMULATIONS) {
  const teamCount = model.teams.length;
  if (teamCount === 0) return [];
  const fixtureStats = analytics?.fixtures || {};
  const rangesById = new Map(model.scoreRanges.map((range) => [range.id, range]));
  const random = makeRandom(1831565813);
  const firstPlace = Array(teamCount).fill(0);

  for (let trial = 0; trial < simulations; trial += 1) {
    const scores = Array(teamCount).fill(0);
    const wins = Array(teamCount).fill(0);
    for (const fixture of model.fixtures) {
      const stats = fixtureStats[fixture.id] || {};
      const team1Votes = Number(stats.team1Votes) || 0;
      const team2Votes = Number(stats.team2Votes) || 0;
      const totalVotes = team1Votes + team2Votes;
      let winnerSide;
      if (fixture.completed && fixture.winnerTeamId) {
        winnerSide = fixture.winnerTeamId === fixture.team1.id ? 0 : 1;
      } else {
        const team1WinShare = totalVotes > 0 ? team1Votes / totalVotes : 0.5;
        winnerSide = random() >= team1WinShare ? 1 : 0;
      }
      const winnerIndex = (winnerSide === 0 ? fixture.team1 : fixture.team2).index;
      const loserIndex = (winnerSide === 0 ? fixture.team2 : fixture.team1).index;
      const side = winnerSide === 0 ? 'team1' : 'team2';
      const sideVotes = winnerSide === 0 ? team1Votes : team2Votes;
      const rangeCounts = stats[`${side}ScoreRanges`] || {};
      const rangesTotal = Object.values(rangeCounts).reduce((sum, count) => sum + (Number(count) || 0), 0);
      const noRangeCount = Math.max(0, sideVotes - rangesTotal);
      let range = null;
      if (fixture.completed) {
        range = rangeForScore(model.scoreRanges, fixture.loserScore);
      } else {
        let rangeRoll = random() * Math.max(1, sideVotes);
        if (rangeRoll >= noRangeCount) {
          rangeRoll -= noRangeCount;
          for (const scoreRange of model.scoreRanges) {
            const count = Number(rangeCounts[scoreRange.id]) || 0;
            if (rangeRoll < count) {
              range = rangesById.get(scoreRange.id);
              break;
            }
            rangeRoll -= count;
          }
        }
      }
      scores[winnerIndex] += model.winnerPoints;
      wins[winnerIndex] += 1;
      if (range) {
        scores[winnerIndex] += range.winnerBonus;
        scores[loserIndex] += range.loserBonus;
      }
    }
    const ranking = model.teams.map((team) => ({ index: team.index, tie: random() })).sort(
      (left, right) =>
        scores[right.index] - scores[left.index] ||
        wins[right.index] - wins[left.index] ||
        left.tie - right.tie
    );
    firstPlace[ranking[0].index] += 1;
  }

  return model.teams
    .map((team) => ({ team, probability: firstPlace[team.index] / simulations * 100 }))
    .sort((left, right) => right.probability - left.probability);
}

/** Rebuilds a picks map from a saved prediction payload. */
export function picksFromPayload(model, payload) {
  const picks = {};
  for (const prediction of payload?.predictions || []) {
    const fixture = model.fixtures.find((item) => item.id === String(prediction?.fixtureId));
    if (!fixture) continue;
    const winnerTeamId = String(prediction.winnerTeamId ?? '');
    const winner =
      winnerTeamId === fixture.team1.id ? 0 : winnerTeamId === fixture.team2.id ? 1 : undefined;
    if (winner === undefined) continue;
    picks[fixture.id] = { winner, range: prediction.losingScoreRange || null, open: false };
  }
  return picks;
}

export function forecastFromSubmission(model, submission, simulations = DEFAULT_SIMULATIONS) {
  const picks = picksFromPayload(model, submission?.payload);
  const result = calculateForecast(model, effectivePicks(model, picks), simulations);
  return { playedCount: result.playedCount, winner: result.winner, runnerUp: result.runnerUp };
}

export function sideNames(players) {
  return (players || []).map((player) => player.name).join(' & ');
}

/** The leaderboard is hidden until tournament day so early results don't leak standings. */
export function isLeaderboardOpen(eventDate, today = isoDateToday()) {
  const raw = String(eventDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return true;
  return today >= raw;
}

export function formatEventDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
}

/** A compact fingerprint of recorded results, used to spot a stale leaderboard. */
export function resultsSignature(model) {
  return model.fixtures
    .filter((fixture) => fixture.completed && fixture.winnerTeamId)
    .map((fixture) => `${fixture.id}:${fixture.winnerTeamId}:${fixture.loserScore ?? ''}`)
    .join('|');
}

/**
 * Scores every saved prediction against the recorded results.
 * Ranking: correct winner picks, then correct losing-score brackets, then the
 * earlier submission. Rows carry no mobile numbers or per-match picks, so the
 * result is safe to publish for everyone to read.
 */
export function buildLeaderboard(model, entries) {
  const completed = model.fixtures.filter((fixture) => fixture.completed && fixture.winnerTeamId).length;
  const rows = (Array.isArray(entries) ? entries : [])
    .filter((entry) => entry?.payload?.kind === 'team-match-predictions')
    .map((entry) => {
      const picks = picksFromPayload(model, entry.payload);
      let correct = 0;
      let graded = 0;
      let rangeHits = 0;
      let pending = 0;
      for (const fixture of model.fixtures) {
        const pick = picks[fixture.id];
        if (pick?.winner === undefined) continue;
        const actual = resultPick(model, fixture);
        if (!actual) {
          pending += 1;
          continue;
        }
        graded += 1;
        if (pick.winner === actual.winner) {
          correct += 1;
          if (pick.range && actual.range && pick.range === actual.range) rangeHits += 1;
        }
      }
      return {
        id: String(entry.id || ''),
        name: String(entry.payload?.predictorName || 'Tournament player').trim() || 'Tournament player',
        correct,
        graded,
        rangeHits,
        pending,
        predicted: graded + pending,
        updatedAt: entry.updated_at || entry.created_at || null,
      };
    })
    .filter((row) => row.predicted > 0)
    .sort(
      (left, right) =>
        right.correct - left.correct ||
        right.rangeHits - left.rangeHits ||
        String(left.updatedAt || '').localeCompare(String(right.updatedAt || '')) ||
        left.name.localeCompare(right.name)
    );

  // Equal scores share a rank (1, 1, 3 …).
  let rank = 0;
  rows.forEach((row, index) => {
    const previous = rows[index - 1];
    if (!previous || previous.correct !== row.correct || previous.rangeHits !== row.rangeHits) {
      rank = index + 1;
    }
    row.rank = rank;
  });

  return {
    rows,
    completedCount: completed,
    fixtureCount: model.fixtures.length,
    resultsSignature: resultsSignature(model),
    updatedAt: new Date().toISOString(),
  };
}
