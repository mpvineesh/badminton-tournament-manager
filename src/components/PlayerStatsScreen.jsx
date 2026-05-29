import React from 'react';
import { resolveProfilePhotoUrl } from '../supabaseAdapter.js';
import { computeStreak, computeHeadToHead, computePartnerSynergy } from '../utils/playerStats.js';

function parseScore(value) {
  if (value === '' || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeWhen(matchWhen, eventDate) {
  const direct = String(matchWhen || '').trim();
  if (direct) {
    const parsed = new Date(direct);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const fallback = String(eventDate || '').trim();
  if (fallback) {
    const parsed = new Date(`${fallback}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatDateTime(dateObj) {
  if (!dateObj) return '-';
  return dateObj.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusPill(status) {
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Live') return 'bg-orange-50 text-orange-700 border-orange-200';
  return 'bg-yellow-50 text-yellow-700 border-yellow-200';
}

function getMatchStatusLabel(status) {
  if (!status || status === 'Pending') return 'Upcoming';
  return status;
}

function normalizeMobile(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

export default function PlayerStatsScreen({
  player,
  players,
  tournaments,
  tournamentsLoading,
  tournamentsError,
  onBack,
  onOpenTournament,
}) {
  const rows = React.useMemo(() => {
    if (!player?.id) return [];

    const list = Array.isArray(tournaments) ? tournaments : [];
    const playersById = Object.fromEntries((players || []).map((p) => [p.id, p]));

    return list
      .flatMap((tournament) => {
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
        if (teams.length === 0 || matches.length === 0) return [];

        const teamById = Object.fromEntries(teams.map((tm) => [tm.id, tm]));
        const payloadPlayersById = Object.fromEntries(payloadPlayers.map((p) => [p.id, p]));
        const targetMobile = normalizeMobile(player?.mobile);
        const targetName = normalizeName(player?.name);
        const matchedTournamentPlayerIds = payloadPlayers
          .filter((p) => {
            if (!p) return false;
            if (p.id && p.id === player.id) return true;
            const mobile = normalizeMobile(p.mobile);
            if (targetMobile && mobile && targetMobile === mobile) return true;
            const name = normalizeName(p.name);
            if (targetName && name && targetName === name) return true;
            return false;
          })
          .map((p) => p.id)
          .filter(Boolean);
        const candidatePlayerIds = new Set([player.id, ...matchedTournamentPlayerIds].filter(Boolean));

        const playerTeamIds = teams
          .filter((tm) => {
            const teamMembers = Array.isArray(tm?.players)
              ? tm.players
              : (Array.isArray(tm?.playerIds) ? tm.playerIds : []);
            if (teamMembers.some((pid) => candidatePlayerIds.has(pid))) return true;
            // Legacy fallback when member ids are missing.
            const teamName = normalizeName(tm?.name);
            return Boolean(targetName && teamName && teamName.includes(targetName));
          })
          .map((tm) => tm.id);
        if (playerTeamIds.length === 0) return [];

        const resolvePlayerName = (id) =>
          String(
            payloadPlayersById[id]?.name ||
            playersById[id]?.name ||
            ''
          ).trim();

        return matches
          .map((match) => {
            const side = playerTeamIds.includes(match?.teamAId)
              ? 'A'
              : (playerTeamIds.includes(match?.teamBId) ? 'B' : null);
            if (!side) return null;

            const ownTeamId = side === 'A' ? match.teamAId : match.teamBId;
            const opponentTeamId = side === 'A' ? match.teamBId : match.teamAId;
            const ownTeam = teamById[ownTeamId] || null;
            const opponentTeam = teamById[opponentTeamId] || null;
            const scoreFor = parseScore(side === 'A' ? match?.scoreA : match?.scoreB);
            const scoreAgainst = parseScore(side === 'A' ? match?.scoreB : match?.scoreA);
            const status = String(match?.status || 'Pending');
            const completed = status === 'Completed';
            const won = completed && match?.winnerTeamId && match.winnerTeamId === ownTeamId;
            const lost = completed && match?.winnerTeamId && match.winnerTeamId !== ownTeamId;
            const when = normalizeWhen(match?.when, payload?.eventDate);

            const ownTeamPlayers = Array.isArray(ownTeam?.players)
              ? ownTeam.players
              : (Array.isArray(ownTeam?.playerIds) ? ownTeam.playerIds : []);
            const opponentTeamPlayers = Array.isArray(opponentTeam?.players)
              ? opponentTeam.players
              : (Array.isArray(opponentTeam?.playerIds) ? opponentTeam.playerIds : []);

            const partnerNames = ownTeamPlayers
              .filter((id) => !candidatePlayerIds.has(id))
              .map((id) => resolvePlayerName(id))
              .filter(Boolean);
            const opponentNames = opponentTeamPlayers
              .map((id) => resolvePlayerName(id))
              .filter(Boolean);

            return {
              id: `${tournament?.id || payload?.id || 't'}-${match?.stage || 'M'}-${match?.id || String(match?.label || 'match')}`,
              tournamentId: tournament?.id || payload?.id || '',
              tournamentName: String(tournament?.name || payload?.name || 'Tournament').trim(),
              stage: match?.stage || 'Match',
              label: String(match?.label || '').trim(),
              status,
              ownTeamName: String(ownTeam?.name || '').trim() || 'My Team',
              opponentTeamName: String(opponentTeam?.name || '').trim() || 'TBD',
              partnerNames,
              opponentNames,
              scoreFor,
              scoreAgainst,
              completed,
              won,
              lost,
              when,
              whenText: formatDateTime(when),
            };
          })
          .filter(Boolean);
      })
      .sort((a, b) => {
        const aTime = a.when ? a.when.getTime() : 0;
        const bTime = b.when ? b.when.getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return String(a.tournamentName).localeCompare(String(b.tournamentName));
      });
  }, [player?.id, players, tournaments]);

  const summary = React.useMemo(() => {
    const completed = rows.filter((m) => m.completed);
    const played = completed.length;
    const won = completed.filter((m) => m.won).length;
    const lost = completed.filter((m) => m.lost).length;
    const live = rows.filter((m) => m.status === 'Live').length;
    const upcoming = rows.filter((m) => !m.completed && m.status !== 'Live').length;
    const pointsFor = completed.reduce(
      (sum, m) => sum + (Number.isFinite(m.scoreFor) ? m.scoreFor : 0),
      0
    );
    const pointsAgainst = completed.reduce(
      (sum, m) => sum + (Number.isFinite(m.scoreAgainst) ? m.scoreAgainst : 0),
      0
    );
    const tournamentsPlayed = new Set(rows.map((m) => m.tournamentId).filter(Boolean)).size;
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;

    return {
      played,
      won,
      lost,
      live,
      upcoming,
      pointsFor,
      pointsAgainst,
      tournamentsPlayed,
      winRate,
    };
  }, [rows]);

  const analytics = React.useMemo(() => {
    const completed = rows.filter((m) => m.completed);
    return {
      streak: computeStreak(rows),
      headToHead: computeHeadToHead(completed),
      partners: computePartnerSynergy(completed),
    };
  }, [rows]);

  const avatarUrl = resolveProfilePhotoUrl(player?.avatarUrl);

  if (!player?.id) {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-4 shadow-sm">
          <div className="text-sm text-slate-500 dark:text-slate-400">Player not found.</div>
          <button
            className="mt-3 btn-ghost"
            onClick={onBack}
          >
            Back to Players
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-navy-700 bg-gradient-to-r from-navy-800 to-navy-900 p-4 shadow-md text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-gold-400/70 bg-slate-50 dark:bg-navy-800">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`${player.name} avatar`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl font-semibold text-navy-700">
                  {String(player.name || 'P').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xl font-semibold truncate text-white">{player.name}</div>
              <div className="text-sm text-navy-100">
                Skill {player.skill ?? '-'} | Age {player.age ?? '-'}
              </div>
              <div className="text-xs text-navy-200">{player.mobile || '-'}</div>
            </div>
          </div>
          <button
            className="px-3 py-2 rounded-lg border border-white/25 bg-white/10 dark:bg-navy-900/10 text-white hover:bg-white/20"
            onClick={onBack}
          >
            Back to Players
          </button>
        </div>
      </div>

      {(tournamentsError || tournamentsLoading) && (
        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-4 shadow-sm">
          {tournamentsLoading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Refreshing tournaments for stats...</div>
          ) : (
            <div className="text-sm text-amber-700">{tournamentsError}</div>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Record</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{summary.won}W - {summary.lost}L</div>
          <div className="text-2xl font-semibold text-navy-800">{summary.winRate}%</div>
          {analytics.streak.type && (
            <div
              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                analytics.streak.type === 'W'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {analytics.streak.count} {analytics.streak.type === 'W' ? 'win' : 'loss'}
              {analytics.streak.count > 1 ? 's' : ''} in a row
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Matches</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Played {summary.played}</div>
          <div className="text-2xl font-semibold text-navy-800">Live {summary.live}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Points</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">For {summary.pointsFor}</div>
          <div className="text-2xl font-semibold text-navy-800">Against {summary.pointsAgainst}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tournaments</div>
          <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">Upcoming matches {summary.upcoming}</div>
          <div className="text-2xl font-semibold text-navy-800">{summary.tournamentsPlayed}</div>
        </div>
      </div>

      {summary.played > 0 && (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
            <div className="mb-2 font-semibold">Head-to-head</div>
            {analytics.headToHead.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No completed matches yet.</div>
            ) : (
              <div className="space-y-1.5">
                {analytics.headToHead.slice(0, 6).map((h) => (
                  <div key={h.opponent} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{h.opponent}</span>
                    <span className="shrink-0 font-medium">
                      <span className="text-emerald-700">{h.wins}W</span>
                      <span className="text-slate-400"> · </span>
                      <span className="text-rose-600">{h.losses}L</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
            <div className="mb-2 font-semibold">Partners</div>
            {analytics.partners.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No completed matches yet.</div>
            ) : (
              <div className="space-y-1.5">
                {analytics.partners.slice(0, 6).map((p) => (
                  <div key={p.partner} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-slate-700 dark:text-slate-200">{p.partner}</span>
                    <span className="shrink-0 font-medium text-slate-600 dark:text-slate-300">
                      {p.won}/{p.played} · <span className="text-navy-700">{p.winRate}%</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 p-3 sm:p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold">Recent Matches</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Latest tournaments and results</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">No matches found for this player yet.</div>
        ) : (
          <div className="space-y-2">
            {rows.slice(0, 30).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200/90 bg-white/90 dark:bg-navy-900/90 p-2.5 sm:p-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      className="truncate text-left font-medium text-navy-700 hover:text-navy-900 hover:underline"
                      onClick={() => item.tournamentId && onOpenTournament(item.tournamentId)}
                    >
                      {item.tournamentName}
                    </button>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {item.stage}{item.label ? ` | ${item.label}` : ''} | {item.whenText}
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${getStatusPill(item.status)}`}>
                    {getMatchStatusLabel(item.status)}
                  </span>
                </div>
                <div className="mt-1.5 text-sm">
                  <span className="font-medium">{item.ownTeamName}</span> vs <span className="font-medium">{item.opponentTeamName}</span>
                </div>
                <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {item.partnerNames.length > 0 ? `Partner: ${item.partnerNames.join(', ')}` : 'No partner data'}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  Opponents: {item.opponentNames.length > 0 ? item.opponentNames.join(', ') : 'TBD'}
                </div>
                <div className="mt-1 text-sm">
                  Score: {item.scoreFor ?? '-'} - {item.scoreAgainst ?? '-'}
                  {item.completed && item.won && <span className="ml-2 font-medium text-emerald-700">Won</span>}
                  {item.completed && item.lost && <span className="ml-2 font-medium text-red-700">Lost</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
