// Standard badminton (rally) scoring rules, centralized so the live scoring
// screen, manual score entry, and match finalization all agree.

export const POINTS_TO_WIN = 21;
export const HARD_CAP = 30; // at 29-29, the next point (30) wins.

export function clampScore(value) {
  const n = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(HARD_CAP, n));
}

// A game is decided at 21 with a 2-point lead, or whoever reaches the 30 cap.
export function isGameComplete(a, b) {
  const x = Number(a) || 0;
  const y = Number(b) || 0;
  const hi = Math.max(x, y);
  const lo = Math.min(x, y);
  if (hi >= HARD_CAP) return true;
  return hi >= POINTS_TO_WIN && hi - lo >= 2;
}

// Returns 'A' | 'B' | null for which side has won the game (null if undecided).
export function gameWinner(a, b) {
  if (!isGameComplete(a, b)) return null;
  return (Number(a) || 0) > (Number(b) || 0) ? 'A' : 'B';
}

// True when the leading side is one point away from winning the game
// ("game point"), useful for highlighting in the UI.
export function isGamePoint(a, b) {
  const x = Number(a) || 0;
  const y = Number(b) || 0;
  if (isGameComplete(x, y)) return false;
  const hi = Math.max(x, y);
  const lo = Math.min(x, y);
  if (hi >= HARD_CAP - 1) return true; // 29 -> next point caps at 30
  return hi >= POINTS_TO_WIN - 1 && hi - lo >= 1;
}
