import React from 'react';

function Field({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function toNonNegative(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, n);
}

export default function TournamentSettingsScreen({
  tournament,
  onBack,
  onSave,
  saving,
  error,
}) {
  const [form, setForm] = React.useState({
    name: '',
    eventDate: '',
    mode: 'doubles',
    numPools: '',
    membersPerGroup: '',
    groupGamesBetweenGroups: '',
    winnerPoints: 0,
    winnerBonusOppScoreLessThan: 0,
    winnerBonusPoints: 0,
    loserBonusScoreGreaterThan: 0,
    loserBonusPoints: 0,
  });
  const [localError, setLocalError] = React.useState('');

  React.useEffect(() => {
    const pointSystem = tournament?.pointSystem || {};
    setForm({
      name: String(tournament?.name || ''),
      eventDate: String(tournament?.eventDate || ''),
      mode: String(tournament?.mode || 'doubles'),
      numPools: String(Number(tournament?.numPools) || ''),
      membersPerGroup: String(Number(tournament?.membersPerGroup) || ''),
      groupGamesBetweenGroups: String(Number(tournament?.groupGamesBetweenGroups) || ''),
      winnerPoints: String(Number(pointSystem?.winnerPoints) || 0),
      winnerBonusOppScoreLessThan: String(Number(pointSystem?.winnerBonusOppScoreLessThan) || 0),
      winnerBonusPoints: String(Number(pointSystem?.winnerBonusPoints) || 0),
      loserBonusScoreGreaterThan: String(Number(pointSystem?.loserBonusScoreGreaterThan) || 0),
      loserBonusPoints: String(Number(pointSystem?.loserBonusPoints) || 0),
    });
    setLocalError('');
  }, [tournament?.id]);

  if (!tournament) {
    return (
      <section className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-4 shadow-sm">
        <div className="text-sm text-slate-500 dark:text-slate-400">Tournament settings not found.</div>
        <button
          className="mt-3 btn-ghost"
          onClick={onBack}
        >
          Back
        </button>
      </section>
    );
  }

  const pools = Array.isArray(tournament?.pools) ? tournament.pools : [];
  const teams = Array.isArray(tournament?.teams) ? tournament.teams : [];
  const players = Array.isArray(tournament?.players) ? tournament.players : [];
  const groupPairings = Array.isArray(tournament?.groupLevelPairings)
    ? tournament.groupLevelPairings
    : [];

  async function handleSave(e) {
    e.preventDefault();
    const name = String(form.name || '').trim();
    if (!name) {
      setLocalError('Tournament name is required.');
      return;
    }
    if (!String(form.eventDate || '').trim()) {
      setLocalError('Tournament date is required.');
      return;
    }
    setLocalError('');
    await onSave?.({
      name,
      eventDate: String(form.eventDate || '').trim(),
      mode: String(form.mode || 'doubles'),
      numPools: toNonNegative(form.numPools),
      membersPerGroup: toNonNegative(form.membersPerGroup),
      groupGamesBetweenGroups: toNonNegative(form.groupGamesBetweenGroups),
      pointSystem: {
        winnerPoints: toNonNegative(form.winnerPoints),
        winnerBonusOppScoreLessThan: toNonNegative(form.winnerBonusOppScoreLessThan),
        winnerBonusPoints: toNonNegative(form.winnerBonusPoints),
        loserBonusScoreGreaterThan: toNonNegative(form.loserBonusScoreGreaterThan),
        loserBonusPoints: toNonNegative(form.loserBonusPoints),
      },
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-gradient-to-r from-white dark:from-navy-900 to-navy-50/50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Tournament Settings</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-slate-100">{tournament.name || 'Tournament'}</div>
          </div>
          <button
            className="btn-ghost"
            onClick={onBack}
          >
            Back to Tournaments
          </button>
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSave}>
        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Basic</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</div>
              <input
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <Field label="Status" value={String(tournament?.status || 'Upcoming')} />
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Date</div>
              <input
                type="date"
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.eventDate}
                onChange={(e) => setForm((prev) => ({ ...prev, eventDate: e.target.value }))}
              />
            </label>
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Format</div>
              <select
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.mode}
                onChange={(e) => setForm((prev) => ({ ...prev, mode: e.target.value }))}
              >
                <option value="doubles">Doubles</option>
                <option value="group">Group</option>
                <option value="singles">Singles</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Group Setup</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Pools</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.numPools}
                onChange={(e) => setForm((prev) => ({ ...prev, numPools: e.target.value }))}
              />
            </label>
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Members/Group</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.membersPerGroup}
                onChange={(e) => setForm((prev) => ({ ...prev, membersPerGroup: e.target.value }))}
              />
            </label>
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Inter-group Games</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.groupGamesBetweenGroups}
                onChange={(e) => setForm((prev) => ({ ...prev, groupGamesBetweenGroups: e.target.value }))}
              />
            </label>
            <Field label="Configured Pairings" value={String(groupPairings.length)} />
          </div>
          {pools.length > 0 && (
            <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-700 dark:text-slate-200">Pool Names:</span>{' '}
              {pools.map((p, idx) => String(p?.name || `Group ${idx + 1}`)).join(', ')}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Points Rules</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Winner Points</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.winnerPoints}
                onChange={(e) => setForm((prev) => ({ ...prev, winnerPoints: e.target.value }))}
              />
            </label>
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Winner Bonus If Opp &lt;</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.winnerBonusOppScoreLessThan}
                onChange={(e) => setForm((prev) => ({ ...prev, winnerBonusOppScoreLessThan: e.target.value }))}
              />
            </label>
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Winner Bonus Points</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.winnerBonusPoints}
                onChange={(e) => setForm((prev) => ({ ...prev, winnerBonusPoints: e.target.value }))}
              />
            </label>
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Loser Bonus If Score &gt;</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.loserBonusScoreGreaterThan}
                onChange={(e) => setForm((prev) => ({ ...prev, loserBonusScoreGreaterThan: e.target.value }))}
              />
            </label>
            <label className="rounded-lg border border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-900 px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Loser Bonus Points</div>
              <input
                type="number"
                min={0}
                className="mt-0.5 w-full bg-transparent text-sm font-medium text-slate-900 dark:text-slate-100 outline-none"
                value={form.loserBonusPoints}
                onChange={(e) => setForm((prev) => ({ ...prev, loserBonusPoints: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 p-3 sm:p-4 shadow-sm">
          <div className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Snapshot</div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Players" value={String(players.length)} />
            <Field label="Teams" value={String(teams.length)} />
            <Field
              label="Matches"
              value={String(
                (Array.isArray(tournament?.groupMatches) ? tournament.groupMatches.length : 0) +
                  (Array.isArray(tournament?.semiMatches) ? tournament.semiMatches.length : 0) +
                  (tournament?.finalMatch ? 1 : 0)
              )}
            />
          </div>
        </div>

        {(localError || error) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {localError || error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </section>
  );
}
