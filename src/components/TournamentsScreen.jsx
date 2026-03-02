import StandingsTable from './StandingsTable.jsx';
import { computeStandings } from '../utils/tournament.js';

export default function TournamentsScreen({
  appError,
  tournamentsError,
  tournamentView,
  selectedTournament,
  selectedMatchRef,
  refreshTournamentsList,
  tournamentsLoading,
  tournamentsList,
  handleStatusChange,
  handleDateChange,
  onOpenTournamentFixture,
  handleTournamentDelete,
  openTournamentLiveView,
  setTournamentView,
  getTournamentMatches,
  openMatchTracking,
  findMatchByRef,
  matchScoreA,
  setMatchScoreA,
  matchScoreB,
  setMatchScoreB,
  matchWinnerId,
  setMatchWinnerId,
  saveMatchTracking,
  savingMatch,
}) {
  return (
    <section className="space-y-4">
      {(appError || tournamentsError) && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {appError || tournamentsError}
        </div>
      )}

      {tournamentView === 'list' && (
        <>
          <div className="rounded-xl border bg-white p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="font-semibold">All Tournaments</div>
              <button
                className="px-3 py-1.5 rounded-lg border hover:bg-slate-100 text-sm"
                onClick={refreshTournamentsList}
              >
                Refresh
              </button>
            </div>
            {tournamentsLoading ? (
              <div className="text-sm text-slate-500">Loading tournaments...</div>
            ) : tournamentsList.length === 0 ? (
              <div className="text-sm text-slate-500">No tournaments found.</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Date</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Created</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tournamentsList.map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="p-2">{row.name}</td>
                        <td className="p-2">
                          <input
                            type="date"
                            className="px-2 py-1 rounded border bg-white"
                            value={row.eventDate || ''}
                            onChange={(e) => handleDateChange(row.id, e.target.value)}
                          />
                        </td>
                        <td className="p-2">
                          <select
                            className="px-2 py-1 rounded border bg-white"
                            value={row.status || 'Upcoming'}
                            onChange={(e) => handleStatusChange(row.id, e.target.value)}
                          >
                            <option value="Upcoming">Upcoming</option>
                            <option value="Live">Live</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </td>
                        <td className="p-2">
                          {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
                        </td>
                        <td className="p-2 text-right">
                          <div className="inline-flex flex-wrap gap-2 justify-end">
                            <button
                              className="px-2 py-1 rounded border hover:bg-slate-100"
                              onClick={() => onOpenTournamentFixture(row.id)}
                            >
                              Open Fixture
                            </button>
                            <button
                              className="px-2 py-1 rounded border text-red-700 hover:bg-red-50"
                              onClick={() => handleTournamentDelete(row.id)}
                            >
                              Delete
                            </button>
                            {row.status === 'Live' && (
                              <>
                                <button
                                  className="px-2 py-1 rounded border hover:bg-slate-100"
                                  onClick={() => openTournamentLiveView(row.id, 'matches')}
                                >
                                  View Matches
                                </button>
                                <button
                                  className="px-2 py-1 rounded border hover:bg-slate-100"
                                  onClick={() => openTournamentLiveView(row.id, 'points')}
                                >
                                  Point Table
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tournamentView === 'matches' && selectedTournament && (
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <div className="font-semibold text-lg">
                Live Matches - {selectedTournament.name}
              </div>
              <div className="text-sm text-slate-500">Track match-wise scores and winners.</div>
            </div>
            <button
              className="px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={() => setTournamentView('list')}
            >
              Back
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="p-2">Stage</th>
                  <th className="p-2">Match</th>
                  <th className="p-2">Score</th>
                  <th className="p-2">Status</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {getTournamentMatches(selectedTournament).map((m, idx) => {
                  const teamsById = Object.fromEntries(
                    (selectedTournament.teams || []).map((tm) => [tm.id, tm])
                  );
                  const teamA = teamsById[m.teamAId || '']?.name || 'TBD';
                  const teamB = teamsById[m.teamBId || '']?.name || 'TBD';
                  return (
                    <tr key={`${m.stage}-${m.id}`} className="border-t">
                      <td className="p-2">{m.stage}</td>
                      <td className="p-2">
                        {m.label || `Match ${idx + 1}`} ({teamA} vs {teamB})
                      </td>
                      <td className="p-2">
                        {m.scoreA ?? '-'} : {m.scoreB ?? '-'}
                      </td>
                      <td className="p-2">{m.status || 'Pending'}</td>
                      <td className="p-2 text-right">
                        <button
                          className="px-2 py-1 rounded border hover:bg-slate-100"
                          onClick={() => openMatchTracking({ stage: m.stage, id: m.id })}
                        >
                          Track
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tournamentView === 'match' && selectedTournament && selectedMatchRef && (
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          {(() => {
            const match = findMatchByRef(selectedTournament, selectedMatchRef);
            if (!match) return <div className="text-sm text-slate-500">Match not found.</div>;
            const teamsById = Object.fromEntries(
              (selectedTournament.teams || []).map((tm) => [tm.id, tm])
            );
            const playersById = Object.fromEntries(
              (selectedTournament.players || []).map((pl) => [pl.id, pl])
            );
            const teamA = teamsById[match.teamAId || ''];
            const teamB = teamsById[match.teamBId || ''];
            const teamAPlayers = (teamA?.players || [])
              .map((pid) => playersById[pid]?.name)
              .filter(Boolean)
              .join(', ');
            const teamBPlayers = (teamB?.players || [])
              .map((pid) => playersById[pid]?.name)
              .filter(Boolean)
              .join(', ');
            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <div className="font-semibold text-lg">
                      Track Match - {match.label || selectedMatchRef.stage}
                    </div>
                    <div className="text-sm text-slate-500">
                      Update score and winner for this match.
                    </div>
                  </div>
                  <button
                    className="px-3 py-2 rounded-lg border hover:bg-slate-100"
                    onClick={() => setTournamentView('matches')}
                  >
                    Back
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold">{teamA?.name || 'Team A'}</div>
                    <div className="text-sm text-slate-500 mt-1">Players: {teamAPlayers || '-'}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="font-semibold">{teamB?.name || 'Team B'}</div>
                    <div className="text-sm text-slate-500 mt-1">Players: {teamBPlayers || '-'}</div>
                  </div>
                </div>

                <div className="mt-4 grid sm:grid-cols-3 gap-3">
                  <input
                    type="number"
                    className="px-3 py-2 border rounded-lg"
                    placeholder="Score Team A"
                    value={matchScoreA}
                    onChange={(e) => setMatchScoreA(e.target.value)}
                  />
                  <input
                    type="number"
                    className="px-3 py-2 border rounded-lg"
                    placeholder="Score Team B"
                    value={matchScoreB}
                    onChange={(e) => setMatchScoreB(e.target.value)}
                  />
                  <select
                    className="px-3 py-2 border rounded-lg bg-white"
                    value={matchWinnerId}
                    onChange={(e) => setMatchWinnerId(e.target.value)}
                  >
                    <option value="">Choose Winner</option>
                    <option value={match.teamAId || ''}>{teamA?.name || 'Team A'}</option>
                    <option value={match.teamBId || ''}>{teamB?.name || 'Team B'}</option>
                  </select>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={saveMatchTracking}
                    disabled={savingMatch}
                  >
                    {savingMatch ? 'Saving...' : 'Save Match'}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {tournamentView === 'points' && selectedTournament && (
        <div className="rounded-xl border bg-white p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <div className="font-semibold text-lg">Point Table - {selectedTournament.name}</div>
              <div className="text-sm text-slate-500">Standings by group for this tournament.</div>
            </div>
            <button
              className="px-3 py-2 rounded-lg border hover:bg-slate-100"
              onClick={() => setTournamentView('list')}
            >
              Back
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const standings = computeStandings(
                selectedTournament.pools || [],
                selectedTournament.teams || [],
                selectedTournament.groupMatches || []
              );
              const teamsById = Object.fromEntries(
                (selectedTournament.teams || []).map((tm) => [tm.id, tm])
              );
              const pools = selectedTournament.pools || [];
              if (!pools.length) {
                return <div className="text-sm text-slate-500">No groups available.</div>;
              }
              return pools.map((p, idx) => (
                <div key={p.id} className="rounded-xl border p-4 bg-white">
                  <div className="font-semibold mb-2">{`Group ${idx + 1}`}</div>
                  <StandingsTable rows={standings[p.id] || []} teamsById={teamsById} />
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </section>
  );
}
