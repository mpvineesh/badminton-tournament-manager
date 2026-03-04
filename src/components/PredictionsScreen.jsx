import React, { useEffect, useMemo, useState } from 'react';

const EMPTY_FORM = {
  semi1TeamAId: '',
  semi1TeamBId: '',
  semi1ScoreA: '',
  semi1ScoreB: '',
  semi2TeamAId: '',
  semi2TeamBId: '',
  semi2ScoreA: '',
  semi2ScoreB: '',
  finalTeamAId: '',
  finalTeamBId: '',
  finalScoreA: '',
  finalScoreB: '',
};

export default function PredictionsScreen({
  tournaments,
  loadingTournaments,
  loadTournamentDetails,
  loadPrediction,
  savePrediction,
  busy,
  error,
}) {
  const [tournamentId, setTournamentId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [localError, setLocalError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [loadingTournamentDetails, setLoadingTournamentDetails] = useState(false);
  const [selectedTournamentDetails, setSelectedTournamentDetails] = useState(null);

  const upcomingTournaments = useMemo(
    () =>
      (tournaments || []).filter((t) => {
        const status = String(t?.status || 'Upcoming');
        return status === 'Upcoming';
      }),
    [tournaments]
  );

  const selectedTournamentRow = useMemo(
    () => upcomingTournaments.find((t) => t.id === tournamentId) || null,
    [upcomingTournaments, tournamentId]
  );
  const selectedTournament = selectedTournamentDetails || selectedTournamentRow;
  const teams = selectedTournament?.teams || selectedTournament?.payload?.teams || [];
  const groups = selectedTournament?.pools || selectedTournament?.payload?.pools || [];

  useEffect(() => {
    if (!tournamentId) {
      setSelectedTournamentDetails(null);
      return;
    }
    let mounted = true;
    setLoadingTournamentDetails(true);
    Promise.resolve(loadTournamentDetails?.(tournamentId))
      .then((full) => {
        if (!mounted) return;
        setSelectedTournamentDetails(full || null);
      })
      .catch(() => {
        if (!mounted) return;
        setSelectedTournamentDetails(null);
      })
      .finally(() => {
        if (mounted) setLoadingTournamentDetails(false);
      });
    return () => {
      mounted = false;
    };
  }, [tournamentId, loadTournamentDetails]);

  useEffect(() => {
    if (!tournamentId) {
      setForm(EMPTY_FORM);
      return;
    }
    let mounted = true;
    setLoadingPrediction(true);
    setLocalError('');
    setNotice('');
    Promise.resolve(loadPrediction(tournamentId))
      .then((row) => {
        if (!mounted) return;
        const payload = row?.payload || {};
        setForm({
          ...EMPTY_FORM,
          ...payload,
        });
      })
      .catch((e) => {
        if (!mounted) return;
        setForm(EMPTY_FORM);
        setLocalError(e?.message || 'Unable to load prediction.');
      })
      .finally(() => {
        if (mounted) setLoadingPrediction(false);
      });
    return () => {
      mounted = false;
    };
  }, [tournamentId, loadPrediction]);

  const teamOptions = (
    <>
      <option value="">Select team</option>
      {teams.map((tm) => (
        <option key={tm.id} value={tm.id}>
          {tm.name}
        </option>
      ))}
    </>
  );
  const groupOptions = (
    <>
      <option value="">Select group</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </>
  );

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setLocalError('');
    setNotice('');
  }

  function validate() {
    if (!tournamentId) return 'Choose an upcoming tournament.';
    const pairs = [
      ['semi1TeamAId', 'semi1TeamBId', 'Semifinal 1'],
      ['semi2TeamAId', 'semi2TeamBId', 'Semifinal 2'],
      ['finalTeamAId', 'finalTeamBId', 'Final'],
    ];
    for (const [aKey, bKey, label] of pairs) {
      if (!form[aKey] || !form[bKey]) return `${label}: choose both teams.`;
      if (form[aKey] === form[bKey]) return `${label}: teams must be different.`;
    }
    return '';
  }

  async function onSave() {
    const msg = validate();
    if (msg) {
      setLocalError(msg);
      return;
    }
    try {
      await savePrediction(tournamentId, form);
      setNotice('Prediction saved successfully.');
      setLocalError('');
    } catch (e) {
      setLocalError(e?.message || 'Unable to save prediction.');
      setNotice('');
    }
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
        <div className="font-semibold text-lg">Predictions</div>
        <div className="text-sm text-slate-500">Predict semifinals, finals, and scores.</div>
      </div>

      {(error || localError || notice) && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            error || localError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || localError || notice}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm">
        <label className="block text-sm mb-1">Tournament (Upcoming only)</label>
        <select
          value={tournamentId}
          onChange={(e) => setTournamentId(e.target.value)}
          className="w-full sm:w-96 px-3 py-2 border rounded-lg bg-white text-slate-900"
          disabled={loadingTournaments}
        >
          <option value="">Select tournament</option>
          {upcomingTournaments.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {tournamentId && (
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 sm:p-4 shadow-sm space-y-4">
          {loadingPrediction ? (
            <div className="text-sm text-slate-500">Loading prediction...</div>
          ) : loadingTournamentDetails ? (
            <div className="text-sm text-slate-500">Loading selected tournament teams/groups...</div>
          ) : (
            <>
              {selectedTournament?.mode === 'group' && (
                <div className="rounded-lg border p-3">
                  <div className="font-semibold mb-2">Groups (Selected Tournament)</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="px-2 py-1.5 border rounded-lg bg-white"
                      value={form.semi1GroupAId || ''}
                      onChange={(e) => update('semi1GroupAId', e.target.value)}
                    >
                      {groupOptions}
                    </select>
                    <select
                      className="px-2 py-1.5 border rounded-lg bg-white"
                      value={form.semi1GroupBId || ''}
                      onChange={(e) => update('semi1GroupBId', e.target.value)}
                    >
                      {groupOptions}
                    </select>
                  </div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <div className="font-semibold mb-2">Semifinal 1</div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <select
                      className="px-2 py-1.5 border rounded-lg bg-white"
                      value={form.semi1TeamAId}
                      onChange={(e) => update('semi1TeamAId', e.target.value)}
                    >
                      {teamOptions}
                    </select>
                    <span className="text-slate-500 text-center">vs</span>
                    <select
                      className="px-2 py-1.5 border rounded-lg bg-white"
                      value={form.semi1TeamBId}
                      onChange={(e) => update('semi1TeamBId', e.target.value)}
                    >
                      {teamOptions}
                    </select>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <input
                      type="number"
                      className="px-2 py-1.5 border rounded-lg"
                      value={form.semi1ScoreA}
                      onChange={(e) => update('semi1ScoreA', e.target.value)}
                      placeholder="Score A"
                    />
                    <span className="text-slate-500 text-center">-</span>
                    <input
                      type="number"
                      className="px-2 py-1.5 border rounded-lg"
                      value={form.semi1ScoreB}
                      onChange={(e) => update('semi1ScoreB', e.target.value)}
                      placeholder="Score B"
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-3">
                  <div className="font-semibold mb-2">Semifinal 2</div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <select
                      className="px-2 py-1.5 border rounded-lg bg-white"
                      value={form.semi2TeamAId}
                      onChange={(e) => update('semi2TeamAId', e.target.value)}
                    >
                      {teamOptions}
                    </select>
                    <span className="text-slate-500 text-center">vs</span>
                    <select
                      className="px-2 py-1.5 border rounded-lg bg-white"
                      value={form.semi2TeamBId}
                      onChange={(e) => update('semi2TeamBId', e.target.value)}
                    >
                      {teamOptions}
                    </select>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                    <input
                      type="number"
                      className="px-2 py-1.5 border rounded-lg"
                      value={form.semi2ScoreA}
                      onChange={(e) => update('semi2ScoreA', e.target.value)}
                      placeholder="Score A"
                    />
                    <span className="text-slate-500 text-center">-</span>
                    <input
                      type="number"
                      className="px-2 py-1.5 border rounded-lg"
                      value={form.semi2ScoreB}
                      onChange={(e) => update('semi2ScoreB', e.target.value)}
                      placeholder="Score B"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="font-semibold mb-2">Final</div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <select
                    className="px-2 py-1.5 border rounded-lg bg-white"
                    value={form.finalTeamAId}
                    onChange={(e) => update('finalTeamAId', e.target.value)}
                  >
                    {teamOptions}
                  </select>
                  <span className="text-slate-500 text-center">vs</span>
                  <select
                    className="px-2 py-1.5 border rounded-lg bg-white"
                    value={form.finalTeamBId}
                    onChange={(e) => update('finalTeamBId', e.target.value)}
                  >
                    {teamOptions}
                  </select>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <input
                    type="number"
                    className="px-2 py-1.5 border rounded-lg"
                    value={form.finalScoreA}
                    onChange={(e) => update('finalScoreA', e.target.value)}
                    placeholder="Score A"
                  />
                  <span className="text-slate-500 text-center">-</span>
                  <input
                    type="number"
                    className="px-2 py-1.5 border rounded-lg"
                    value={form.finalScoreB}
                    onChange={(e) => update('finalScoreB', e.target.value)}
                    placeholder="Score B"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button className="btn-primary w-full sm:w-auto" onClick={onSave} disabled={busy}>
                  {busy ? 'Saving...' : 'Save Prediction'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
