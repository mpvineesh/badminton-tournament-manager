import React from 'react';

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
      {players.map((name, idx) => (
        <div key={`${name}-${idx}`} className="flex items-center gap-2 text-sm sm:text-base text-slate-700">
          <span className={idx === servingIndex ? `${dotClass} animate-pulse` : 'text-slate-300'}>●</span>
          <span>{compactTeamLabel(name)}</span>
        </div>
      ))}
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

  return (
    <div className="rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-sky-100 via-cyan-50 to-white p-3 sm:p-5 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3 text-slate-800">
        <div className="text-sm sm:text-base font-semibold tracking-wide">{title}</div>
        <div className="rounded-full border border-cyan-200 bg-white/85 px-3 py-1 text-xs font-semibold text-cyan-800">
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

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2 text-center text-sm font-semibold text-amber-700">
        Serving: Team {servingSide}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
        <button
          className="rounded-xl border border-emerald-300 bg-gradient-to-b from-emerald-500 to-emerald-600 px-3 py-3 sm:py-4 text-lg sm:text-2xl font-black text-white shadow-sm disabled:opacity-60"
          onClick={onPointA}
          disabled={disabled}
        >
          + POINT
        </button>
        <button
          className="rounded-xl border border-rose-300 bg-gradient-to-b from-rose-500 to-rose-600 px-3 py-3 sm:py-4 text-lg sm:text-2xl font-black text-white shadow-sm disabled:opacity-60"
          onClick={onPointB}
          disabled={disabled}
        >
          + POINT
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
        <button
          className="col-span-1 rounded-xl border border-slate-300 bg-white px-2 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          onClick={onUndo}
          disabled={disabled}
        >
          Undo
        </button>
        <button
          className="col-span-2 rounded-xl border border-cyan-300 bg-cyan-100 px-2 py-2.5 text-sm font-bold text-cyan-900 hover:bg-cyan-200 disabled:opacity-60"
          onClick={onChangeServe}
          disabled={disabled}
        >
          Change Serve
        </button>
        <button
          className="col-span-1 rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-500 to-blue-600 px-2 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
          onClick={onNextGame}
          disabled={disabled}
        >
          {saving ? 'Saving...' : 'Next Game'}
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          onClick={onBack}
        >
          Back to Matches
        </button>
      </div>
    </div>
  );
}
