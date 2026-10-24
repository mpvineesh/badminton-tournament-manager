import React from 'react';
import { normalizeRosterPlayerName } from '../data/teamMatchFixtures.js';

export function findUniquePlayerByName(name, players) {
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
  onOpenPlayer,
  className = '',
}) {
  const player = findUniquePlayerByName(name, players);
  if (!player || !onOpenPlayer) return name;

  return (
    <button
      type="button"
      className={className}
      onClick={() => onOpenPlayer(player)}
      aria-label={`View ${player.name}'s player profile`}
    >
      {name}
    </button>
  );
}
