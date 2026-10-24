import React from 'react';
import { normalizeRosterPlayerName } from '../data/teamMatchFixtures.js';

export function findUniquePlayerByName(name, players, playerId) {
  if (playerId != null) {
    const idMatches = (Array.isArray(players) ? players : []).filter(
      (player) => String(player?.id) === String(playerId)
    );
    if (idMatches.length === 1) return idMatches[0];
  }

  const normalizedName = normalizeRosterPlayerName(name);
  if (!normalizedName) return null;
  const matches = (Array.isArray(players) ? players : []).filter(
    (player) => normalizeRosterPlayerName(player?.name) === normalizedName
  );
  return matches.length === 1 ? matches[0] : null;
}

export default function PlayerProfileLink({
  name,
  players,
  playerId,
  onOpenPlayer,
  className = '',
}) {
  const player = findUniquePlayerByName(name, players, playerId);
  const displayName = player?.name || name;
  if (!player || !onOpenPlayer) return displayName;

  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpenPlayer(player)}
      aria-label={`View ${player.name}'s player profile`}
    >
      {displayName}
    </button>
  );
}
