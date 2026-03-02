import React from 'react';

export default function HomeScreen({
  fixtureCount,
  teamCount,
  playerCount,
  onOpenFixture,
  onManagePlayers,
  onBrowseTournaments,
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-6 sm:p-10">
        <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold">
          Welcome
        </p>
        <h2 className="mt-2 text-2xl sm:text-4xl font-bold text-slate-900">
          Plan Badminton Tournaments Faster
        </h2>
        <p className="mt-3 max-w-2xl text-sm sm:text-base text-slate-600">
          Build balanced fixtures, track scores, and finalize winners in one
          place.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary w-full sm:w-auto" onClick={onOpenFixture}>
            Open Fixture
          </button>
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg border hover:bg-slate-100"
            onClick={onManagePlayers}
          >
            Manage Players
          </button>
          <button
            className="w-full sm:w-auto px-4 py-2 rounded-lg border hover:bg-slate-100"
            onClick={onBrowseTournaments}
          >
            Browse Tournaments
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Fixtures Built</div>
          <div className="mt-1 text-2xl font-bold">{fixtureCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Teams</div>
          <div className="mt-1 text-2xl font-bold">{teamCount}</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-slate-500">Players</div>
          <div className="mt-1 text-2xl font-bold">{playerCount}</div>
        </div>
      </div>
    </section>
  );
}
