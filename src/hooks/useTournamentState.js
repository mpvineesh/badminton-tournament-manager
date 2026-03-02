import { useMemo, useState, useEffect } from 'react';
import {
  isoDateToday,
  toIsoLocal,
  nid,
  clamp,
  roundRobin,
  computeStandings,
  winnerOf,
} from '../utils/tournament.js';

// NEW: adapter calls (you implement these in supabaseAdapter.js)
import {
  listPlayers,
  upsertPlayers, // players master
  saveTournament,
  listTournaments,
  loadTournament,
  deleteTournament,
  saveTournamentSnapshot,
} from '../supabaseAdapter';

// … your existing typedef JSDoc stays the same …

export default function useTournamentState() {
  // ===== Core tournament state (unchanged) =====
  const [mode, setMode] = useState('singles');
  const [eventDate, setEventDate] = useState(isoDateToday());
  const [numPools, setNumPools] = useState(2);

  const [players, setPlayers] = useState([]); // [{id, name, skill}]
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerSkill, setNewPlayerSkill] = useState(5);

  const [teams, setTeams] = useState([]);
  const [pools, setPools] = useState([]);
  const [groupMatches, setGroupMatches] = useState([]);
  const [semiMatches, setSemiMatches] = useState([]);
  const [finalMatch, setFinalMatch] = useState(null);

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');

  // ===== Browser for tournaments (unchanged interface) =====
  const [tournamentName, setTournamentName] = useState('');
  const [browserOpen, setBrowserOpen] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);

  // ===== Team edit state (unchanged) =====
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editP1, setEditP1] = useState(null);
  const [editP2, setEditP2] = useState(null);
  const [editErr, setEditErr] = useState('');

  // ===== Bulk edit state (unchanged) =====
  const [bulkEditing, setBulkEditing] = useState(false);
  const [bulkRows, setBulkRows] = useState({});
  const [bulkErr, setBulkErr] = useState('');

  // ===== NEW: Saved Players Picker state =====
  const [playerPickerOpen, setPlayerPickerOpen] = useState(false);
  const [savedPlayers, setSavedPlayers] = useState([]); // from DB
  const [loadingSavedPlayers, setLoadingSavedPlayers] = useState(false);
  const [savedSearch, setSavedSearch] = useState('');
  const [selectedSavedIds, setSelectedSavedIds] = useState(() => new Set());

  const filteredSavedPlayers = useMemo(() => {
    const q = savedSearch.trim().toLowerCase();
    if (!q) return savedPlayers;
    return savedPlayers.filter((p) => p.name.toLowerCase().includes(q));
  }, [savedPlayers, savedSearch]);

  function toggleSelectSaved(id) {
    setSelectedSavedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function selectAllFiltered() {
    setSelectedSavedIds(new Set(filteredSavedPlayers.map((p) => p.id)));
  }
  function clearSavedSelection() {
    setSelectedSavedIds(new Set());
  }

  async function openSavedPlayersPicker() {
    setPlayerPickerOpen(true);
    setLoadingSavedPlayers(true);
    try {
      const rows = await listPlayers(); // you implement
      // Expect rows like: [{id: 'uuid', name: 'Saina', skill: 8}, ...]
      setSavedPlayers(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setSavedPlayers([]);
    } finally {
      setLoadingSavedPlayers(false);
    }
  }

  function addSelectedSavedPlayers() {
    if (selectedSavedIds.size === 0) {
      setPlayerPickerOpen(false);
      return;
    }

    // De-dup by name (case-insensitive). If you prefer, persist a supabaseId on the local player.
    const existingNames = new Set(
      players.map((p) => p.name.trim().toLowerCase())
    );
    const picked = savedPlayers.filter((p) => selectedSavedIds.has(p.id));
    const toAdd = picked
      .filter((p) => !existingNames.has(p.name.trim().toLowerCase()))
      .map((p) => ({
        id: nid('P'),
        name: p.name,
        skill: clamp(Math.round(Number(p.skill) || 5), 1, 10),
      }));

    setPlayers((prev) => [...prev, ...toAdd]);

    // close modal & reset selection
    setPlayerPickerOpen(false);
    setSelectedSavedIds(new Set());
  }

  // ===== Derived (unchanged) =====
  const usedPlayerIds = useMemo(
    () => new Set(teams.flatMap((t) => t.players)),
    [teams]
  );

  const unpairedPlayers = useMemo(() => {
    const paired = usedPlayerIds;
    return players.filter((p) => !paired.has(p.id));
  }, [players, usedPlayerIds]);

  const poolsById = useMemo(
    () => Object.fromEntries(pools.map((p) => [p.id, p])),
    [pools]
  );
  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((t) => [t.id, t])),
    [teams]
  );

  const poolStandings = useMemo(
    () => computeStandings(pools, teams, groupMatches),
    [pools, teams, groupMatches]
  );

  // Qualifiers: if 1 pool → top 4 overall; if 2 pools → top 2 each; else still top 2 per pool by default
  const qualifiers = useMemo(() => {
    if (pools.length === 1) {
      const only = pools[0];
      const table = poolStandings[only.id] || [];
      return table
        .slice(0, 4)
        .map((r, i) => ({ poolId: only.id, teamId: r.teamId, rank: i + 1 }));
    }
    const out = [];
    for (const p of pools) {
      const table = poolStandings[p.id] || [];
      for (let i = 0; i < Math.min(2, table.length); i++) {
        out.push({ poolId: p.id, teamId: table[i].teamId, rank: i + 1 });
      }
    }
    return out;
  }, [pools, poolStandings]);

  // ===== Actions (unchanged logic; omitted here for brevity) =====
  // keep your existing resetAll, addPlayer, removePlayer, createSinglesTeams, autoPairDoubles, addManualTeam,
  // removeTeam, autoAssignPoolsAndFixtures, updateMatchScore, finalizeMatch, resetMatch,
  // generateSemis (now supports 1-pool top 4 in your existing code), updateKoScore, finalizeKo,
  // team edit, bulk edit, regenerateAfterTeamChange, etc.

  // ===== Tournaments browser methods (unchanged interface) =====
  async function refreshTournamentList() {
    setLoadingTournaments(true);
    try {
      const rows = await listTournaments();
      setTournaments(Array.isArray(rows) ? rows : []);
    } finally {
      setLoadingTournaments(false);
    }
  }

  async function saveCurrentTournament() {
    const payload = {
      name: tournamentName || `Tournament ${new Date().toLocaleString()}`,
      mode,
      eventDate,
      numPools,
      players,
      teams,
      pools,
      groupMatches,
      semiMatches,
      finalMatch,
      created_at: new Date().toISOString(),
    };
    const id = await saveTournament(payload);
    await saveTournamentSnapshot(id, payload); // optional history
    await refreshTournamentList();
    return id;
  }

  async function loadTournamentById(id) {
    const t = await loadTournament(id);
    if (!t) return;
    setMode(t.mode || 'singles');
    setEventDate(t.eventDate || isoDateToday());
    setNumPools(t.numPools || 1);
    setPlayers(t.players || []);
    setTeams(t.teams || []);
    setPools(t.pools || []);
    setGroupMatches(t.groupMatches || []);
    setSemiMatches(t.semiMatches || []);
    setFinalMatch(t.finalMatch || null);
    setTournamentName(t.name || '');
    setStep((t.groupMatches?.length || 0) > 0 ? 5 : 1);
  }

  async function deleteTournamentById(id) {
    await deleteTournament(id);
    await refreshTournamentList();
  }

  // ===== EXPOSE EVERYTHING USED BY App.jsx =====
  return {
    // tournament meta
    tournamentName,
    setTournamentName,
    browserOpen,
    setBrowserOpen,
    tournaments,
    loadingTournaments,
    refreshTournamentList,
    saveCurrentTournament,
    loadTournamentById,
    deleteTournamentById,

    // core
    mode,
    setMode,
    eventDate,
    setEventDate,
    numPools,
    setNumPools,
    players,
    setPlayers,
    newPlayerName,
    setNewPlayerName,
    newPlayerSkill,
    setNewPlayerSkill,
    teams,
    setTeams,
    pools,
    setPools,
    groupMatches,
    setGroupMatches,
    semiMatches,
    setSemiMatches,
    finalMatch,
    setFinalMatch,

    // ui
    step,
    setStep,
    error,
    setError,

    // derived
    poolsById,
    teamsById,
    unpairedPlayers,
    poolStandings,
    qualifiers,

    // actions (make sure your previous implementations are returned here)
    resetAll: /* your existing fn */ undefined,
    addPlayer: /* your existing fn */ undefined,
    removePlayer: /* your existing fn */ undefined,
    createSinglesTeams: /* your existing fn */ undefined,
    autoPairDoubles: /* your existing fn */ undefined,
    addManualTeam: /* your existing fn */ undefined,
    removeTeam: /* your existing fn */ undefined,
    autoAssignPoolsAndFixtures: /* your existing fn */ undefined,
    updateMatchScore: /* your existing fn */ undefined,
    finalizeMatch: /* your existing fn */ undefined,
    resetMatch: /* your existing fn */ undefined,
    generateSemis: /* your existing fn */ undefined,
    updateKoScore: /* your existing fn */ undefined,
    finalizeKo: /* your existing fn */ undefined,

    // team edit
    editingTeamId,
    setEditingTeamId,
    editP1,
    setEditP1,
    editP2,
    setEditP2,
    editErr,
    setEditErr,
    startEditTeam: /* your existing fn */ undefined,
    cancelEditTeam: /* your existing fn */ undefined,
    saveEditTeam: /* your existing fn */ undefined,

    // bulk edit
    bulkEditing,
    startBulkEdit: /* your existing fn */ undefined,
    cancelBulkEdit: /* your existing fn */ undefined,
    bulkRows,
    bulkErr,
    updateBulkRow: /* your existing fn */ undefined,
    validateAndSaveBulk: /* your existing fn */ undefined,

    // final/champion (derived in your App)
    champion: useMemo(() => {
      if (!finalMatch || finalMatch.status !== 'Completed') return null;
      const w = winnerOf(finalMatch);
      return w ? teamsById[w]?.name || null : null;
    }, [finalMatch, teamsById]),

    // ===== NEW: Saved players picker exports =====
    playerPickerOpen,
    setPlayerPickerOpen,
    savedPlayers: filteredSavedPlayers,
    loadingSavedPlayers,
    savedSearch,
    setSavedSearch,
    selectedSavedIds,
    toggleSelectSaved,
    selectAllFiltered,
    clearSavedSelection,
    openSavedPlayersPicker,
    addSelectedSavedPlayers,
  };
}
