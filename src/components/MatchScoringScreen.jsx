import React, { useState } from 'react';
import { isGameComplete, gameWinner, isGamePoint } from '../utils/scoring.js';

function formatScore(value) {
  if (value === '' || value == null) return '0';
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return String(Math.max(0, Math.floor(n)));
}

function compactTeamLabel(name) {
  // Strip a leading winner trophy so it isn't mistaken for the first player's name.
  const raw = String(name || '').trim().replace(/^🏆\s*/, '');
  if (!raw) return 'TBD';
  return raw
    .split('&')
    .map((part) => {
      const first = String(part || '').trim().split(/\s+/)[0];
      return first || '';
    })
    .filter(Boolean)
    .join(' & ');
}

function renderPlayerRows(players = [], servingIndex = -1, tone = 'left') {
  const dotClass = tone === 'left' ? 'text-amber-500' : 'text-rose-500';
  if (!players.length) return <div className="text-sm text-slate-300">TBD</div>;
  return (
    <div className="space-y-2">
      {players.map((name, idx) => {
        const serving = idx === servingIndex;
        return (
          <div key={`${name}-${idx}`} className="flex items-center gap-2 text-sm sm:text-base text-slate-700 dark:text-slate-200">
            <span className={serving ? `${dotClass} animate-pulse text-lg sm:text-xl leading-none` : 'text-slate-300 leading-none'}>
              {serving ? '🏸' : '●'}
            </span>
            <span className={serving ? 'font-semibold' : ''}>{compactTeamLabel(name)}</span>
          </div>
        );
      })}
    </div>
  );
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || '';
}

// Which of the four service boxes each player occupies, for a LANDSCAPE court
// (Team A on the left half, Team B on the right, net down the middle).
// Badminton rule: the server stands in the RIGHT service court when their side's
// score is EVEN and the LEFT court when ODD; the receiver is diagonally opposite.
// Boxes are keyed TL/BL (Team A) and TR/BR (Team B). Team A faces right so their
// right court is the lower box; Team B faces left so their right court is upper.
function computeCourtPositions({
  teamAPlayers = [],
  teamBPlayers = [],
  scoreA,
  scoreB,
  servingSide,
  servingPlayerIndexA,
  servingPlayerIndexB,
  leftTeam = 'A',
}) {
  const cells = { TL: null, TR: null, BL: null, BR: null };
  const aP = (teamAPlayers || []).filter(Boolean);
  const bP = (teamBPlayers || []).filter(Boolean);
  const aHalf = leftTeam === 'B' ? 'right' : 'left';
  const bHalf = leftTeam === 'B' ? 'left' : 'right';
  // A team's RIGHT service court is the bottom box on the left half (facing
  // right) and the top box on the right half (facing left).
  const serverPosFor = (half, even) =>
    half === 'left' ? (even ? 'B' : 'T') : even ? 'T' : 'B';

  // half 'left' = Team A (cells TL/BL), 'right' = Team B (TR/BR).
  // pos 'T' = top box, 'B' = bottom box.
  const placeServing = (half, players, serverIdx, pos) => {
    const top = half === 'left' ? 'TL' : 'TR';
    const bottom = half === 'left' ? 'BL' : 'BR';
    const serverCell = pos === 'T' ? top : bottom;
    const partnerCell = pos === 'T' ? bottom : top;
    if (players.length === 0) return;
    if (players.length === 1) {
      cells[serverCell] = { name: players[0], serving: true };
      return;
    }
    const sIdx = serverIdx === 1 ? 1 : 0;
    cells[serverCell] = { name: players[sIdx], serving: true };
    cells[partnerCell] = { name: players[1 - sIdx] };
  };

  const placeReceiving = (half, players, pos) => {
    const top = half === 'left' ? 'TL' : 'TR';
    const bottom = half === 'left' ? 'BL' : 'BR';
    if (players.length === 0) return;
    if (players.length === 1) {
      cells[pos === 'T' ? top : bottom] = { name: players[0], receiving: true };
      return;
    }
    // Doubles receivers keep their boxes; only the diagonal one is the receiver.
    cells[top] = { name: players[0], receiving: pos === 'T' };
    cells[bottom] = { name: players[1], receiving: pos === 'B' };
  };

  const serveScore = servingSide === 'A' ? scoreA : scoreB;
  const even = (Number(serveScore) || 0) % 2 === 0;

  if (servingSide === 'A') {
    const pos = serverPosFor(aHalf, even);
    placeServing(aHalf, aP, servingPlayerIndexA, pos);
    placeReceiving(bHalf, bP, pos === 'T' ? 'B' : 'T'); // diagonal across the net
  } else {
    const pos = serverPosFor(bHalf, even);
    placeServing(bHalf, bP, servingPlayerIndexB, pos);
    placeReceiving(aHalf, aP, pos === 'T' ? 'B' : 'T');
  }
  return cells;
}

