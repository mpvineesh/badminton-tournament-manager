// ================================
// FILE: src/App.jsx
// ================================
import React, { useEffect, useRef, useState } from 'react';

import Card from './components/Card.jsx';
import SelectPlayer from './components/SelectPlayer.jsx';
import PlayerSelectInline from './components/PlayerSelectInline.jsx';
import ScoreInput from './components/ScoreInput.jsx';
import TeamBadge from './components/TeamBadge.jsx';
import MatchesTable from './components/MatchesTable.jsx';
import StandingsTable from './components/StandingsTable.jsx';
import BulkTeamEditor from './components/BulkTeamEditor.jsx';
import PlayerPickerModal from './components/PlayerPickerModal.jsx';
import AppHeader from './components/AppHeader.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import PlayersScreen from './components/PlayersScreen.jsx';
import TournamentsScreen from './components/TournamentsScreen.jsx';

import useTournamentState from './hooks/useTournamentState.js';
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  listTournaments,
  loadTournament,
  saveTournament,
  supabase,
  updateTournament,
  updateTournamentStatus,
  updatePlayer,
  deleteTournament,
} from './supabaseAdapter.js';

export default function App() {
  const t = useTournamentState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [playersDbList, setPlayersDbList] = useState([]);
  const [playersDbLoading, setPlayersDbLoading] = useState(false);
  const [playersDbSaving, setPlayersDbSaving] = useState(false);
  const [playersDbUpdatingId, setPlayersDbUpdatingId] = useState(null);
  const [playersDbDeletingId, setPlayersDbDeletingId] = useState(null);
  const [playersDbError, setPlayersDbError] = useState('');
  const [activeMenu, setActiveMenu] = useState('home');
  const [membersPerGroup, setMembersPerGroup] = useState(4);
  const [groupNames, setGroupNames] = useState(['Group A', 'Group B']);
  const [tournamentStatus, setTournamentStatus] = useState('Upcoming');
  const [tournamentsList, setTournamentsList] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [tournamentsError, setTournamentsError] = useState('');
  const [tournamentView, setTournamentView] = useState('list');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedMatchRef, setSelectedMatchRef] = useState(null);
  const [matchScoreA, setMatchScoreA] = useState('');
  const [matchScoreB, setMatchScoreB] = useState('');
  const [matchWinnerId, setMatchWinnerId] = useState('');
  const [savingMatch, setSavingMatch] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsLoggedIn(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    refreshPlayersList();
  }, []);

  useEffect(() => {
    if (activeMenu === 'tournaments') refreshTournamentsList();
  }, [activeMenu]);

  useEffect(() => {
    if (t.mode === 'singles') t.setMode('group');
  }, [t.mode]);

  useEffect(() => {
    const n = Math.max(1, Number(t.numPools) || 1);
    setGroupNames((prev) => {
      const next = [...prev];
      while (next.length < n) next.push(`Group ${String.fromCharCode(65 + next.length)}`);
      return next.slice(0, n);
    });
  }, [t.numPools]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  async function handleAuthMenu() {
    setMenuOpen(false);
    setAuthBusy(true);
    try {
      if (isLoggedIn) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } else {
        const email = window.prompt('Enter email for login link');
        if (!email) return;
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        t.setError(`Login link sent to ${email}. Check your inbox.`);
      }
    } catch (e) {
      console.error(e);
      t.setError(e?.message || 'Authentication failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function refreshPlayersList() {
    setPlayersDbLoading(true);
    setPlayersDbError('');
    try {
      const rows = await listPlayers();
      setPlayersDbList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setPlayersDbError(e?.message || 'Unable to load players.');
      setPlayersDbList([]);
    } finally {
      setPlayersDbLoading(false);
    }
  }

  async function handleAddPlayerToDb(player) {
    setPlayersDbSaving(true);
    setPlayersDbError('');
    try {
      await createPlayer(player);
      await refreshPlayersList();
      return true;
    } catch (e) {
      console.error(e);
      setPlayersDbError(e?.message || 'Unable to save player.');
      return false;
    } finally {
      setPlayersDbSaving(false);
    }
  }

  async function handleUpdatePlayerInDb(id, player) {
    setPlayersDbUpdatingId(id);
    setPlayersDbError('');
    try {
      await updatePlayer(id, player);
      await refreshPlayersList();
      return true;
    } catch (e) {
      console.error(e);
      setPlayersDbError(e?.message || 'Unable to update player.');
      return false;
    } finally {
      setPlayersDbUpdatingId(null);
    }
  }

  async function handleDeletePlayerInDb(id) {
    const ok = window.confirm('Delete this player?');
    if (!ok) return;
    setPlayersDbDeletingId(id);
    setPlayersDbError('');
    try {
      await deletePlayer(id);
      await refreshPlayersList();
    } catch (e) {
      console.error(e);
      setPlayersDbError(e?.message || 'Unable to delete player.');
    } finally {
      setPlayersDbDeletingId(null);
    }
  }

  async function refreshTournamentsList() {
    setTournamentsLoading(true);
    setTournamentsError('');
    try {
      const rows = await listTournaments();
      setTournamentsList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setTournamentsError(e?.message || 'Unable to load tournaments.');
      setTournamentsList([]);
    } finally {
      setTournamentsLoading(false);
    }
  }

  async function saveCurrentAsTournament() {
    setTournamentsError('');
    try {
      const payload = {
        name: t.tournamentName || `Tournament ${new Date().toLocaleString()}`,
        status: tournamentStatus,
        mode: t.mode,
        eventDate: t.eventDate,
        numPools: t.numPools,
        players: t.players,
        teams: t.teams,
        pools: t.pools,
        groupMatches: t.groupMatches,
        semiMatches: t.semiMatches,
        finalMatch: t.finalMatch,
        created_at: new Date().toISOString(),
      };
      await saveTournament(payload);
      await refreshTournamentsList();
    } catch (e) {
      console.error(e);
      setTournamentsError(e?.message || 'Unable to save tournament.');
    }
  }

  async function handleTournamentDelete(id) {
    if (!window.confirm('Delete this tournament?')) return;
    setTournamentsError('');
    try {
      await deleteTournament(id);
      await refreshTournamentsList();
    } catch (e) {
      console.error(e);
      setTournamentsError(e?.message || 'Unable to delete tournament.');
    }
  }

  async function handleStatusChange(id, status) {
    setTournamentsError('');
    try {
      await updateTournamentStatus(id, status);
      setTournamentsList((prev) =>
        prev.map((row) => (row.id === id ? { ...row, status } : row))
      );
      if (selectedTournament?.id === id) {
        setSelectedTournament((prev) => ({ ...prev, status }));
      }
    } catch (e) {
      console.error(e);
      setTournamentsError(e?.message || 'Unable to update status.');
    }
  }

  async function handleTournamentDateChange(id, eventDate) {
    setTournamentsError('');
    const currentRow = tournamentsList.find((row) => row.id === id);
    setTournamentsList((prev) =>
      prev.map((row) => (row.id === id ? { ...row, eventDate } : row))
    );
    try {
      const data = await loadTournament(id);
      if (!data) throw new Error('Tournament not found.');
      await updateTournament(id, {
        ...data,
        name: data.name || currentRow?.name || `Tournament ${new Date().toLocaleString()}`,
        status: data.status || currentRow?.status || 'Upcoming',
        eventDate,
      });
      if (selectedTournament?.id === id) {
        setSelectedTournament((prev) => ({ ...prev, eventDate }));
      }
    } catch (e) {
      console.error(e);
      setTournamentsError(e?.message || 'Unable to update date.');
      setTournamentsList((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, eventDate: currentRow?.eventDate || '' } : row
        )
      );
    }
  }

  async function openTournamentLiveView(id, view) {
    setTournamentsError('');
    try {
      const data = await loadTournament(id);
      setSelectedTournament(data);
      setSelectedMatchRef(null);
      setTournamentView(view);
    } catch (e) {
      console.error(e);
      setTournamentsError(e?.message || 'Unable to load tournament details.');
    }
  }

  function getTournamentMatches(tournament) {
    const groups = (tournament?.groupMatches || []).map((m) => ({
      ...m,
      stage: 'Group',
    }));
    const semis = (tournament?.semiMatches || []).map((m) => ({
      ...m,
      stage: 'Semifinal',
    }));
    const finals = tournament?.finalMatch
      ? [{ ...tournament.finalMatch, stage: 'Final' }]
      : [];
    return [...groups, ...semis, ...finals];
  }

  function findMatchByRef(tournament, ref) {
    if (!tournament || !ref) return null;
    if (ref.stage === 'Group') {
      return (tournament.groupMatches || []).find((m) => m.id === ref.id) || null;
    }
    if (ref.stage === 'Semifinal') {
      return (tournament.semiMatches || []).find((m) => m.id === ref.id) || null;
    }
    if (ref.stage === 'Final') {
      return tournament.finalMatch?.id === ref.id ? tournament.finalMatch : null;
    }
    return null;
  }

  function openMatchTracking(ref) {
    const match = findMatchByRef(selectedTournament, ref);
    if (!match) return;
    setSelectedMatchRef(ref);
    setMatchScoreA(match.scoreA ?? '');
    setMatchScoreB(match.scoreB ?? '');
    setMatchWinnerId(match.winnerTeamId || '');
    setTournamentView('match');
  }

  async function saveMatchTracking() {
    if (!selectedTournament || !selectedMatchRef) return;
    setSavingMatch(true);
    setTournamentsError('');
    try {
      const scoreA = matchScoreA === '' ? null : Number(matchScoreA);
      const scoreB = matchScoreB === '' ? null : Number(matchScoreB);
      const winnerTeamId = matchWinnerId || null;
      const status = winnerTeamId ? 'Completed' : 'Pending';

      const next = { ...selectedTournament };
      if (selectedMatchRef.stage === 'Group') {
        next.groupMatches = (next.groupMatches || []).map((m) =>
          m.id === selectedMatchRef.id
            ? { ...m, scoreA, scoreB, winnerTeamId, status }
            : m
        );
      } else if (selectedMatchRef.stage === 'Semifinal') {
        next.semiMatches = (next.semiMatches || []).map((m) =>
          m.id === selectedMatchRef.id
            ? { ...m, scoreA, scoreB, winnerTeamId, status }
            : m
        );
      } else if (selectedMatchRef.stage === 'Final' && next.finalMatch?.id === selectedMatchRef.id) {
        next.finalMatch = {
          ...next.finalMatch,
          scoreA,
          scoreB,
          winnerTeamId,
          status,
        };
      }

      await updateTournament(next.id, {
        ...next,
        name: next.name,
        status: next.status || 'Live',
      });

      setSelectedTournament(next);
      setTournamentView('matches');
      await refreshTournamentsList();
    } catch (e) {
      console.error(e);
      setTournamentsError(e?.message || 'Unable to save match tracking.');
    } finally {
      setSavingMatch(false);
    }
  }

  function handleAddTeamFromBuilder() {
    const p1Id = document.getElementById('p1')?.value || '';
    const p2Id = document.getElementById('p2')?.value || '';

    if (!p1Id || !p2Id) {
      t.setError('Please choose both players.');
      return;
    }
    if (p1Id === p2Id) {
      t.setError('Choose two different players.');
      return;
    }

    if (typeof t.addManualTeam === 'function') {
      t.addManualTeam(p1Id, p2Id);
      return;
    }

    const p1 = t.players.find((p) => p.id === p1Id);
    const p2 = t.players.find((p) => p.id === p2Id);
    if (!p1 || !p2) {
      t.setError('Selected players not found.');
      return;
    }

    const alreadyUsed = t.teams.some(
      (team) => team.players.includes(p1Id) || team.players.includes(p2Id)
    );
    if (alreadyUsed) {
      t.setError('One or both players are already part of another team.');
      return;
    }

    const avgSkill = Math.round(((Number(p1.skill) + Number(p2.skill)) / 2) * 10) / 10;
    const newTeam = {
      id: `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${p1.name} & ${p2.name}`,
      players: [p1Id, p2Id],
      avgSkill,
    };

    t.setTeams((prev) => [...prev, newTeam]);
    t.setError('');

    const p1El = document.getElementById('p1');
    const p2El = document.getElementById('p2');
    if (p1El) p1El.value = '';
    if (p2El) p2El.value = '';
  }

  function goToPreviousStep() {
    if (t.mode === 'group' && t.step === 4) {
      t.setStep(2);
      return;
    }
    t.setStep((s) => Math.max(1, s - 1));
  }

  function goToNextStep() {
    if (t.step === 1) {
      t.setStep(2);
      return;
    }
    if (t.step === 2) {
      if (t.mode === 'group' || t.mode === 'singles') {
        if (typeof t.createSinglesTeams === 'function') {
          try {
            t.createSinglesTeams();
          } catch (e) {
            console.error(e);
            t.setError(e?.message || 'Unable to create group teams.');
            t.setStep(4);
          }
          if (t.step === 2) t.setStep(4);
        } else {
          t.setStep(4);
        }
      } else t.setStep(3);
      return;
    }
    if (t.step === 3) {
      t.setStep(4);
      return;
    }
    if (t.step === 4) {
      t.setStep(5);
      return;
    }
    if (t.step === 5) {
      if (t.semiMatches?.length > 0) t.setStep(6);
      else t.generateSemis();
      return;
    }
  }

  const nextLabel =
    t.step === 5
      ? t.semiMatches?.length > 0
        ? 'Next: Knockouts'
        : 'Generate Semifinals'
      : t.step >= 6
        ? 'Done'
        : 'Next';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader
        menuRef={menuRef}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        authBusy={authBusy}
        isLoggedIn={isLoggedIn}
        onHome={() => {
          setMenuOpen(false);
          setActiveMenu('home');
        }}
        onFixture={() => {
          setMenuOpen(false);
          setActiveMenu('fixture');
        }}
        onPlayer={() => {
          setMenuOpen(false);
          setActiveMenu('players');
        }}
        onTournaments={() => {
          setMenuOpen(false);
          setActiveMenu('tournaments');
        }}
        onAuth={handleAuthMenu}
      />

      {/* Main */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {activeMenu === 'home' ? (
          <HomeScreen
            fixtureCount={t.groupMatches.length}
            teamCount={t.teams.length}
            playerCount={playersDbList.length}
            onOpenFixture={() => setActiveMenu('fixture')}
            onManagePlayers={() => setActiveMenu('players')}
            onBrowseTournaments={() => setActiveMenu('tournaments')}
          />
        ) : activeMenu === 'players' ? (
          <PlayersScreen
            players={playersDbList}
            loading={playersDbLoading}
            error={playersDbError}
            onRefresh={refreshPlayersList}
            onAddPlayer={handleAddPlayerToDb}
            onUpdatePlayer={handleUpdatePlayerInDb}
            onDeletePlayer={handleDeletePlayerInDb}
            saving={playersDbSaving}
            updatingId={playersDbUpdatingId}
            deletingId={playersDbDeletingId}
          />
        ) : activeMenu === 'tournaments' ? (
          <TournamentsScreen
            appError={t.error}
            tournamentsError={tournamentsError}
            tournamentView={tournamentView}
            selectedTournament={selectedTournament}
            selectedMatchRef={selectedMatchRef}
            refreshTournamentsList={refreshTournamentsList}
            tournamentsLoading={tournamentsLoading}
            tournamentsList={tournamentsList}
            handleStatusChange={handleStatusChange}
            handleDateChange={handleTournamentDateChange}
            onOpenTournamentFixture={async (id) => {
              await t.loadTournamentById(id);
              setActiveMenu('fixture');
            }}
            handleTournamentDelete={handleTournamentDelete}
            openTournamentLiveView={openTournamentLiveView}
            setTournamentView={setTournamentView}
            getTournamentMatches={getTournamentMatches}
            openMatchTracking={openMatchTracking}
            findMatchByRef={findMatchByRef}
            matchScoreA={matchScoreA}
            setMatchScoreA={setMatchScoreA}
            matchScoreB={matchScoreB}
            setMatchScoreB={setMatchScoreB}
            matchWinnerId={matchWinnerId}
            setMatchWinnerId={setMatchWinnerId}
            saveMatchTracking={saveMatchTracking}
            savingMatch={savingMatch}
          />
        ) : (
          <>
            {t.error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
                {t.error}
              </div>
            )}

            {/* Step header/stepper intentionally hidden temporarily */}

            {/* Step 1: Setup */}
            {t.step === 1 && (
          <section className="mt-6 grid gap-6 sm:grid-cols-3">
            <Card title="Tournament Name">
              <input
                type="text"
                value={t.tournamentName}
                onChange={(e) => t.setTournamentName(e.target.value)}
                placeholder="Enter tournament name"
                className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
              />
              <p className="text-xs text-slate-500 mt-2">
                This name is used when you save the fixture as a tournament.
              </p>
            </Card>

            <Card title="Match Format">
              <div className="flex flex-col sm:flex-row gap-3">
                <label
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${
                    t.mode === 'group'
                      ? 'bg-slate-100 border-slate-400'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={t.mode === 'group'}
                    onChange={() => t.setMode('group')}
                  />
                  <span>Group</span>
                </label>
                <label
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${
                    t.mode === 'doubles'
                      ? 'bg-slate-100 border-slate-400'
                      : 'border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    checked={t.mode === 'doubles'}
                    onChange={() => t.setMode('doubles')}
                  />
                  <span>Doubles</span>
                </label>
              </div>
            </Card>

            <Card title="Event Date">
              <input
                type="date"
                value={t.eventDate}
                onChange={(e) => t.setEventDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900 placeholder-slate-500"
              />
              <p className="text-xs text-slate-500 mt-2">
                Used as default for match times.
              </p>
            </Card>

            {t.mode === 'group' ? (
              <>
                <Card title="Number of Groups">
                  <input
                    type="number"
                    min={1}
                    value={t.numPools}
                    onChange={(e) => t.setNumPools(parseInt(e.target.value || '1'))}
                    className="w-32 px-3 py-2 border rounded-lg bg-white text-slate-900"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Semifinals: 2 groups → top 2 each. 1 group → top 4 overall.
                  </p>
                </Card>

                <Card title="Members in Each Group">
                  <input
                    type="number"
                    min={2}
                    value={membersPerGroup}
                    onChange={(e) =>
                      setMembersPerGroup(Math.max(2, parseInt(e.target.value || '2')))
                    }
                    className="w-32 px-3 py-2 border rounded-lg bg-white text-slate-900"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Target: {membersPerGroup * (Number(t.numPools) || 1)} players for balanced groups.
                  </p>
                </Card>

                <Card title="Group Names">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Array.from({ length: Math.max(1, Number(t.numPools) || 1) }).map(
                      (_, idx) => (
                        <input
                          key={idx}
                          className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                          placeholder={`Group ${idx + 1} name`}
                          value={groupNames[idx] || ''}
                          onChange={(e) =>
                            setGroupNames((prev) => {
                              const next = [...prev];
                              next[idx] = e.target.value;
                              return next;
                            })
                          }
                        />
                      )
                    )}
                  </div>
                </Card>
              </>
            ) : (
              <Card title="Pool Settings (Doubles)">
                <input
                  type="number"
                  min={1}
                  value={t.numPools}
                  onChange={(e) => t.setNumPools(parseInt(e.target.value || '1'))}
                  className="w-32 px-3 py-2 border rounded-lg bg-white text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Configure how many pools you want before fixtures are generated.
                </p>
              </Card>
            )}

            <div className="sm:col-span-3 flex justify-end">
              <button className="btn-primary w-full sm:w-auto" onClick={() => t.setStep(2)}>
                Next: Players
              </button>
            </div>
          </section>
            )}

            {/* Step 2: Players */}
            {t.step === 2 && (
          <section className="mt-6 grid gap-6">
            <Card title="Choose Players">
              <div className="flex flex-wrap items-end gap-3">
                <p className="text-sm text-slate-600">
                  Select players from your existing player database.
                </p>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={t.openSavedPlayersPicker}
                >
                  Choose Players
                </button>
              </div>

              {t.players.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2">#</th>
                        <th>Name</th>
                        <th>Skill</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.players.map((p, i) => (
                        <tr key={p.id} className="border-t">
                          <td className="py-2 pr-2">{i + 1}</td>
                          <td>{p.name}</td>
                          <td>{p.skill}</td>
                          <td className="text-right">
                            <button
                              className="px-2 py-1 text-red-600 hover:underline"
                              onClick={() => t.removePlayer(p.id)}
                            >
                              remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mt-4">
                <div className="text-xs text-slate-500">
                  Players: {t.players.length}
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary w-full sm:w-auto"
                    onClick={goToNextStep}
                  >
                    {t.mode === 'doubles' ? 'Next: Build Teams' : 'Next: Groups'}
                  </button>
                </div>
              </div>
            </Card>
          </section>
            )}

        {/* Step 3: Team Builder (doubles manual pairing) */}
            {t.step === 3 && t.mode === 'doubles' && (
          <section className="mt-6 grid gap-6">
            <Card title="Team Builder (Doubles)">
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-full sm:w-auto">
                  <label className="block text-sm mb-1">Player 1</label>
                  <SelectPlayer players={t.unpairedPlayers} id="p1" />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-sm mb-1">Player 2</label>
                  <SelectPlayer players={t.unpairedPlayers} id="p2" />
                </div>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={handleAddTeamFromBuilder}
                >
                  Add Team
                </button>
                <div className="grow" />
                <button
                  className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                  onClick={t.autoPairDoubles}
                >
                  Auto-pair (balanced)
                </button>
              </div>

              {t.teams.length > 0 && (
                <div className="mt-4">
                  <div className="sm:hidden space-y-2">
                    {t.teams.map((tm, i) => (
                      <div key={tm.id} className="rounded-lg border p-3 bg-white">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs text-slate-500">#{i + 1}</div>
                            <div className="font-semibold">{tm.name}</div>
                            <div className="text-sm text-slate-500">Avg Skill: {tm.avgSkill}</div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <button
                              className="px-2 py-1 text-blue-600 hover:underline"
                              onClick={() => t.startEditTeam(tm.id)}
                            >
                              edit
                            </button>
                            <button
                              className="px-2 py-1 text-red-600 hover:underline"
                              onClick={() => t.removeTeam(tm.id)}
                            >
                              remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full min-w-[520px] text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2">#</th>
                          <th>Team</th>
                          <th>Avg Skill</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {t.teams.map((tm, i) => (
                          <tr key={tm.id} className="border-t">
                            <td className="py-2 pr-2">{i + 1}</td>
                            <td>{tm.name}</td>
                            <td>{tm.avgSkill}</td>
                            <td className="text-right">
                              <button
                                className="px-2 py-1 text-blue-600 hover:underline"
                                onClick={() => t.startEditTeam(tm.id)}
                              >
                                edit
                              </button>
                              <button
                                className="px-2 py-1 text-red-600 hover:underline"
                                onClick={() => t.removeTeam(tm.id)}
                              >
                                remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <button className="btn-primary w-full sm:w-auto" onClick={() => t.setStep(4)}>
                  Next: Pools & Fixtures
                </button>
              </div>
            </Card>
          </section>
            )}

        {/* Step 4: Edit Teams + Pools */}
            {t.step === 4 && (
          <section className="mt-6 grid gap-6">
            <Card title="Teams — Edit">
              {t.teams.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No teams yet. Create teams first.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <div className="text-sm text-slate-600">
                      Edit teams before generating groups/fixtures.
                    </div>
                    {!t.bulkEditing ? (
                      <button
                        className="px-3 py-2 rounded-lg border hover:bg-slate-100"
                        onClick={t.startBulkEdit}
                      >
                        Bulk Edit
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="btn-primary w-full sm:w-auto"
                          onClick={t.validateAndSaveBulk}
                        >
                          Save All
                        </button>
                        <button
                          className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                          onClick={t.cancelBulkEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {t.bulkEditing ? (
                    <>
                      {t.bulkErr && (
                        <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
                          {t.bulkErr}
                        </div>
                      )}
                      <BulkTeamEditor
                        teams={t.teams}
                        players={t.players}
                        mode={t.mode}
                        rows={t.bulkRows}
                        onChange={t.updateBulkRow}
                      />
                    </>
                  ) : (
                    <div className="space-y-2">
                      {t.teams.map((tm) => (
                        <div
                          key={tm.id}
                          className="rounded-xl border p-3 bg-white"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="font-semibold">
                              {tm.name}{' '}
                              <span className="text-xs text-slate-500">
                                (S{tm.avgSkill})
                              </span>
                            </div>
                            {t.editingTeamId === tm.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {t.mode !== 'doubles' ? (
                                  <PlayerSelectInline
                                    players={t.players}
                                    value={t.editP1 || ''}
                                    onChange={t.setEditP1}
                                  />
                                ) : (
                                  <>
                                    <PlayerSelectInline
                                      players={t.players}
                                      value={t.editP1 || ''}
                                      onChange={t.setEditP1}
                                    />
                                    <span className="text-slate-400">&</span>
                                    <PlayerSelectInline
                                      players={t.players}
                                      value={t.editP2 || ''}
                                      onChange={t.setEditP2}
                                    />
                                  </>
                                )}
                                <button
                                  className="btn-primary w-full sm:w-auto"
                                  onClick={t.saveEditTeam}
                                >
                                  Save
                                </button>
                                <button
                                  className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                                  onClick={t.cancelEditTeam}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                                  onClick={() => t.startEditTeam(tm.id)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="w-full sm:w-auto px-3 py-2 text-red-600 hover:underline"
                                  onClick={() => t.removeTeam(tm.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                          {t.editingTeamId === tm.id && t.editErr && (
                            <div className="mt-2 text-sm text-red-700">
                              {t.editErr}
                            </div>
                          )}
                          <div className="mt-1 text-sm text-slate-500">
                            Members:{' '}
                            {tm.players
                              .map(
                                (pid) =>
                                  t.players.find((p) => p.id === pid)?.name
                              )
                              .join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>

            <Card title="Groups">
              <div className="flex flex-wrap items-end gap-4">
                <div className="w-full sm:w-auto">
                  <label className="block text-sm mb-1">Number of Groups</label>
                  <input
                    type="number"
                    min={1}
                    value={t.numPools}
                    onChange={(e) =>
                      t.setNumPools(parseInt(e.target.value || '1'))
                    }
                    className="w-full sm:w-28 px-3 py-2 border rounded-lg bg-white text-slate-900"
                  />
                </div>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={t.autoAssignPoolsAndFixtures}
                >
                  Auto-assign Groups & Create Fixtures
                </button>
              </div>

              {t.pools.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {t.pools.map((p, idx) => (
                    <div key={p.id} className="rounded-xl border p-4 bg-white">
                      <div className="font-semibold mb-2">
                        {groupNames[idx] || `Group ${p.name}`}
                      </div>
                      <ul className="text-sm list-disc ml-5">
                        {p.teamIds.map((tid) => (
                          <li key={tid}>{t.teamsById[tid]?.name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {t.groupMatches.length > 0 && (
              <Card title="Group Fixtures & Results">
                <MatchesTable
                  matches={t.groupMatches}
                  teamsById={t.teamsById}
                  poolsById={t.poolsById}
                  onScoreChange={t.updateMatchScore}
                  onFinalize={t.finalizeMatch}
                  onReset={t.resetMatch}
                />

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {t.pools.map((p, idx) => (
                    <div key={p.id} className="rounded-xl border p-4 bg-white">
                      <div className="font-semibold mb-2">
                        Standings — {groupNames[idx] || `Group ${p.name}`}
                      </div>
                      <StandingsTable
                        rows={t.poolStandings[p.id] || []}
                        teamsById={t.teamsById}
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
                  <div className="text-sm text-slate-500">
                    Qualifiers:{' '}
                    {t.pools.length === 1 ? 'top 4 overall' : 'top 2 each group'}{' '}
                    → {t.qualifiers.length}
                  </div>
                  <button className="btn-primary w-full sm:w-auto" onClick={t.generateSemis}>
                    Generate Semifinals
                  </button>
                </div>
              </Card>
            )}
          </section>
            )}

        {/* Step 5: Groups */}
            {t.step === 5 && (
          <section className="mt-6 grid gap-6">
            <Card title="Group Fixtures & Results">
              <MatchesTable
                matches={t.groupMatches}
                teamsById={t.teamsById}
                poolsById={t.poolsById}
                onScoreChange={t.updateMatchScore}
                onFinalize={t.finalizeMatch}
                onReset={t.resetMatch}
              />

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                {t.pools.map((p, idx) => (
                  <div key={p.id} className="rounded-xl border p-4 bg-white">
                    <div className="font-semibold mb-2">
                      Standings — {groupNames[idx] || `Group ${p.name}`}
                    </div>
                    <StandingsTable
                      rows={t.poolStandings[p.id] || []}
                      teamsById={t.teamsById}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
                <div className="text-sm text-slate-500">
                  Qualifiers:{' '}
                  {t.pools.length === 1 ? 'top 4 overall' : 'top 2 each group'} →{' '}
                  {t.qualifiers.length}
                </div>
                <button className="btn-primary w-full sm:w-auto" onClick={t.generateSemis}>
                  Generate Semifinals
                </button>
              </div>
            </Card>
          </section>
            )}

            {/* Step 6: Knockouts */}
            {t.step === 6 && (
          <section className="mt-6 grid gap-6">
            <Card title="Semifinals">
              {t.semiMatches.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No semifinals generated yet.
                </p>
              ) : (
                <MatchesTable
                  matches={t.semiMatches}
                  teamsById={t.teamsById}
                  poolsById={{}}
                  onScoreChange={(mid, a, b) =>
                    t.updateKoScore(mid, a, b, 'semi')
                  }
                  onFinalize={(mid) => t.finalizeKo(mid, 'semi')}
                  onReset={(mid) =>
                    t.setSemiMatches((ms) =>
                      ms.map((m) =>
                        m.id === mid
                          ? {
                              ...m,
                              scoreA: null,
                              scoreB: null,
                              status: 'Pending',
                            }
                          : m
                      )
                    )
                  }
                />
              )}
            </Card>

            <Card title="Final">
              {!t.finalMatch ? (
                <p className="text-sm text-slate-500">
                  Final will appear after semifinals are completed.
                </p>
              ) : (
                <div className="rounded-xl border bg-white p-4">
                  <div className="font-semibold mb-2">{t.finalMatch.label}</div>
                  <div className="grid sm:grid-cols-5 gap-2 items-center">
                    <div className="sm:col-span-2">
                      <TeamBadge
                        team={t.teamsById[t.finalMatch.teamAId || '']}
                      />
                    </div>
                    <div className="text-center">vs</div>
                    <div className="sm:col-span-2">
                      <TeamBadge
                        team={t.teamsById[t.finalMatch.teamBId || '']}
                        right
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-end gap-3 mt-3">
                    <ScoreInput
                      value={t.finalMatch.scoreA}
                      onChange={(v) =>
                        t.updateKoScore(
                          t.finalMatch.id,
                          v,
                          t.finalMatch.scoreB,
                          'final'
                        )
                      }
                    />
                    <span className="text-slate-500">-</span>
                    <ScoreInput
                      value={t.finalMatch.scoreB}
                      onChange={(v) =>
                        t.updateKoScore(
                          t.finalMatch.id,
                          t.finalMatch.scoreA,
                          v,
                          'final'
                        )
                      }
                    />
                    <div className="hidden sm:block grow" />
                    <button
                      className="btn-primary w-full sm:w-auto"
                      onClick={() => t.finalizeKo(t.finalMatch.id, 'final')}
                    >
                      Finalize
                    </button>
                    <button
                      className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                      onClick={() =>
                        t.setFinalMatch({
                          ...t.finalMatch,
                          scoreA: null,
                          scoreB: null,
                          status: 'Pending',
                        })
                      }
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}
            </Card>

            {t.champion && (
              <div className="rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-900 p-4">
                🏆 Champion: <span className="font-semibold">{t.champion}</span>
              </div>
            )}
          </section>
            )}

            <div className="mt-6 sticky bottom-3 z-10">
              <div className="ml-auto w-full sm:w-auto rounded-xl border bg-white/95 backdrop-blur px-3 py-3 shadow-lg flex justify-end gap-2">
                <button
                  className="min-w-28 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium hover:bg-slate-100"
                  onClick={saveCurrentAsTournament}
                >
                  Save Tournament
                </button>
                <button
                className="min-w-28 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium hover:bg-slate-100 disabled:opacity-50"
                onClick={goToPreviousStep}
                disabled={t.step <= 1}
              >
                Previous
              </button>
              <button
                className="btn-primary min-w-28 w-full sm:w-auto ml-1"
                onClick={goToNextStep}
                disabled={t.step >= 6}
              >
                {nextLabel}
              </button>
              </div>
            </div>
          </>
        )}

        {/* Saved Players Picker (modal) */}
        <PlayerPickerModal
          open={t.playerPickerOpen}
          onClose={() => t.setPlayerPickerOpen(false)}
          players={t.savedPlayers}
          loading={t.loadingSavedPlayers}
          search={t.savedSearch}
          setSearch={t.setSavedSearch}
          selectedIds={t.selectedSavedIds}
          toggleSelect={t.toggleSelectSaved}
          selectAllFiltered={t.selectAllFiltered}
          clearSelection={t.clearSavedSelection}
          onConfirm={t.addSelectedSavedPlayers}
        />
      </main>

      <footer className="max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-10 text-xs text-slate-500">
        {activeMenu === 'home'
          ? 'Use the Fixture menu to create matches, or open Players to manage your player database.'
          : activeMenu === 'players'
            ? 'Manage player records here. Changes are saved directly to your Supabase players table.'
          : activeMenu === 'tournaments'
            ? 'Use this screen to save tournaments, set status, track live matches, and view point tables.'
            : 'Tip: Edit teams in Step 4 → Teams — Edit before generating fixtures. For 1 group, semifinals use top 4 overall (1 vs 4, 2 vs 3).'}
      </footer>

      <style>{`
        .btn-primary { @apply px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800; }
      `}</style>
    </div>
  );
}
