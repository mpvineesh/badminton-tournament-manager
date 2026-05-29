import React from 'react';
import { isGameComplete, gameWinner, isGamePoint } from '../utils/scoring.js';

function formatScore(value) {
  if (value === '' || value == null) return '0';
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return String(Math.max(0, Math.floor(n)));
}

function compactTeamLabel(name) {
  const raw = String(name || '').trim();
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
  const disabled = Boolean(locked || saving);
  const teamALabel = compactTeamLabel(teamAName);
  const teamBLabel = compactTeamLabel(teamBName);
  const complete = isGameComplete(scoreA, scoreB);
  const winnerSide = gameWinner(scoreA, scoreB);
  const gamePoint = isGamePoint(scoreA, scoreB);
  const leaderSide = (Number(scoreA) || 0) >= (Number(scoreB) || 0) ? 'A' : 'B';

  return (
    <div className="rounded-2xl border border-navy-200/70 bg-gradient-to-br from-navy-100 via-navy-50 to-white dark:to-navy-900 p-3 sm:p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3 text-slate-800 dark:text-slate-100">
        <div className="text-sm sm:text-base font-semibold tracking-wide">{title}</div>
        <div className="rounded-full border border-navy-200 bg-white/85 dark:bg-navy-900/85 px-3 py-1 text-xs font-semibold text-navy-800">
          {statusLabel}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div
          className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-emerald-100 to-emerald-50 p-3 sm:p-5 text-emerald-900 shadow-sm ${
            servingSide === 'A'
              ? 'border-amber-300 ring-2 ring-amber-200/70 animate-pulse'
              : 'border-emerald-200'
          }`}
        >
          <div className="mb-2 inline-flex rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold tracking-[0.25em] text-white">A</div>
          <div className="text-lg sm:text-2xl font-semibold leading-tight">{teamALabel}</div>
          <div className="mt-1 min-h-[44px]">
            {renderPlayerRows(teamAPlayers, servingSide === 'A' ? servingPlayerIndexA : -1, 'left')}
          </div>
          <div className="mt-4 text-6xl sm:text-7xl font-black leading-none text-emerald-700">
            {formatScore(scoreA)}
          </div>
        </div>
        <div
          className={`overflow-hidden rounded-2xl border bg-gradient-to-b from-rose-100 to-rose-50 p-3 sm:p-5 text-rose-900 shadow-sm ${
            servingSide === 'B'
              ? 'border-amber-300 ring-2 ring-amber-200/70 animate-pulse'
              : 'border-rose-200'
          }`}
        >
          <div className="mb-2 inline-flex rounded-full bg-rose-600 px-2 py-0.5 text-xs font-bold tracking-[0.25em] text-white">B</div>
          <div className="text-lg sm:text-2xl font-semibold leading-tight">{teamBLabel}</div>
          <div className="mt-1 min-h-[44px]">
            {renderPlayerRows(teamBPlayers, servingSide === 'B' ? servingPlayerIndexB : -1, 'right')}
          </div>
          <div className="mt-4 text-6xl sm:text-7xl font-black leading-none text-rose-700">
            {formatScore(scoreB)}
          </div>
        </div>
      </div>

      {complete ? (
        <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-center text-sm font-bold text-emerald-800">
          Game complete — {(winnerSide === 'A' ? teamALabel : teamBLabel)} wins {Math.max(Number(scoreA) || 0, Number(scoreB) || 0)}–{Math.min(Number(scoreA) || 0, Number(scoreB) || 0)}
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

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <button
          className="min-h-[56px] rounded-xl border border-emerald-300 bg-gradient-to-b from-emerald-500 to-emerald-600 px-3 py-4 text-lg sm:text-2xl font-black text-white shadow-sm disabled:opacity-50"
          onClick={onPointA}
          disabled={disabled || complete}
        >
          + POINT
        </button>
        <button
          className="min-h-[56px] rounded-xl border border-rose-300 bg-gradient-to-b from-rose-500 to-rose-600 px-3 py-4 text-lg sm:text-2xl font-black text-white shadow-sm disabled:opacity-50"
          onClick={onPointB}
          disabled={disabled || complete}
        >
          + POINT
        </button>
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