function CourtQuad({ data }) {
  if (!data?.name) return <div />;
  return (
    <div className="flex items-center justify-center p-1">
      <div
        className={`flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow ${
          data.serving
            ? 'bg-amber-400 text-amber-950 ring-2 ring-white'
            : data.receiving
              ? 'bg-white text-emerald-900 ring-1 ring-emerald-300'
              : 'bg-emerald-950/70 text-white'
        }`}
      >
        {data.serving && <span className="leading-none">🏸</span>}
        <span className="truncate">{firstName(data.name)}</span>
      </div>
    </div>
  );
}

function CourtView(props) {
  const cells = computeCourtPositions(props);
  const leftTeam = props.leftTeam === 'B' ? 'B' : 'A';
  const rightTeam = leftTeam === 'A' ? 'B' : 'A';
  return (
    <div className="mt-3 mx-auto w-full max-w-sm">
      <div className="relative aspect-[5/2] overflow-hidden rounded-md border-2 border-white/80 bg-emerald-700 shadow-inner">
        {/* centre line (runs the length of the court) */}
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/50" />
        {/* short service lines (parallel to the net) */}
        <div className="absolute inset-y-0 left-[22%] w-px bg-white/35" />
        <div className="absolute inset-y-0 right-[22%] w-px bg-white/35" />
        {/* net (vertical, centre) */}
        <div className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-white" />
        {/* side labels */}
        <div className="absolute left-1 top-1 rounded bg-black/30 px-1 text-[9px] font-bold text-white">{leftTeam}</div>
        <div className="absolute right-1 top-1 rounded bg-black/30 px-1 text-[9px] font-bold text-white">{rightTeam}</div>
        {/* col 1 = Team A (left), col 2 = Team B (right); row 1 = top, row 2 = bottom */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <CourtQuad data={cells.TL} />
          <CourtQuad data={cells.TR} />
          <CourtQuad data={cells.BL} />
          <CourtQuad data={cells.BR} />
        </div>
      </div>
      <div className="mt-1 text-center text-[10px] text-slate-500 dark:text-slate-400">
        🏸 serving · positions follow the score
      </div>
    </div>
  );
}

export default function MatchScoringScreen({
  title,
  statusLabel,
  teamAName,
  teamBName,
  teamAPlayers,
  teamBPlayers,
  scoreA,
  scoreB,
  servingSide,
  servingPlayerIndexA,
  servingPlayerIndexB,
  onPointA,
  onPointB,
  onUndo,
  onChangeServe,
  onNextGame,
  onBack,
  saving,
  locked,
}) {
  const [endsSwapped, setEndsSwapped] = useState(false);
  const disabled = Boolean(locked || saving);
  const teamALabel = compactTeamLabel(teamAName);
  const teamBLabel = compactTeamLabel(teamBName);
  const complete = isGameComplete(scoreA, scoreB);
  const winnerSide = gameWinner(scoreA, scoreB);
  const gamePoint = isGamePoint(scoreA, scoreB);
  const leaderSide = (Number(scoreA) || 0) >= (Number(scoreB) || 0) ? 'A' : 'B';

  const sA = Number(scoreA) || 0;
  const sB = Number(scoreB) || 0;
  // Ends can be changed before the first point or when a side reaches 11.
  const canSwapEnds = !complete && ((sA === 0 && sB === 0) || sA === 11 || sB === 11);
  const leftTeam = endsSwapped ? 'B' : 'A';
  const rightTeam = endsSwapped ? 'A' : 'B';

  const renderTeamCard = (team) => {
    const isA = team === 'A';
    const serving = servingSide === team;
    return (
      <div
        key={team}
        className={`overflow-hidden rounded-2xl border bg-gradient-to-b p-3 sm:p-5 shadow-sm ${
          isA ? 'from-emerald-100 to-emerald-50 text-emerald-900' : 'from-rose-100 to-rose-50 text-rose-900'
        } ${
          serving
            ? 'border-amber-300 ring-2 ring-amber-200/70 animate-pulse'
            : isA
              ? 'border-emerald-200'
              : 'border-rose-200'
        }`}
      >
        <div className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-xs font-bold tracking-[0.25em] text-white ${isA ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {team}
        </div>
        <div className="text-lg sm:text-2xl font-semibold leading-tight">{isA ? teamALabel : teamBLabel}</div>
        <div className="mt-1 min-h-[44px]">
          {renderPlayerRows(
            isA ? teamAPlayers : teamBPlayers,
            serving ? (isA ? servingPlayerIndexA : servingPlayerIndexB) : -1,
            isA ? 'left' : 'right'
          )}
        </div>
        <div className={`mt-4 text-6xl sm:text-7xl font-black leading-none ${isA ? 'text-emerald-700' : 'text-rose-700'}`}>
          {formatScore(isA ? scoreA : scoreB)}
        </div>
      </div>
    );
  };

  const renderPointButton = (team) => {
    const isA = team === 'A';
    return (
      <button
        key={team}
        className={`min-h-[56px] rounded-xl border px-3 py-4 text-lg sm:text-2xl font-black text-white shadow-sm disabled:opacity-50 ${
          isA
            ? 'border-emerald-300 bg-gradient-to-b from-emerald-500 to-emerald-600'
            : 'border-rose-300 bg-gradient-to-b from-rose-500 to-rose-600'
        }`}
        onClick={isA ? onPointA : onPointB}
        disabled={disabled || complete}
      >
        + POINT
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-navy-200/70 bg-gradient-to-br from-navy-100 via-navy-50 to-white dark:to-navy-900 p-3 sm:p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-100">
        <div className="text-sm sm:text-base font-semibold tracking-wide">{title}</div>
        <div className="rounded-full border border-navy-200 bg-white/85 dark:bg-navy-900/85 px-3 py-1 text-xs font-semibold text-navy-800">
          {statusLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {renderTeamCard(leftTeam)}
        {renderTeamCard(rightTeam)}
      </div>

      {complete ? (
        <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-center text-sm font-bold text-emerald-800">
          Game complete — {(winnerSide === 'A' ? teamALabel : teamBLabel)} wins {Math.max(sA, sB)}–{Math.min(sA, sB)}
        </div>
      ) : gamePoint ? (
        <div className="mt-3 rounded-xl border border-orange-300 bg-orange-50 p-2.5 text-center text-sm font-bold text-orange-700">
          Game point — {leaderSide === 'A' ? teamALabel : teamBLabel} · Serving: Team {servingSide}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-center text-base font-semibold text-amber-700">
          Serving: Team {servingSide}
        </div>
      )}

      {canSwapEnds && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setEndsSwapped((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy-300 bg-white dark:bg-navy-800 px-4 py-1.5 text-sm font-semibold text-navy-800 dark:text-navy-100 shadow-sm hover:bg-navy-50 dark:hover:bg-navy-700"
          >
            ⇄ Change ends
          </button>
        </div>
      )}

      <CourtView
        teamAPlayers={teamAPlayers}
        teamBPlayers={teamBPlayers}
        scoreA={scoreA}
        scoreB={scoreB}
        servingSide={servingSide}
        servingPlayerIndexA={servingPlayerIndexA}
        servingPlayerIndexB={servingPlayerIndexB}
        leftTeam={leftTeam}
      />

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        {renderPointButton(leftTeam)}
        {renderPointButton(rightTeam)}
      </div>
      {complete && (
        <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
          Tap “Next Game” to save this result.
        </p>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        <button
          className="col-span-1 rounded-xl border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 px-2 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 disabled:opacity-60"
          onClick={onUndo}
          disabled={disabled}
        >
          Undo
        </button>
        <button
          className="col-span-2 rounded-xl border border-navy-300 bg-navy-100 px-2 py-2.5 text-sm font-bold text-navy-900 hover:bg-navy-200 disabled:opacity-60"
          onClick={onChangeServe}
          disabled={disabled}
        >
          Change Serve
        </button>
        <button
          className="col-span-1 rounded-xl border border-navy-200 bg-gradient-to-b from-navy-500 to-navy-600 px-2 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          onClick={onNextGame}
          disabled={disabled}
        >
          {saving ? 'Saving...' : 'Next Game'}
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          className="rounded-lg border border-slate-300 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50"
          onClick={onBack}
        >
          Back to Matches
        </button>
      </div>
    </div>
  );
}
