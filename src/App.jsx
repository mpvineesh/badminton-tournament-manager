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
import BulkTeamEditor from './components/BulkTeamEditor.jsx';
import PlayerPickerModal from './components/PlayerPickerModal.jsx';
import AppHeader from './components/AppHeader.jsx';
import HomeScreen from './components/HomeScreen.jsx';
import PlayersScreen from './components/PlayersScreen.jsx';
import TournamentsScreen from './components/TournamentsScreen.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import TournamentDetailsScreen from './components/TournamentDetailsScreen.jsx';
import ProfileScreen from './components/ProfileScreen.jsx';
import SkillLevelScreen from './components/SkillLevelScreen.jsx';
import PredictionsScreen from './components/PredictionsScreen.jsx';
import { roundRobin, toIsoLocal, computeStandings } from './utils/tournament.js';
import {
  initAnalytics,
  setAnalyticsUser,
  clearAnalyticsUser,
  trackScreenView,
  trackAnalyticsEvent,
} from './utils/analytics.js';

import useTournamentState from './hooks/useTournamentState.js';
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  seedDummyPlayersOnce,
  listTournaments,
  loadTournament,
  saveTournament,
  updateTournament,
  updatePlayer,
  deleteTournament,
  listSkillSuggestionsBySuggester,
  saveSkillSuggestionsBySuggester,
  listSkillSuggestionAverages,
  getPredictionByTournamentAndUser,
  savePrediction,
  uploadPlayerProfilePhoto,
} from './supabaseAdapter.js';

function EditIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M15.707 2.293a1 1 0 0 0-1.414 0l-8.5 8.5a1 1 0 0 0-.263.465l-1 4a1 1 0 0 0 1.213 1.213l4-1a1 1 0 0 0 .465-.263l8.5-8.5a1 1 0 0 0 0-1.414l-2-2ZM7.29 12.71l7.71-7.71 1 1-7.71 7.71-1.6.4.4-1.6Z" />
    </svg>
  );
}

function DeleteIcon({ className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M8.5 2.5A1.5 1.5 0 0 0 7 4v.5H4.5a1 1 0 1 0 0 2h.538l.79 9.085A2 2 0 0 0 7.82 17.5h4.36a2 2 0 0 0 1.992-1.915L14.962 6.5H15.5a1 1 0 1 0 0-2H13V4a1.5 1.5 0 0 0-1.5-1.5h-3Zm3 2V4h-3v.5h3Zm-3.676 2h1.5v8h-1.5v-8Zm2.852 0h1.5v8h-1.5v-8Z" />
    </svg>
  );
}

export default function App() {
  const AUTH_MOBILE_KEY = 'tm_logged_mobile';
  const ACTIVE_MENU_KEY = 'tm_active_menu';
  const RESTORABLE_MENUS = new Set([
    'home',
    'fixture',
    'players',
    'profile',
    'skill-level',
    'predictions',
    'tournaments',
  ]);
  const t = useTournamentState();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const [playersDbList, setPlayersDbList] = useState([]);
  const [playersDbLoading, setPlayersDbLoading] = useState(false);
  const [playersDbSaving, setPlayersDbSaving] = useState(false);
  const [playersDbUpdatingId, setPlayersDbUpdatingId] = useState(null);
  const [playersDbDeletingId, setPlayersDbDeletingId] = useState(null);
  const [playersDbError, setPlayersDbError] = useState('');
  const [activeMenu, setActiveMenu] = useState('login');
  const [membersPerGroup, setMembersPerGroup] = useState(4);
  const [groupNames, setGroupNames] = useState(['Group A', 'Group B']);
  const [groupGamesBetweenGroups, setGroupGamesBetweenGroups] = useState(2);
  const [groupLevelPairings, setGroupLevelPairings] = useState([
    { levelA1: 1, levelA2: 2, levelB1: 1, levelB2: 2 },
    { levelA1: 3, levelA2: 4, levelB1: 3, levelB2: 4 },
  ]);
  const [winnerTeamPoint, setWinnerTeamPoint] = useState(2);
  const [winnerBonusOppScoreLessThan, setWinnerBonusOppScoreLessThan] = useState(0);
  const [winnerBonusPoint, setWinnerBonusPoint] = useState(0);
  const [loserBonusScoreGreaterThan, setLoserBonusScoreGreaterThan] = useState(0);
  const [loserBonusPoint, setLoserBonusPoint] = useState(0);
  const [tournamentStatus, setTournamentStatus] = useState('Upcoming');
  const [groupAddSelections, setGroupAddSelections] = useState({});
  const [tournamentsList, setTournamentsList] = useState([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(false);
  const [tournamentsError, setTournamentsError] = useState('');
  const [tournamentView, setTournamentView] = useState('list');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedMatchRef, setSelectedMatchRef] = useState(null);
  const [matchScoreA, setMatchScoreA] = useState('');
  const [matchScoreB, setMatchScoreB] = useState('');
  const [matchWinnerId, setMatchWinnerId] = useState('');
  const [matchStatus, setMatchStatus] = useState('Pending');
  const [savingMatch, setSavingMatch] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [fixtureTournamentId, setFixtureTournamentId] = useState(null);
  const [profilePlayer, setProfilePlayer] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [skillSaving, setSkillSaving] = useState(false);
  const [skillApplying, setSkillApplying] = useState(false);
  const [skillError, setSkillError] = useState('');
  const [skillAverages, setSkillAverages] = useState([]);
  const [skillAveragesLoading, setSkillAveragesLoading] = useState(false);
  const [predictionSaving, setPredictionSaving] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [isAdminUser, setIsAdminUser] = useState(false);
  const autoSemisInProgressRef = useRef(false);
  const menuRef = useRef(null);
  const messageTopRef = useRef(null);

  useEffect(() => {
    initAnalytics();
    const storedMobile = window.localStorage.getItem(AUTH_MOBILE_KEY);
    if (storedMobile) {
      const savedMenu = String(window.localStorage.getItem(ACTIVE_MENU_KEY) || '').trim();
      const restoredMenu = savedMenu === 'tournament'
        ? 'tournaments'
        : (RESTORABLE_MENUS.has(savedMenu) ? savedMenu : 'home');
      setIsLoggedIn(true);
      setActiveMenu(restoredMenu);
    } else {
      setIsLoggedIn(false);
      window.localStorage.removeItem(ACTIVE_MENU_KEY);
      setActiveMenu('login');
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeMenu === 'login') return;
    if (!RESTORABLE_MENUS.has(activeMenu)) return;
    window.localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
  }, [isLoggedIn, activeMenu]);

  useEffect(() => {
    refreshPlayersList();
  }, []);

  useEffect(() => {
    if (
      activeMenu === 'tournaments' ||
      activeMenu === 'home' ||
      activeMenu === 'tournament' ||
      activeMenu === 'predictions'
    ) {
      refreshTournamentsList();
    }
  }, [activeMenu]);

  useEffect(() => {
    if (!isLoggedIn || activeMenu !== 'profile') return;
    void loadProfileForLoggedInUser();
  }, [isLoggedIn, activeMenu]);

  useEffect(() => {
    if (!isLoggedIn || activeMenu !== 'skill-level') return;
    void refreshSkillLevelData();
  }, [isLoggedIn, activeMenu, playersDbList, isAdminUser]);

  useEffect(() => {
    if (!isLoggedIn) return;
    trackScreenView(activeMenu);
  }, [isLoggedIn, activeMenu]);

  useEffect(() => {
    // Clear stale banners when user navigates to another screen.
    t.setError('');
    setTournamentsError('');
    setPlayersDbError('');
    setAuthError('');
    setProfileError('');
    setSkillError('');
    setPredictionError('');
    setSaveNotice('');
  }, [activeMenu]);

  useEffect(() => {
    if (activeMenu !== 'tournaments') return;
    if (tournamentView === 'list') return;
    if (!selectedTournament) {
      setTournamentView('list');
      return;
    }
    if (tournamentView === 'match' && !selectedMatchRef) {
      setTournamentView('list');
    }
  }, [activeMenu, tournamentView, selectedTournament, selectedMatchRef]);

  useEffect(() => {
    if (t.mode === 'singles') t.setMode('doubles');
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
    const levelMax = Math.max(2, Number(membersPerGroup) || 2);
    const desired = Math.max(
      1,
      Math.min(Number(groupGamesBetweenGroups) || 1, levelMax * levelMax)
    );
    if (groupGamesBetweenGroups !== '' && Number(groupGamesBetweenGroups) !== desired) {
      setGroupGamesBetweenGroups(desired);
    }
    setGroupLevelPairings((prev) => {
      const next = Array.from({ length: desired }, (_, idx) => {
        const existing = prev[idx];
        if (existing) {
          return {
            levelA1: Math.min(levelMax, Math.max(1, Number(existing.levelA1) || 1)),
            levelA2: Math.min(levelMax, Math.max(1, Number(existing.levelA2) || Math.min(2, levelMax))),
            levelB1: Math.min(levelMax, Math.max(1, Number(existing.levelB1) || 1)),
            levelB2: Math.min(levelMax, Math.max(1, Number(existing.levelB2) || Math.min(2, levelMax))),
          };
        }
        const lv1 = (idx % levelMax) + 1;
        const lv2 = ((idx + 1) % levelMax) + 1;
        return { levelA1: lv1, levelA2: lv2, levelB1: lv1, levelB2: lv2 };
      });
      return next;
    });
  }, [membersPerGroup, groupGamesBetweenGroups]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (t.finalMatch) return;
    if (!Array.isArray(t.semiMatches) || t.semiMatches.length < 2) return;
    const nextFinal = buildFinalFromSemis(t.semiMatches, null);
    if (nextFinal) t.setFinalMatch(nextFinal);
  }, [t.semiMatches, t.finalMatch]);

  async function handleAuthMenu() {
    setMenuOpen(false);
    setAuthError('');
    if (isLoggedIn) {
      window.localStorage.removeItem(AUTH_MOBILE_KEY);
      window.localStorage.removeItem(ACTIVE_MENU_KEY);
      clearAnalyticsUser();
      setIsAdminUser(false);
      setIsLoggedIn(false);
      setActiveMenu('login');
      return;
    }
    setActiveMenu('login');
  }

  async function handleMobileOtpLogin(mobile, otp) {
    setAuthBusy(true);
    setAuthError('');
    try {
      const enteredMobile = String(mobile || '').trim();
      if (!enteredMobile) throw new Error('Mobile number is required.');
      if (String(otp || '').trim() !== '1234') {
        throw new Error('Invalid OTP.');
      }
      const DEMO_ADMIN_MOBILE = '9567723832';
      const normalizeMobile = (value) => String(value || '').replace(/\D/g, '');
      const toLast10 = (value) => {
        const digits = normalizeMobile(value);
        return digits.length > 10 ? digits.slice(-10) : digits;
      };
      const enteredNorm = normalizeMobile(enteredMobile);
      const enteredLast10 = toLast10(enteredMobile);
      const rows = await listPlayers();
      const matchedPlayer = (rows || []).find((p) => {
        const playerMobile = String(p?.mobile || '').trim();
        if (!playerMobile) return false;
        const playerNorm = normalizeMobile(playerMobile);
        const playerLast10 = toLast10(playerMobile);
        if (enteredNorm && playerNorm && enteredNorm === playerNorm) return true;
        if (enteredLast10 && playerLast10 && enteredLast10 === playerLast10) return true;
        return playerMobile === enteredMobile;
      });
      const isDemoAdmin = enteredLast10 === DEMO_ADMIN_MOBILE;
      if (!matchedPlayer && !isDemoAdmin) {
        throw new Error('Mobile number not found in players list.');
      }
      window.localStorage.setItem(AUTH_MOBILE_KEY, enteredMobile);
      const nextIsAdmin = Boolean(isDemoAdmin || matchedPlayer?.role === 'admin');
      setIsAdminUser(nextIsAdmin);
      setIsLoggedIn(true);
      if (matchedPlayer?.id) {
        setAnalyticsUser(matchedPlayer.id, {
          role: nextIsAdmin ? 'admin' : 'player',
        });
      }
      trackAnalyticsEvent('login_success', {
        method: 'mobile_otp',
        role: nextIsAdmin ? 'admin' : 'player',
      });
      setActiveMenu('home');
    } catch (e) {
      console.error(e);
      setAuthError(e?.message || 'Login failed.');
    } finally {
      setAuthBusy(false);
    }
  }

  async function refreshPlayersList() {
    setPlayersDbLoading(true);
    setPlayersDbError('');
    try {
      let rows = await listPlayers();
      if (!Array.isArray(rows) || rows.length === 0) {
        await seedDummyPlayersOnce(20);
        rows = await listPlayers();
      }
      setPlayersDbList(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setPlayersDbError(e?.message || 'Unable to load players.');
      setPlayersDbList([]);
    } finally {
      setPlayersDbLoading(false);
    }
  }

  function normalizeMobile(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function toLast10(value) {
    const digits = normalizeMobile(value);
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  function resolveLoggedInPlayer(rows, loggedMobile) {
    const loggedNorm = toLast10(loggedMobile);
    return (
      (rows || []).find((p) => {
        const pm = String(p?.mobile || '').trim();
        return pm && toLast10(pm) === loggedNorm;
      }) || null
    );
  }

  function getCurrentUserMobileNormalized() {
    const loggedMobile = window.localStorage.getItem(AUTH_MOBILE_KEY) || '';
    return toLast10(loggedMobile);
  }

  function parseIntegerOrEmpty(value, minValue = 0) {
    if (value === '') return '';
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return '';
    return Math.max(minValue, n);
  }

  function parseNonNegativeOrEmpty(value) {
    if (value === '') return '';
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return Math.max(0, n);
  }

  function getTournamentCreatorMobile(tournamentRowOrPayload) {
    const payload = tournamentRowOrPayload?.payload
      ? tournamentRowOrPayload.payload
      : tournamentRowOrPayload || {};
    return toLast10(payload?.createdByMobile || '');
  }

  function getTournamentCreatorName(tournamentRowOrPayload) {
    const creatorMobile = getTournamentCreatorMobile(tournamentRowOrPayload);
    if (!creatorMobile) return 'Unknown';
    const match = (playersDbList || []).find((p) => {
      const pm = String(p?.mobile || '').trim();
      return pm && toLast10(pm) === creatorMobile;
    });
    const name = String(match?.name || '').trim();
    return name || creatorMobile;
  }

  function canDeleteTournament(tournamentRow) {
    if (isAdminUser) return true;
    const currentMobile = getCurrentUserMobileNormalized();
    if (!currentMobile) return false;
    const creatorMobile = getTournamentCreatorMobile(tournamentRow);
    return Boolean(creatorMobile && creatorMobile === currentMobile);
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setIsAdminUser(false);
      clearAnalyticsUser();
      return;
    }
    const loggedMobile = window.localStorage.getItem(AUTH_MOBILE_KEY) || '';
    const matched = resolveLoggedInPlayer(playersDbList, loggedMobile);
    if (matched?.id) {
      setAnalyticsUser(matched.id, {
        role: matched?.role === 'admin' ? 'admin' : 'player',
      });
    }
    if (matched?.role === 'admin') {
      setIsAdminUser(true);
      return;
    }
    setIsAdminUser(toLast10(loggedMobile) === '9567723832');
  }, [isLoggedIn, playersDbList]);

  async function loadProfileForLoggedInUser() {
    setProfileLoading(true);
    setProfileError('');
    try {
      const loggedMobile = window.localStorage.getItem(AUTH_MOBILE_KEY) || '';
      const rows = await listPlayers();
      const matched = resolveLoggedInPlayer(rows, loggedMobile);
      if (!matched) {
        setProfilePlayer(null);
        setProfileError('No player profile mapped to this login mobile number.');
        return;
      }
      setProfilePlayer(matched);
    } catch (e) {
      console.error(e);
      setProfilePlayer(null);
      setProfileError(e?.message || 'Unable to load profile.');
    } finally {
      setProfileLoading(false);
    }
  }

  function getLoggedInPlayerFromList(rows = playersDbList) {
    const loggedMobile = window.localStorage.getItem(AUTH_MOBILE_KEY) || '';
    return resolveLoggedInPlayer(rows, loggedMobile);
  }

  async function refreshSkillLevelData() {
    setSkillError('');
    const currentPlayer = getLoggedInPlayerFromList();
    if (!currentPlayer?.id) {
      setSkillSuggestions([]);
      setSkillError('Unable to identify logged in player for skill suggestions.');
      return;
    }
    try {
      const mine = await listSkillSuggestionsBySuggester(currentPlayer.id);
      setSkillSuggestions(Array.isArray(mine) ? mine : []);
    } catch (e) {
      console.error(e);
      setSkillSuggestions([]);
      setSkillError(e?.message || 'Unable to load your skill suggestions.');
    }

    if (isAdminUser) {
      setSkillAveragesLoading(true);
      try {
        const avgRows = await listSkillSuggestionAverages();
        setSkillAverages(Array.isArray(avgRows) ? avgRows : []);
      } catch (e) {
        console.error(e);
        setSkillAverages([]);
        setSkillError(e?.message || 'Unable to load suggested skill averages.');
      } finally {
        setSkillAveragesLoading(false);
      }
    } else {
      setSkillAverages([]);
      setSkillAveragesLoading(false);
    }
  }

  async function handleSaveSkillSuggestions(entries) {
    const currentPlayer = getLoggedInPlayerFromList();
    if (!currentPlayer?.id) {
      throw new Error('Logged in player profile not found.');
    }
    setSkillSaving(true);
    setSkillError('');
    try {
      const result = await saveSkillSuggestionsBySuggester({
        suggesterPlayerId: currentPlayer.id,
        suggesterMobile: currentPlayer.mobile || getCurrentUserMobileNormalized(),
        suggestions: entries,
      });
      await refreshSkillLevelData();
      return result;
    } catch (e) {
      console.error(e);
      const msg = e?.message || 'Unable to save skill suggestions.';
      setSkillError(msg);
      throw new Error(msg);
    } finally {
      setSkillSaving(false);
    }
  }

  async function handleApplyAverageSkills() {
    if (!isAdminUser) {
      throw new Error('Only admin can update player skills from averages.');
    }
    setSkillApplying(true);
    setSkillError('');
    try {
      const averagesMap = new Map(
        (skillAverages || [])
          .filter((row) => row?.playerId && Number.isFinite(Number(row?.averageSkill)))
          .map((row) => [row.playerId, Number(row.averageSkill)])
      );
      if (averagesMap.size === 0) {
        throw new Error('No average suggested skills available to apply.');
      }

      const updates = (playersDbList || [])
        .filter((p) => p?.id && averagesMap.has(p.id))
        .map((p) => {
          const avg = averagesMap.get(p.id);
          const nextSkill = Math.min(10, Math.max(1, Math.round(avg)));
          return updatePlayer(p.id, {
            name: String(p.name || '').trim(),
            age: Number(p.age) || 1,
            mobile: String(p.mobile || '').trim(),
            skill: nextSkill,
            role: p.role || 'player',
            avatarUrl: String(p.avatarUrl || '').trim(),
          });
        });

      await Promise.all(updates);
      await refreshPlayersList();
      await refreshSkillLevelData();
      setSaveNotice(`Updated skill levels for ${updates.length} players from average suggestions.`);
      return { updated: updates.length };
    } catch (e) {
      console.error(e);
      const msg = e?.message || 'Unable to update player skills from averages.';
      setSkillError(msg);
      throw new Error(msg);
    } finally {
      setSkillApplying(false);
    }
  }

  async function loadMyPredictionForTournament(tournamentId) {
    const mobile = getCurrentUserMobileNormalized();
    if (!mobile) return null;
    return getPredictionByTournamentAndUser(tournamentId, mobile);
  }

  async function saveMyPrediction(tournamentId, payload) {
    const mobile = getCurrentUserMobileNormalized();
    if (!mobile) throw new Error('Login mobile not found.');
    setPredictionSaving(true);
    setPredictionError('');
    try {
      return await savePrediction({
        tournamentId,
        predictorMobile: mobile,
        payload,
      });
    } catch (e) {
      console.error(e);
      const msg = e?.message || 'Unable to save prediction.';
      setPredictionError(msg);
      throw new Error(msg);
    } finally {
      setPredictionSaving(false);
    }
  }

  async function saveMyProfile(updates) {
    if (!profilePlayer?.id) return;
    setProfileSaving(true);
    setProfileError('');
    try {
      const nextAge = Number(updates?.age ?? profilePlayer.age);
      if (!Number.isInteger(nextAge) || nextAge < 1) {
        throw new Error('Age should be a positive whole number.');
      }
      let avatarUrl = String(profilePlayer?.avatarUrl || '').trim();
      if (updates?.avatarFile) {
        const uploaded = await uploadPlayerProfilePhoto(profilePlayer.id, updates.avatarFile);
        avatarUrl = String(uploaded?.url || '').trim();
      }
      const payload = {
        name: String(updates?.name || profilePlayer.name || '').trim(),
        mobile: String(updates?.mobile || profilePlayer.mobile || '').trim(),
        age: nextAge,
        skill: Number(profilePlayer.skill) || 5,
        role: profilePlayer.role || 'player',
        avatarUrl,
      };
      const updated = await updatePlayer(profilePlayer.id, payload);
      setProfilePlayer(updated || { ...profilePlayer, ...payload });
      if (payload.mobile) {
        window.localStorage.setItem(AUTH_MOBILE_KEY, payload.mobile);
      }
      await refreshPlayersList();
      setSaveNotice('Profile updated successfully.');
    } catch (e) {
      console.error(e);
      setProfileError(e?.message || 'Unable to update profile.');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAddPlayerToDb(player) {
    if (!isAdminUser) {
      setPlayersDbError('Only admins can add players.');
      return false;
    }
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
    if (!isAdminUser) {
      setPlayersDbError('Only admins can edit players.');
      return false;
    }
    setPlayersDbUpdatingId(id);
    setPlayersDbError('');
    try {
      const existing = (playersDbList || []).find((row) => row?.id === id);
      await updatePlayer(id, {
        ...player,
        avatarUrl: String(existing?.avatarUrl || '').trim(),
      });
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
    if (!isAdminUser) {
      setPlayersDbError('Only admins can delete players.');
      return;
    }
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
      const normalized = Array.isArray(rows) ? rows : [];
      const seen = new Set();
      const deduped = normalized.filter((row) => {
        if (!row?.id) return true;
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      });
      setTournamentsList(deduped);
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
    setSaveNotice('');
    try {
      const tournamentName = t.tournamentName || `Tournament ${new Date().toLocaleString()}`;
      const creatorMobile = getCurrentUserMobileNormalized();
      const existing = fixtureTournamentId
        ? tournamentsList.find((row) => row.id === fixtureTournamentId)
        : null;
      const existingCreator = getTournamentCreatorMobile(existing);
      const basePayload = {
        id: fixtureTournamentId || undefined,
        name: tournamentName,
        mode: t.mode,
        eventDate: t.eventDate,
        numPools: t.numPools,
        membersPerGroup,
        groupGamesBetweenGroups,
        groupLevelPairings,
        pointSystem: getCurrentPointSystem(),
        players: t.players,
        teams: t.teams,
        pools: t.pools,
        groupMatches: t.groupMatches,
        semiMatches: t.semiMatches,
        finalMatch: t.finalMatch,
        createdByMobile: existingCreator || creatorMobile || '',
        created_at: new Date().toISOString(),
      };
      const payload = {
        ...basePayload,
        status: deriveTournamentStatus(basePayload),
        winnerTeamId: basePayload.mode === 'group' ? getGroupWinnerTeamId(basePayload) : undefined,
      };
      const savedId = await saveTournament(payload);
      if (savedId) setFixtureTournamentId(savedId);
      setSaveNotice(`Saved "${tournamentName}" successfully.`);
      try {
        await refreshTournamentsList();
      } catch (refreshErr) {
        console.error(refreshErr);
        setTournamentsError(
          refreshErr?.message || 'Tournament saved, but failed to refresh tournament list.'
        );
      }
    } catch (e) {
      console.error(e);
      const msg = e?.message || 'Unable to save tournament.';
      setTournamentsError(msg);
      t.setError(msg);
    }
  }

  async function handleTournamentDelete(input) {
    const row =
      typeof input === 'string'
        ? (tournamentsList || []).find((t) => t.id === input)
        : input || null;
    const id = typeof input === 'string' ? input : row?.id;
    if (!id) return;
    if (!canDeleteTournament(row)) {
      setTournamentsError('Only admins or the user who created this tournament can delete it.');
      return;
    }
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

  async function openTournamentDetailsFromHome(id) {
    setTournamentsError('');
    try {
      const data = await loadTournament(id);
      setSelectedTournament(data);
      setSelectedMatchRef(null);
      setActiveMenu('tournament');
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
    if (tournament?.mode === 'group') return groups;
    const semis = (tournament?.semiMatches || []).map((m) => ({
      ...m,
      stage: 'Semifinal',
    }));
    const finals = tournament?.finalMatch
      ? [{ ...tournament.finalMatch, stage: 'Final' }]
      : [];
    return [...groups, ...semis, ...finals];
  }

  function getCurrentPointSystem() {
    return {
      winnerPoints: Math.max(0, Number(winnerTeamPoint) || 0),
      winnerBonusOppScoreLessThan: Math.max(0, Number(winnerBonusOppScoreLessThan) || 0),
      winnerBonusPoints: Math.max(0, Number(winnerBonusPoint) || 0),
      loserBonusScoreGreaterThan: Math.max(0, Number(loserBonusScoreGreaterThan) || 0),
      loserBonusPoints: Math.max(0, Number(loserBonusPoint) || 0),
    };
  }

  function getGroupWinnerTeamId(tournament) {
    const pointSystem = tournament?.pointSystem || getCurrentPointSystem();
    const pools = tournament?.pools || [];
    const teams = tournament?.teams || [];
    const groupMatches = tournament?.groupMatches || [];
    if (pools.length === 0 || teams.length === 0 || groupMatches.length === 0) return null;
    const standings = computeStandings(pools, teams, groupMatches, pointSystem);
    const ranked = pools
      .map((p) => {
        const rows = standings[p.id] || [];
        const points = rows.reduce((sum, r) => sum + Number(r?.points || 0), 0);
        const pf = rows.reduce((sum, r) => sum + Number(r?.pf || 0), 0);
        const pa = rows.reduce((sum, r) => sum + Number(r?.pa || 0), 0);
        return { groupId: p.id, points, diff: pf - pa, pf };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.pf - a.pf;
      });
    const winnerGroup = ranked[0];
    if (!winnerGroup) return null;
    const topTeam = (standings[winnerGroup.groupId] || [])[0];
    return topTeam?.teamId || null;
  }

  function deriveTournamentStatus(tournament) {
    if (tournament?.mode === 'group') {
      const groupMatches = tournament?.groupMatches || [];
      if (groupMatches.length > 0 && groupMatches.every((m) => m?.status === 'Completed')) {
        return 'Completed';
      }
      if (groupMatches.some((m) => m?.status === 'Live' || m?.status === 'Completed')) {
        return 'Live';
      }
      return 'Upcoming';
    }
    const allMatches = getTournamentMatches(tournament);
    const hasFinal = Boolean(tournament?.finalMatch);
    if (
      hasFinal &&
      allMatches.length > 0 &&
      allMatches.every((m) => m?.status === 'Completed')
    ) {
      return 'Completed';
    }
    if (allMatches.some((m) => m?.status === 'Live' || m?.status === 'Completed')) {
      return 'Live';
    }
    return 'Upcoming';
  }

  async function persistFixtureTournamentState(overrides = {}, options = {}) {
    const { silent = true } = options;
    if (!fixtureTournamentId) return;
    try {
      const currentUserMobile = getCurrentUserMobileNormalized();
      const existing = (tournamentsList || []).find((row) => row.id === fixtureTournamentId);
      const existingCreator = getTournamentCreatorMobile(existing);
      const payloadBase = {
        id: fixtureTournamentId,
        name: t.tournamentName || `Tournament ${new Date().toLocaleString()}`,
        mode: t.mode,
        eventDate: t.eventDate,
        numPools: t.numPools,
        membersPerGroup,
        groupGamesBetweenGroups,
        groupLevelPairings,
        pointSystem: getCurrentPointSystem(),
        players: t.players,
        teams: t.teams,
        pools: t.pools,
        groupMatches: t.groupMatches,
        semiMatches: t.semiMatches,
        finalMatch: t.finalMatch,
        createdByMobile: existingCreator || currentUserMobile || '',
        created_at: new Date().toISOString(),
        ...overrides,
      };
      const payload = {
        ...payloadBase,
        status: deriveTournamentStatus(payloadBase),
        winnerTeamId:
          payloadBase.mode === 'group'
            ? getGroupWinnerTeamId(payloadBase)
            : payloadBase.winnerTeamId,
      };
      await updateTournament(fixtureTournamentId, payload);
      setTournamentsList((prev) =>
        prev.map((row) =>
          row.id === fixtureTournamentId ? { ...row, status: payload.status } : row
        )
      );
    } catch (e) {
      console.error(e);
      if (!silent) {
        t.setError(e?.message || 'Unable to persist fixture updates.');
      }
    }
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

  async function openMatchTracking(ref, action = 'open') {
    const match = findMatchByRef(selectedTournament, ref);
    if (!match) return;
    let sourceTournament = selectedTournament;

    if (
      action === 'start' &&
      selectedTournament &&
      match.status !== 'Completed' &&
      match.status !== 'Live'
    ) {
      setTournamentsError('');
      try {
        const next = { ...selectedTournament };
        if (ref.stage === 'Group') {
          next.groupMatches = (next.groupMatches || []).map((m) =>
            m.id === ref.id ? { ...m, status: 'Live' } : m
          );
        } else if (ref.stage === 'Semifinal') {
          next.semiMatches = (next.semiMatches || []).map((m) =>
            m.id === ref.id ? { ...m, status: 'Live' } : m
          );
        } else if (ref.stage === 'Final' && next.finalMatch?.id === ref.id) {
          next.finalMatch = { ...next.finalMatch, status: 'Live' };
        }
        next.status = deriveTournamentStatus(next);
        await updateTournament(next.id, {
          ...next,
          name: next.name,
          status: next.status,
        });
        setSelectedTournament(next);
        setTournamentsList((prev) =>
          prev.map((row) => (row.id === next.id ? { ...row, status: next.status } : row))
        );
        sourceTournament = next;
      } catch (e) {
        console.error(e);
        setTournamentsError(e?.message || 'Unable to start match.');
      }
    }

    const latest = findMatchByRef(sourceTournament, ref) || match;
    setSelectedMatchRef(ref);
    setMatchScoreA(latest.scoreA ?? '');
    setMatchScoreB(latest.scoreB ?? '');
    setMatchWinnerId(latest.winnerTeamId || '');
    setMatchStatus(latest.status || 'Pending');
    setTournamentView('match');
  }

  async function saveMatchTracking() {
    if (!selectedTournament || !selectedMatchRef) return;
    if (selectedTournament.status === 'Completed' && !isAdminUser) {
      setTournamentsError('Only admin can edit scores for completed tournaments.');
      return;
    }
    if (!selectedTournament.id) {
      setTournamentsError('Unable to save match: missing tournament id.');
      return;
    }
    setSavingMatch(true);
    setTournamentsError('');
    try {
      const existingMatch = findMatchByRef(selectedTournament, selectedMatchRef);
      const updater = getLoggedInPlayerFromList();
      const scoreUpdateMeta = {
        scoreUpdatedAt: new Date().toISOString(),
        scoreUpdatedByMobile: getCurrentUserMobileNormalized() || '',
        scoreUpdatedByName: String(updater?.name || '').trim(),
      };
      const scoreA = matchScoreA === '' ? null : Number(matchScoreA);
      const scoreB = matchScoreB === '' ? null : Number(matchScoreB);
      let winnerTeamId = null;
      let status = 'Pending';
      if (
        scoreA != null &&
        scoreB != null &&
        Number.isFinite(scoreA) &&
        Number.isFinite(scoreB)
      ) {
        const diff = Math.abs(scoreA - scoreB);
        const maxScore = Math.max(scoreA, scoreB);
        if (maxScore >= 21 && diff >= 2) {
          if (scoreA > scoreB) winnerTeamId = existingMatch?.teamAId || null;
          else if (scoreB > scoreA) winnerTeamId = existingMatch?.teamBId || null;
          status = winnerTeamId ? 'Completed' : 'Pending';
        }
      }

      const next = { ...selectedTournament };
      if (selectedMatchRef.stage === 'Group') {
        next.groupMatches = (next.groupMatches || []).map((m) =>
          m.id === selectedMatchRef.id
            ? { ...m, scoreA, scoreB, winnerTeamId, status, ...scoreUpdateMeta }
            : m
        );
      } else if (selectedMatchRef.stage === 'Semifinal') {
        next.semiMatches = (next.semiMatches || []).map((m) =>
          m.id === selectedMatchRef.id
            ? { ...m, scoreA, scoreB, winnerTeamId, status, ...scoreUpdateMeta }
            : m
        );
        const autoFinal = buildFinalFromSemis(next.semiMatches || [], next.finalMatch || null);
        if (autoFinal) {
          next.finalMatch = autoFinal;
        }
      } else if (selectedMatchRef.stage === 'Final' && next.finalMatch?.id === selectedMatchRef.id) {
        next.finalMatch = {
          ...next.finalMatch,
          scoreA,
          scoreB,
          winnerTeamId,
          status,
          ...scoreUpdateMeta,
        };
      }
      next.lastScoreUpdate = {
        stage: selectedMatchRef.stage,
        matchId: selectedMatchRef.id,
        ...scoreUpdateMeta,
      };
      next.status = deriveTournamentStatus(next);

      await updateTournament(next.id, {
        ...next,
        name: next.name,
        status: next.status,
      });

      setSelectedTournament(next);
      setTournamentsList((prev) =>
        prev.map((row) => (row.id === next.id ? { ...row, status: next.status } : row))
      );
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

  function handleAutoPairFromBuilder() {
    if (typeof t.autoPairDoubles === 'function') {
      t.autoPairDoubles();
      return;
    }

    const available = [...(t.unpairedPlayers || [])];
    if (available.length < 2) {
      t.setError('Need at least 2 unpaired players to auto-pair.');
      return;
    }

    // Balanced pairing: strongest with weakest among remaining players.
    const sorted = available.sort((a, b) => Number(b.skill || 0) - Number(a.skill || 0));
    const nextTeams = [];

    while (sorted.length >= 2) {
      const p1 = sorted.shift();
      const p2 = sorted.pop();
      if (!p1 || !p2) break;

      const avgSkill = Math.round(((Number(p1.skill) + Number(p2.skill)) / 2) * 10) / 10;
      nextTeams.push({
        id: `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${p1.name} & ${p2.name}`,
        players: [p1.id, p2.id],
        avgSkill,
      });
    }

    if (nextTeams.length === 0) {
      t.setError('Unable to auto-pair players.');
      return;
    }

    t.setTeams((prev) => [...prev, ...nextTeams]);
    if (sorted.length === 1) {
      t.setError(
        `Auto-pair created ${nextTeams.length} teams. ${sorted[0].name} is left unpaired.`
      );
    } else {
      t.setError('');
    }
  }

  function handleShuffleTeamsFromBuilder() {
    const currentTeams = Array.isArray(t.teams) ? t.teams : [];
    if (currentTeams.length < 2) {
      t.setError('Need at least 2 teams to shuffle.');
      return;
    }

    const teamPlayerIds = currentTeams.flatMap((team) => team.players || []);
    const uniquePlayerIds = [...new Set(teamPlayerIds)];
    const poolPlayers = uniquePlayerIds
      .map((id) => t.players.find((p) => p.id === id))
      .filter(Boolean);

    if (poolPlayers.length < 4) {
      t.setError('Need at least 4 players to shuffle teams.');
      return;
    }

    const previousPairSet = new Set(
      currentTeams
        .map((team) => [...(team.players || [])].sort().join('|'))
        .filter(Boolean)
    );

    const shuffleArray = (arr) => {
      const out = [...arr];
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    };

    const meanSkill =
      poolPlayers.reduce((sum, p) => sum + Number(p.skill || 0), 0) / poolPlayers.length;

    const evaluatePairing = (pairs) => {
      const avgSkills = pairs.map(([a, b]) => (Number(a.skill || 0) + Number(b.skill || 0)) / 2);
      const stdev =
        avgSkills.length > 0
          ? Math.sqrt(
              avgSkills.reduce((sum, v) => sum + (v - meanSkill) ** 2, 0) / avgSkills.length
            )
          : 999;
      const repeatedCount = pairs.filter(([a, b]) =>
        previousPairSet.has([a.id, b.id].sort().join('|'))
      ).length;
      return { stdev, repeatedCount };
    };

    let best = null;
    const attempts = 120;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const shuffled = shuffleArray(poolPlayers);
      const pairs = [];
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        pairs.push([shuffled[i], shuffled[i + 1]]);
      }
      const leftover = shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1] : null;
      const score = evaluatePairing(pairs);

      const candidate = { pairs, leftover, ...score };
      if (!best) {
        best = candidate;
        continue;
      }

      const betterRepeated = candidate.repeatedCount < best.repeatedCount;
      const similarRepeated = candidate.repeatedCount === best.repeatedCount;
      const betterStdev = candidate.stdev < best.stdev;
      if (betterRepeated || (similarRepeated && betterStdev)) {
        best = candidate;
      }

      if (best.repeatedCount === 0 && best.stdev < 0.8) break;
    }

    if (!best || best.pairs.length === 0) {
      t.setError('Unable to shuffle teams right now.');
      return;
    }

    const unchangedCount = best.repeatedCount;
    const newTeams = best.pairs.map(([p1, p2]) => ({
      id: `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${p1.name} & ${p2.name}`,
      players: [p1.id, p2.id],
      avgSkill: Math.round(((Number(p1.skill) + Number(p2.skill)) / 2) * 10) / 10,
    }));

    t.setTeams(newTeams);
    t.setPools([]);
    t.setGroupMatches([]);
    t.setSemiMatches([]);
    t.setFinalMatch(null);

    if (unchangedCount === 0) {
      t.setError(
        best.leftover
          ? `Teams shuffled. ${best.leftover.name} is left unpaired.`
          : 'Teams shuffled with new balanced pairings.'
      );
    } else {
      t.setError(
        `Teams shuffled. ${unchangedCount} pair(s) remained same to keep skill balance.`
      );
    }
  }

  function createSingleMemberTeams(players) {
    return (players || []).map((p) => ({
      id: `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: p.name,
      players: [p.id],
      avgSkill: Number(p.skill) || 0,
    }));
  }

  function buildBalancedPools(teams, poolCount, membersEach, options = {}) {
    const { groupMode = false, poolNames = [] } = options;
    const pools = Array.from({ length: poolCount }, (_, idx) => ({
      id: `POOL-${idx + 1}`,
      name: String(poolNames[idx] || `${idx + 1}`),
      teamIds: [],
    }));

    const sorted = [...teams].sort((a, b) => Number(b.avgSkill || 0) - Number(a.avgSkill || 0));
    const required = Math.max(1, poolCount) * Math.max(1, membersEach || 1);
    const coreTeams = groupMode ? sorted.slice(0, Math.min(required, sorted.length)) : sorted;
    const extraTeams = groupMode
      ? [...sorted.slice(coreTeams.length)].sort((a, b) => Number(a.avgSkill || 0) - Number(b.avgSkill || 0))
      : [];

    coreTeams.forEach((team, idx) => {
      const cycle = Math.floor(idx / poolCount);
      const pos = idx % poolCount;
      const targetIndex = cycle % 2 === 0 ? pos : poolCount - 1 - pos;
      pools[targetIndex].teamIds.push(team.id);
    });

    for (const team of extraTeams) {
      const targetIndex = Math.floor(Math.random() * poolCount);
      pools[targetIndex].teamIds.push(team.id);
    }

    return pools;
  }

  function handleAutoCreateGroupMembers() {
    if (t.mode !== 'group') return;

    const poolCount = Math.max(1, Number(t.numPools) || 1);
    const membersEach = Math.max(2, Number(membersPerGroup) || 2);
    const requiredPlayers = poolCount * membersEach;
    const selectedPlayers = Array.isArray(t.players) ? t.players : [];

    if (selectedPlayers.length < requiredPlayers) {
      t.setError(
        `Group setup needs at least ${requiredPlayers} players (${poolCount} groups × ${membersEach} players). Selected: ${selectedPlayers.length}.`
      );
      return false;
    }

    const nextTeams = createSingleMemberTeams(selectedPlayers);
    const pools = buildBalancedPools(nextTeams, poolCount, membersEach, {
      groupMode: true,
      poolNames: groupNames,
    });
    const invalidPool = pools.some((p) => (p.teamIds || []).length < membersEach);
    if (invalidPool) {
      t.setError('Unable to create balanced groups with the current configuration.');
      return false;
    }

    t.setTeams(nextTeams);
    t.setPools(pools);
    t.setGroupMatches([]);
    t.setSemiMatches([]);
    t.setFinalMatch(null);
    t.setError('');
    return true;
  }

  function clearFixtureAfterGroupStructureChange() {
    t.setGroupMatches([]);
    t.setSemiMatches([]);
    t.setFinalMatch(null);
  }

  function handleChangeGroupMember(teamId, nextPlayerId) {
    const nextId = String(nextPlayerId || '').trim();
    if (!teamId || !nextId) return;
    const team = (t.teams || []).find((tm) => tm.id === teamId);
    if (!team) return;
    const currentId = team.players?.[0] || '';
    if (currentId === nextId) return;
    const duplicateElsewhere = (t.teams || []).some(
      (tm) => tm.id !== teamId && (tm.players || []).includes(nextId)
    );
    if (duplicateElsewhere) {
      t.setError('Same player cannot be added in multiple groups.');
      return;
    }
    const player = (t.players || []).find((p) => p.id === nextId);
    if (!player) {
      t.setError('Selected player not found.');
      return;
    }
    t.setTeams((prev) =>
      prev.map((tm) =>
        tm.id === teamId
          ? {
              ...tm,
              players: [player.id],
              name: player.name,
              avgSkill: Number(player.skill) || 0,
            }
          : tm
      )
    );
    clearFixtureAfterGroupStructureChange();
    t.setError('');
  }

  function handleDeleteGroupMember(teamId) {
    if (!teamId) return;
    if (typeof t.removeTeam === 'function') {
      t.removeTeam(teamId);
    } else {
      t.setTeams((prev) => prev.filter((tm) => tm.id !== teamId));
      t.setPools((prev) =>
        prev.map((pool) => ({
          ...pool,
          teamIds: (pool.teamIds || []).filter((tid) => tid !== teamId),
        }))
      );
    }
    clearFixtureAfterGroupStructureChange();
    t.setError('');
  }

  function handleAddGroupMember(poolId, playerId) {
    const nextId = String(playerId || '').trim();
    if (!poolId || !nextId) {
      t.setError('Choose a player to add.');
      return;
    }
    const inUse = (t.teams || []).some((tm) => (tm.players || []).includes(nextId));
    if (inUse) {
      t.setError('Selected player is already assigned to a group.');
      return;
    }
    const player = (t.players || []).find((p) => p.id === nextId);
    if (!player) {
      t.setError('Selected player not found.');
      return;
    }
    const newTeam = {
      id: `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: player.name,
      players: [player.id],
      avgSkill: Number(player.skill) || 0,
    };
    t.setTeams((prev) => [...prev, newTeam]);
    t.setPools((prev) =>
      prev.map((pool) =>
        pool.id === poolId
          ? { ...pool, teamIds: [...(pool.teamIds || []), newTeam.id] }
          : pool
      )
    );
    setGroupAddSelections((prev) => ({ ...prev, [poolId]: '' }));
    clearFixtureAfterGroupStructureChange();
    t.setError('');
  }

  function isValidGroupLevelPairings() {
    const levelMax = Math.max(2, Number(membersPerGroup) || 2);
    const expected = Math.max(1, Number(groupGamesBetweenGroups) || 1);
    if (!Array.isArray(groupLevelPairings) || groupLevelPairings.length !== expected) return false;
    const seen = new Set();
    for (const row of groupLevelPairings) {
      const a1 = Number(row?.levelA1);
      const a2 = Number(row?.levelA2);
      const b1 = Number(row?.levelB1);
      const b2 = Number(row?.levelB2);
      if (!Number.isInteger(a1) || !Number.isInteger(a2) || !Number.isInteger(b1) || !Number.isInteger(b2)) return false;
      if (a1 < 1 || a1 > levelMax || a2 < 1 || a2 > levelMax || b1 < 1 || b1 > levelMax || b2 < 1 || b2 > levelMax) {
        return false;
      }
      if (a1 === a2 || b1 === b2) return false;
      const left = [a1, a2].sort((x, y) => x - y).join('&');
      const right = [b1, b2].sort((x, y) => x - y).join('&');
      const key = `${left}|${right}`;
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  }

  function updateGroupPairing(index, side, value) {
    setGroupLevelPairings((prev) =>
      prev.map((row, i) =>
        i !== index
          ? row
          : {
              ...row,
              [side]: Math.max(1, Number(value) || 1),
            }
      )
    );
  }

  function getMatchPlayerIds(match, teamsById) {
    const explicit = [
      ...(match?.teamAPlayerIds || []),
      ...(match?.teamBPlayerIds || []),
    ].filter(Boolean);
    if (explicit.length > 0) return [...new Set(explicit)];
    const teamAPlayers = teamsById[match?.teamAId || '']?.players || [];
    const teamBPlayers = teamsById[match?.teamBId || '']?.players || [];
    return [...new Set([...teamAPlayers, ...teamBPlayers].filter(Boolean))];
  }

  function scheduleMatchesWithCourts(rawMatches, teamsById, baseDate) {
    const pending = [...(rawMatches || [])];
    const scheduled = [];
    let previousSlotPlayers = new Set();
    let slotIndex = 0;

    while (pending.length > 0) {
      const scoreAgainstPrev = (m) =>
        getMatchPlayerIds(m, teamsById).filter((pid) => previousSlotPlayers.has(pid)).length;

      pending.sort((a, b) => scoreAgainstPrev(a) - scoreAgainstPrev(b));
      const first = pending.shift();
      if (!first) break;
      const firstPlayers = new Set(getMatchPlayerIds(first, teamsById));

      let secondIndex = -1;
      let secondBestScore = Number.POSITIVE_INFINITY;
      for (let i = 0; i < pending.length; i += 1) {
        const candidate = pending[i];
        const players = getMatchPlayerIds(candidate, teamsById);
        const overlapWithFirst = players.some((pid) => firstPlayers.has(pid));
        if (overlapWithFirst) continue;
        const prevOverlap = players.filter((pid) => previousSlotPlayers.has(pid)).length;
        if (prevOverlap < secondBestScore) {
          secondBestScore = prevOverlap;
          secondIndex = i;
        }
      }
      if (secondIndex === -1 && pending.length > 0) {
        // Fallback: no non-overlapping second match available.
        secondIndex = 0;
      }
      const second = secondIndex >= 0 ? pending.splice(secondIndex, 1)[0] : null;
      const slotTime = new Date(baseDate);
      slotTime.setHours(slotTime.getHours() + slotIndex);

      const slotMatches = [first, second].filter(Boolean);
      const slotPlayers = new Set();
      slotMatches.forEach((m, idx) => {
        getMatchPlayerIds(m, teamsById).forEach((pid) => slotPlayers.add(pid));
        scheduled.push({
          ...m,
          court: idx + 1,
          slot: slotIndex + 1,
          when: toIsoLocal(slotTime),
        });
      });

      previousSlotPlayers = slotPlayers;
      slotIndex += 1;
    }

    return scheduled;
  }

  function handleAutoAssignGroupsAndFixtures() {
    if (typeof t.autoAssignPoolsAndFixtures === 'function') {
      t.autoAssignPoolsAndFixtures();
      return;
    }

    const teams = Array.isArray(t.teams) ? [...t.teams] : [];
    if (teams.length < 2) {
      t.setError('Need at least 2 teams to create groups and fixtures.');
      return;
    }

    const requestedPools = Math.max(1, Number(t.numPools) || 1);
    const membersEach = Math.max(2, Number(membersPerGroup) || 2);
    const expectedTeams = requestedPools * membersEach;
    if (t.mode === 'group' && teams.length < expectedTeams) {
      t.setError(
        `You need at least ${expectedTeams} players/teams for this group setup (${requestedPools} × ${membersEach}). Current teams: ${teams.length}.`
      );
      return;
    }

    const canReuseConfiguredPools =
      t.mode === 'group' &&
      Array.isArray(t.pools) &&
      t.pools.length === requestedPools &&
      t.pools.every((p) => (p.teamIds || []).length >= membersEach) &&
      t.pools.reduce((sum, p) => sum + (p.teamIds || []).length, 0) >= expectedTeams &&
      new Set(t.pools.flatMap((p) => p.teamIds || [])).size === teams.length;

    const pools =
      canReuseConfiguredPools
        ? t.pools
        : t.mode === 'group'
          ? buildBalancedPools(teams, requestedPools, membersEach, {
              groupMode: true,
              poolNames: groupNames,
            })
          : buildBalancedPools(
              teams,
              Math.min(requestedPools, teams.length),
              Number.MAX_SAFE_INTEGER
            );

    const baseDate = t.eventDate ? new Date(`${t.eventDate}T09:00`) : new Date();
    const matches = [];
    const teamsById = Object.fromEntries(teams.map((tm) => [tm.id, tm]));

    if (t.mode === 'group') {
      if (!isValidGroupLevelPairings()) {
        t.setError('Please configure non-repeating level match combinations in Step 1.');
        return;
      }
      for (let i = 0; i < pools.length; i += 1) {
        for (let j = i + 1; j < pools.length; j += 1) {
          const poolA = pools[i];
          const poolB = pools[j];
          const rankedA = [...(poolA.teamIds || [])]
            .map((id) => teams.find((tm) => tm.id === id))
            .filter(Boolean)
            .sort((x, y) => Number(y.avgSkill || 0) - Number(x.avgSkill || 0));
          const rankedB = [...(poolB.teamIds || [])]
            .map((id) => teams.find((tm) => tm.id === id))
            .filter(Boolean)
            .sort((x, y) => Number(y.avgSkill || 0) - Number(x.avgSkill || 0));

          groupLevelPairings.forEach((row, idx) => {
            const a1 = rankedA[(Number(row.levelA1) || 1) - 1];
            const a2 = rankedA[(Number(row.levelA2) || 1) - 1];
            const b1 = rankedB[(Number(row.levelB1) || 1) - 1];
            const b2 = rankedB[(Number(row.levelB2) || 1) - 1];
            if (!a1 || !a2 || !b1 || !b2) return;
            const sideAName = `${a1.name} & ${a2.name}`;
            const sideBName = `${b1.name} & ${b2.name}`;
            matches.push({
              id: `GM-${poolA.id}-${poolB.id}-${idx + 1}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 6)}`,
              poolId: poolA.id,
              poolAId: poolA.id,
              poolBId: poolB.id,
              round: 'Group',
              label: `${groupNames[i] || `Group ${poolA.name}`} L${row.levelA1}&L${row.levelA2} vs ${
                groupNames[j] || `Group ${poolB.name}`
              } L${row.levelB1}&L${row.levelB2}`,
              teamAId: a1.id,
              teamBId: b1.id,
              teamAPlayerIds: [a1.id, a2.id],
              teamBPlayerIds: [b1.id, b2.id],
              teamADisplay: sideAName,
              teamBDisplay: sideBName,
              scoreA: null,
              scoreB: null,
              status: 'Pending',
            });
          });
        }
      }
    } else {
      pools.forEach((pool, poolIdx) => {
        const pairs = roundRobin(pool.teamIds);
        pairs.forEach(([teamAId, teamBId], pairIdx) => {
          matches.push({
            id: `GM-${poolIdx + 1}-${pairIdx + 1}-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2, 6)}`,
            poolId: pool.id,
            round: 'Group',
            label: `Group ${pool.name} - Match ${pairIdx + 1}`,
            teamAId,
            teamBId,
            scoreA: null,
            scoreB: null,
            status: 'Pending',
          });
        });
      });
    }

    const scheduledMatches = scheduleMatchesWithCourts(matches, teamsById, baseDate);

    t.setPools(pools);
    t.setGroupMatches(scheduledMatches);
    t.setSemiMatches([]);
    t.setFinalMatch(null);
    t.setError('');
  }

  function handleGroupScoreChange(matchId, scoreA, scoreB, changedField) {
    if (typeof t.updateMatchScore === 'function') {
      t.updateMatchScore(matchId, scoreA, scoreB);
      return;
    }
    const normalize = (v) => {
      if (v === '' || v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const decideOutcome = (a, b, teamAId, teamBId) => {
      if (a == null || b == null) return { status: 'Pending', winnerTeamId: null };
      const diff = Math.abs(a - b);
      const maxScore = Math.max(a, b);
      if (maxScore >= 21 && diff >= 2) {
        return {
          status: 'Completed',
          winnerTeamId: a > b ? teamAId : teamBId,
        };
      }
      return { status: 'Pending', winnerTeamId: null };
    };
    let nextGroupMatches = null;
    t.setGroupMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? (() => {
              const nextA =
                changedField === 'B'
                  ? m.scoreA
                  : changedField === 'A'
                    ? normalize(scoreA)
                    : normalize(scoreA);
              const nextB =
                changedField === 'A'
                  ? m.scoreB
                  : changedField === 'B'
                    ? normalize(scoreB)
                    : normalize(scoreB);
              const outcome = decideOutcome(nextA, nextB, m.teamAId, m.teamBId);
              return {
                ...m,
                scoreA: nextA,
                scoreB: nextB,
                status: outcome.status,
                winnerTeamId: outcome.winnerTeamId,
              };
            })()
          : m
      )
    );
    // Capture computed next state for persistence.
    nextGroupMatches = (t.groupMatches || []).map((m) => {
      if (m.id !== matchId) return m;
      const normalize = (v) => {
        if (v === '' || v == null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const nextA =
        changedField === 'B'
          ? m.scoreA
          : changedField === 'A'
            ? normalize(scoreA)
            : normalize(scoreA);
      const nextB =
        changedField === 'A'
          ? m.scoreB
          : changedField === 'B'
            ? normalize(scoreB)
            : normalize(scoreB);
      const diff = Math.abs((nextA ?? 0) - (nextB ?? 0));
      const maxScore = Math.max(nextA ?? 0, nextB ?? 0);
      const completed = nextA != null && nextB != null && maxScore >= 21 && diff >= 2;
      return {
        ...m,
        scoreA: nextA,
        scoreB: nextB,
        status: completed ? 'Completed' : 'Pending',
        winnerTeamId: completed ? (nextA > nextB ? m.teamAId : m.teamBId) : null,
      };
    });
    if (nextGroupMatches) {
      void persistFixtureTournamentState({ groupMatches: nextGroupMatches }, { silent: true });
    }
    t.setError('');
  }

  function handleFinalizeGroupMatch(matchId) {
    if (typeof t.finalizeMatch === 'function') {
      t.finalizeMatch(matchId);
      return;
    }
    let missingScore = false;
    let invalidScore = false;
    t.setGroupMatches((prev) =>
      prev.map((m) => {
        if (m.id !== matchId) return m;
        if (m.scoreA == null || m.scoreB == null) {
          missingScore = true;
          return m;
        }
        const diff = Math.abs((m.scoreA || 0) - (m.scoreB || 0));
        const maxScore = Math.max(m.scoreA || 0, m.scoreB || 0);
        if (maxScore < 21 || diff < 2) {
          invalidScore = true;
          return m;
        }
        return {
          ...m,
          status: 'Completed',
          winnerTeamId: (m.scoreA || 0) > (m.scoreB || 0) ? m.teamAId : m.teamBId,
        };
      })
    );
    if (missingScore) t.setError('Enter both scores before finalizing.');
    else if (invalidScore) t.setError('Complete requires badminton rule: 21+ and 2-point lead.');
    else t.setError('');
  }

  function handleResetGroupMatch(matchId) {
    if (typeof t.resetMatch === 'function') {
      t.resetMatch(matchId);
      return;
    }
    t.setGroupMatches((prev) =>
      prev.map((m) =>
        m.id === matchId
          ? { ...m, scoreA: null, scoreB: null, status: 'Pending' }
          : m
      )
    );
    t.setError('');
  }

  async function handleGenerateSemis(options = {}) {
    const { auto = false } = options;
    if (t.mode === 'group') {
      if (!auto) t.setError('Semifinals are not applicable for group-only tournaments.');
      return;
    }
    if (typeof t.generateSemis === 'function') {
      t.generateSemis();
      return;
    }

    const standingsByPool = t.poolStandings || {};
    const pools = t.pools || [];
    if (pools.length === 0) {
      t.setError('Create groups and complete matches before generating semifinals.');
      return;
    }
    const allGroupCompleted =
      Array.isArray(t.groupMatches) &&
      t.groupMatches.length > 0 &&
      t.groupMatches.every((m) => m?.status === 'Completed');
    if (!allGroupCompleted) {
      t.setError('Complete all group matches before generating semifinals.');
      return;
    }

    let qualifiers = [];
    if (pools.length === 1) {
      const onlyPool = pools[0];
      const rows = standingsByPool[onlyPool.id] || [];
      qualifiers = rows.slice(0, 4).map((r) => r.teamId);
    } else {
      const ranked = pools.flatMap((p) => {
        const rows = standingsByPool[p.id] || [];
        return rows.slice(0, 2).map((r) => r.teamId);
      });
      qualifiers = ranked.slice(0, 4);
    }

    const unique = [...new Set(qualifiers)].filter(Boolean);
    if (unique.length < 4) {
      t.setError('Need 4 qualified teams to generate semifinals.');
      return;
    }

    const semis = [
      {
        id: `SF-1-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: 'Semifinal 1',
        round: 'Semifinal',
        teamAId: unique[0],
        teamBId: unique[3],
        scoreA: null,
        scoreB: null,
        status: 'Pending',
        winnerTeamId: null,
      },
      {
        id: `SF-2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: 'Semifinal 2',
        round: 'Semifinal',
        teamAId: unique[1],
        teamBId: unique[2],
        scoreA: null,
        scoreB: null,
        status: 'Pending',
        winnerTeamId: null,
      },
    ];

    t.setSemiMatches(semis);
    t.setFinalMatch(null);
    t.setStep(6);
    t.setError('');

    if (fixtureTournamentId) {
      try {
        const payload = {
          id: fixtureTournamentId,
          name: t.tournamentName || `Tournament ${new Date().toLocaleString()}`,
          mode: t.mode,
          eventDate: t.eventDate,
          numPools: t.numPools,
          membersPerGroup,
          groupGamesBetweenGroups,
          groupLevelPairings,
          pointSystem: getCurrentPointSystem(),
          players: t.players,
          teams: t.teams,
          pools: t.pools,
          groupMatches: t.groupMatches,
          semiMatches: semis,
          finalMatch: null,
          createdByMobile: getTournamentCreatorMobile(
            (tournamentsList || []).find((row) => row.id === fixtureTournamentId)
          ) || getCurrentUserMobileNormalized(),
          status: 'Live',
          created_at: new Date().toISOString(),
        };
        await updateTournament(fixtureTournamentId, payload);
        await refreshTournamentsList();
      } catch (e) {
        console.error(e);
        if (!auto) {
          t.setError(e?.message || 'Semifinals generated but failed to save tournament.');
        }
      }
    }
  }

  function buildFinalFromSemis(semis, currentFinal) {
    const winners = (semis || [])
      .filter((m) => m?.status === 'Completed' && m?.winnerTeamId)
      .sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)))
      .map((m) => m.winnerTeamId);

    if (winners.length < 2) return null;
    const teamAId = winners[0];
    const teamBId = winners[1];
    if (!teamAId || !teamBId) return null;

    if (
      currentFinal &&
      ((currentFinal.teamAId === teamAId && currentFinal.teamBId === teamBId) ||
        (currentFinal.teamAId === teamBId && currentFinal.teamBId === teamAId))
    ) {
      return currentFinal;
    }

    return {
      id: `F-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: 'Final',
      round: 'Final',
      teamAId,
      teamBId,
      scoreA: null,
      scoreB: null,
      status: 'Pending',
      winnerTeamId: null,
    };
  }

  function handleKoScoreChange(matchId, scoreA, scoreB, stage, changedField) {
    const normalize = (v) => {
      if (v === '' || v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const decideOutcome = (a, b, teamAId, teamBId) => {
      if (a == null || b == null) return { status: 'Pending', winnerTeamId: null };
      const diff = Math.abs(a - b);
      const maxScore = Math.max(a, b);
      if (maxScore >= 21 && diff >= 2) {
        return {
          status: 'Completed',
          winnerTeamId: a > b ? teamAId : teamBId,
        };
      }
      return { status: 'Pending', winnerTeamId: null };
    };

    if (stage === 'semi') {
      t.setSemiMatches((prev) => {
        const next = prev.map((m) => {
          if (m.id !== matchId) return m;
          const nextA =
            changedField === 'B'
              ? m.scoreA
              : changedField === 'A'
                ? normalize(scoreA)
                : normalize(scoreA);
          const nextB =
            changedField === 'A'
              ? m.scoreB
              : changedField === 'B'
                ? normalize(scoreB)
                : normalize(scoreB);
          const outcome = decideOutcome(nextA, nextB, m.teamAId, m.teamBId);
          return {
            ...m,
            scoreA: nextA,
            scoreB: nextB,
            winnerTeamId: outcome.winnerTeamId,
            status: outcome.status,
          };
        });
        const nextFinal = buildFinalFromSemis(next, t.finalMatch);
        if (nextFinal) t.setFinalMatch(nextFinal);
        void persistFixtureTournamentState(
          {
            semiMatches: next,
            finalMatch: nextFinal || t.finalMatch,
          },
          { silent: true }
        );
        return next;
      });
      return;
    }

    if (stage === 'final' && t.finalMatch?.id === matchId) {
      t.setFinalMatch((prev) => {
        if (!prev) return prev;
        const nextA =
          changedField === 'B'
            ? prev.scoreA
            : changedField === 'A'
              ? normalize(scoreA)
              : normalize(scoreA);
        const nextB =
          changedField === 'A'
            ? prev.scoreB
            : changedField === 'B'
              ? normalize(scoreB)
              : normalize(scoreB);
        const outcome = decideOutcome(nextA, nextB, prev.teamAId, prev.teamBId);
        const nextFinal = {
          ...prev,
          scoreA: nextA,
          scoreB: nextB,
          winnerTeamId: outcome.winnerTeamId,
          status: outcome.status,
        };
        void persistFixtureTournamentState({ finalMatch: nextFinal }, { silent: true });
        return nextFinal;
      });
    }
  }

  function handleFinalizeKoMatch(matchId, stage) {
    if (stage === 'semi') {
      t.setSemiMatches((prev) => {
        const next = prev.map((m) => {
          if (m.id !== matchId) return m;
          if (m.scoreA == null || m.scoreB == null) return m;
          const diff = Math.abs((m.scoreA || 0) - (m.scoreB || 0));
          const maxScore = Math.max(m.scoreA || 0, m.scoreB || 0);
          if (maxScore < 21 || diff < 2) return m;
          return {
            ...m,
            winnerTeamId: m.scoreA > m.scoreB ? m.teamAId : m.teamBId,
            status: 'Completed',
          };
        });
        const nextFinal = buildFinalFromSemis(next, t.finalMatch);
        if (nextFinal) t.setFinalMatch(nextFinal);
        return next;
      });
      return;
    }

    if (stage === 'final') {
      t.setFinalMatch((prev) => {
        if (!prev) return prev;
        if (prev.scoreA == null || prev.scoreB == null) return prev;
        const diff = Math.abs((prev.scoreA || 0) - (prev.scoreB || 0));
        const maxScore = Math.max(prev.scoreA || 0, prev.scoreB || 0);
        if (maxScore < 21 || diff < 2) return prev;
        return {
          ...prev,
          winnerTeamId: prev.scoreA > prev.scoreB ? prev.teamAId : prev.teamBId,
          status: 'Completed',
        };
      });
    }
  }

  useEffect(() => {
    if (activeMenu !== 'fixture') return;
    if (t.mode === 'group') return;
    if (!Array.isArray(t.groupMatches) || t.groupMatches.length === 0) return;
    if (Array.isArray(t.semiMatches) && t.semiMatches.length > 0) return;
    const allCompleted = t.groupMatches.every((m) => m?.status === 'Completed');
    if (!allCompleted) return;
    if (autoSemisInProgressRef.current) return;

    autoSemisInProgressRef.current = true;
    Promise.resolve(handleGenerateSemis({ auto: true })).finally(() => {
      autoSemisInProgressRef.current = false;
    });
  }, [activeMenu, t.groupMatches, t.semiMatches]);

  function goToPreviousStep() {
    if (t.mode === 'group' && t.step === 4) {
      t.setStep(2);
      return;
    }
    t.setStep((s) => Math.max(1, s - 1));
  }

  function getStepValidationMessage(stepNo) {
    if (stepNo === 1) {
      if (!String(t.tournamentName || '').trim()) return 'Please enter a tournament name.';
      if (!t.eventDate) return 'Please choose an event date.';
      if (!Number.isInteger(Number(t.numPools)) || Number(t.numPools) < 1) {
        return 'Number of groups/pools must be at least 1.';
      }
      if (t.mode === 'group') {
        if (!Number.isInteger(Number(membersPerGroup)) || Number(membersPerGroup) < 2) {
          return 'Members in each group must be at least 2.';
        }
        if (!Number.isInteger(Number(groupGamesBetweenGroups)) || Number(groupGamesBetweenGroups) < 1) {
          return 'Number of matches between groups must be at least 1.';
        }
        const requiredNames = Array.from(
          { length: Math.max(1, Number(t.numPools) || 1) },
          (_, i) => String(groupNames[i] || '').trim()
        );
        if (requiredNames.some((name) => !name)) return 'Please provide names for all groups.';
        if (!isValidGroupLevelPairings()) {
          return 'Choose non-repeating valid level combinations for matches between groups.';
        }
        if (
          Number(winnerTeamPoint) < 0 ||
          Number(winnerBonusOppScoreLessThan) < 0 ||
          Number(winnerBonusPoint) < 0 ||
          Number(loserBonusScoreGreaterThan) < 0 ||
          Number(loserBonusPoint) < 0
        ) {
          return 'Point system values cannot be negative.';
        }
      }
      return '';
    }
    if (stepNo === 2) {
      const playerCount = Array.isArray(t.players) ? t.players.length : 0;
      if (playerCount < 1) return 'Please choose players before going to next step.';
      if (t.mode === 'doubles' && playerCount < 4) return 'Doubles format needs at least 4 players.';
      if (t.mode === 'group') {
        const required = Math.max(1, Number(t.numPools) || 1) * Math.max(2, Number(membersPerGroup) || 2);
        if (playerCount < required) {
          return `Please choose at least ${required} players (${t.numPools} groups × ${membersPerGroup} players).`;
        }
      }
      if ((t.mode === 'group' || t.mode === 'singles') && playerCount < 2) {
        return 'Group format needs at least 2 players.';
      }
      return '';
    }
    if (stepNo === 3) {
      const teamCount = Array.isArray(t.teams) ? t.teams.length : 0;
      if (teamCount < 2) return 'Please create at least 2 teams before going to next step.';
      return '';
    }
    if (stepNo === 4) {
      const teamCount = Array.isArray(t.teams) ? t.teams.length : 0;
      if (teamCount < 2) return 'At least 2 teams are required to generate fixtures.';
      const usedIds = (t.teams || []).flatMap((tm) => tm.players || []);
      const uniqueCount = new Set(usedIds).size;
      if (uniqueCount !== usedIds.length) {
        return 'Same player cannot be assigned more than once across groups.';
      }
      if (!Array.isArray(t.pools) || t.pools.length === 0) {
        return 'Please auto-assign groups before going to next step.';
      }
      if (!Array.isArray(t.groupMatches) || t.groupMatches.length === 0) {
        return 'Please create fixtures before going to next step.';
      }
      return '';
    }
    if (stepNo === 5) {
      if (!Array.isArray(t.groupMatches) || t.groupMatches.length === 0) {
        return 'No group matches found. Please create fixtures first.';
      }
      const pending = t.groupMatches.filter((m) => m?.status !== 'Completed').length;
      if (pending > 0) {
        return `Complete all group matches before proceeding. Pending: ${pending}.`;
      }
      return '';
    }
    return '';
  }

  function validateStep1() {
    const msg = getStepValidationMessage(1);
    if (msg) {
      t.setError(msg);
      return false;
    }
    return true;
  }

  function validateStep2() {
    const msg = getStepValidationMessage(2);
    if (msg) {
      t.setError(msg);
      return false;
    }
    return true;
  }

  function validateStep3() {
    const msg = getStepValidationMessage(3);
    if (msg) {
      t.setError(msg);
      return false;
    }
    return true;
  }

  function validateStep4() {
    const msg = getStepValidationMessage(4);
    if (msg) {
      t.setError(msg);
      return false;
    }
    return true;
  }

  function validateStep5() {
    const msg = getStepValidationMessage(5);
    if (msg) {
      t.setError(msg);
      return false;
    }
    return true;
  }

  useEffect(() => {
    if (!t.error) return;
    const currentMsg = getStepValidationMessage(t.step);
    if (!currentMsg) t.setError('');
  }, [
    t.error,
    t.step,
    t.tournamentName,
    t.eventDate,
    t.numPools,
    t.mode,
    t.players,
    t.teams,
    t.pools,
    t.groupMatches,
    membersPerGroup,
    groupNames,
    groupGamesBetweenGroups,
    groupLevelPairings,
    winnerTeamPoint,
    winnerBonusOppScoreLessThan,
    winnerBonusPoint,
    loserBonusScoreGreaterThan,
    loserBonusPoint,
  ]);

  useEffect(() => {
    const hasMessage = Boolean(t.error || tournamentsError || saveNotice);
    if (!hasMessage) return;
    if (messageTopRef.current?.scrollIntoView) {
      messageTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [t.error, tournamentsError, saveNotice]);

  function goToNextStep() {
    t.setError('');
    if (t.step === 1) {
      if (!validateStep1()) return;
      t.setStep(2);
      return;
    }
    if (t.step === 2) {
      if (!validateStep2()) return;
      if (t.mode === 'group' || t.mode === 'singles') {
        try {
          const ok = handleAutoCreateGroupMembers();
          if (!ok) return;
        } catch (e) {
          console.error(e);
          t.setError(e?.message || 'Unable to create group teams.');
          return;
        }
        t.setStep(4);
      } else t.setStep(3);
      return;
    }
    if (t.step === 3) {
      if (!validateStep3()) return;
      t.setStep(4);
      return;
    }
    if (t.step === 4) {
      if (!validateStep4()) return;
      t.setStep(5);
      return;
    }
    if (t.step === 5) {
      if (!validateStep5()) return;
      if (t.mode === 'group') {
        if (fixtureTournamentId) {
          void persistFixtureTournamentState({
            status: 'Completed',
            winnerTeamId: getGroupWinnerTeamId({
              mode: t.mode,
              pools: t.pools,
              teams: t.teams,
              groupMatches: t.groupMatches,
            }),
          });
        }
        setActiveMenu('tournaments');
        setTournamentView('list');
        refreshTournamentsList();
      } else if (t.semiMatches?.length > 0) t.setStep(6);
      else handleGenerateSemis();
      return;
    }
    if (t.step === 6) {
      const finalDone = t.finalMatch?.status === 'Completed';
      if (!finalDone) {
        t.setError('Complete the final match to finish.');
        return;
      }
      setActiveMenu('tournaments');
      setTournamentView('list');
      refreshTournamentsList();
      return;
    }
  }

  const nextLabel =
    t.step === 5
      ? t.mode === 'group'
        ? 'Done'
        : t.semiMatches?.length > 0
        ? 'Next: Knockouts'
        : 'Generate Semifinals'
      : t.step === 6
        ? t.finalMatch?.status === 'Completed'
          ? 'Done'
          : 'Finish Final'
        : 'Next';

  const fixtureStandings = computeStandings(
    t.pools || [],
    t.teams || [],
    t.groupMatches || [],
    getCurrentPointSystem()
  );
  const fixtureGroupPointRows = (t.pools || []).map((p, idx) => {
    const rows = fixtureStandings[p.id] || [];
    return {
      groupId: p.id,
      groupName: p.name || groupNames[idx] || `Group ${idx + 1}`,
      points: rows.reduce((sum, r) => sum + Number(r?.points || 0), 0),
      played: rows.reduce((sum, r) => sum + Number(r?.played || 0), 0),
      won: rows.reduce((sum, r) => sum + Number(r?.won || 0), 0),
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    if (a.played !== b.played) return a.played - b.played;
    return a.groupName.localeCompare(b.groupName);
  });
  const homeWelcomeName =
    String(profilePlayer?.name || '').trim() ||
    String(getLoggedInPlayerFromList()?.name || '').trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-cyan-50 to-indigo-100 text-slate-900">
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
          setFixtureTournamentId(null);
          setSelectedTournament(null);
          setSelectedMatchRef(null);
          setTournamentView('list');
          t.setError('');
          t.setStep(1);
          setActiveMenu('fixture');
        }}
        onPlayer={() => {
          setMenuOpen(false);
          setActiveMenu('players');
        }}
        onSkillLevel={() => {
          setMenuOpen(false);
          setActiveMenu('skill-level');
        }}
        onPredictions={() => {
          setMenuOpen(false);
          setActiveMenu('predictions');
        }}
        onProfile={() => {
          setMenuOpen(false);
          setActiveMenu('profile');
        }}
        onTournaments={() => {
          setMenuOpen(false);
          setSelectedTournament(null);
          setSelectedMatchRef(null);
          setTournamentView('list');
          setActiveMenu('tournaments');
        }}
        onAuth={handleAuthMenu}
      />

      {/* Main */}
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-32 sm:pb-28">
        <div ref={messageTopRef} />
        {!isLoggedIn ? (
          <LoginScreen
            onLogin={handleMobileOtpLogin}
            loading={authBusy}
            error={authError}
          />
        ) : activeMenu === 'home' ? (
          <HomeScreen
            welcomeName={homeWelcomeName}
            fixtureCount={t.groupMatches.length}
            teamCount={t.teams.length}
            playerCount={playersDbList.length}
            tournamentCount={tournamentsList.length}
            liveTournament={(tournamentsList || []).find((row) => row?.status === 'Live') || null}
            tournaments={tournamentsList}
            onOpenFixture={() => setActiveMenu('fixture')}
            onManagePlayers={() => setActiveMenu('players')}
            onBrowseTournaments={() => setActiveMenu('tournaments')}
            onOpenTournament={openTournamentDetailsFromHome}
          />
        ) : activeMenu === 'tournament' ? (
          <TournamentDetailsScreen
            tournament={selectedTournament}
            getTournamentMatches={getTournamentMatches}
            onBack={() => setActiveMenu('home')}
            onOpenMatches={() => {
              setActiveMenu('tournaments');
              setTournamentView('matches');
            }}
            onOpenPoints={() => {
              setActiveMenu('tournaments');
              setTournamentView('points');
            }}
            onTrackCurrentMatch={(ref) => {
              openMatchTracking(ref, 'open');
              setActiveMenu('tournaments');
            }}
          />
        ) : activeMenu === 'players' ? (
          <PlayersScreen
            players={playersDbList}
            loading={playersDbLoading}
            error={playersDbError}
            isAdmin={isAdminUser}
            onRefresh={refreshPlayersList}
            onAddPlayer={handleAddPlayerToDb}
            onUpdatePlayer={handleUpdatePlayerInDb}
            onDeletePlayer={handleDeletePlayerInDb}
            saving={playersDbSaving}
            updatingId={playersDbUpdatingId}
            deletingId={playersDbDeletingId}
          />
        ) : activeMenu === 'profile' ? (
          <ProfileScreen
            player={profilePlayer}
            loading={profileLoading}
            saving={profileSaving}
            error={profileError}
            onSave={saveMyProfile}
          />
        ) : activeMenu === 'skill-level' ? (
          <SkillLevelScreen
            players={playersDbList}
            currentPlayer={getLoggedInPlayerFromList(playersDbList)}
            loading={playersDbLoading}
            saving={skillSaving}
            applyingAverages={skillApplying}
            error={skillError}
            existingSuggestions={skillSuggestions}
            onSave={handleSaveSkillSuggestions}
            onApplyAverages={handleApplyAverageSkills}
            onRefresh={refreshSkillLevelData}
            isAdmin={isAdminUser}
            adminAverages={skillAverages}
            averagesLoading={skillAveragesLoading}
          />
        ) : activeMenu === 'predictions' ? (
          <PredictionsScreen
            tournaments={tournamentsList}
            loadingTournaments={tournamentsLoading}
            loadTournamentDetails={loadTournament}
            loadPrediction={loadMyPredictionForTournament}
            savePrediction={saveMyPrediction}
            busy={predictionSaving}
            error={predictionError}
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
            canDeleteTournament={canDeleteTournament}
            getTournamentCreatorName={getTournamentCreatorName}
            onOpenTournamentDetails={openTournamentDetailsFromHome}
            onOpenTournamentFixture={async (id) => {
              await t.loadTournamentById(id);
              setFixtureTournamentId(id);
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
            matchStatus={matchStatus}
            setMatchStatus={setMatchStatus}
            saveMatchTracking={saveMatchTracking}
            savingMatch={savingMatch}
            isAdminUser={isAdminUser}
          />
        ) : (
          <>
            {t.error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800">
                {t.error}
              </div>
            )}
            {tournamentsError && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                {tournamentsError}
              </div>
            )}
            {saveNotice && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                {saveNotice}
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
                    onChange={(e) => t.setNumPools(parseIntegerOrEmpty(e.target.value, 1))}
                    onBlur={() => {
                      if (t.numPools === '') t.setNumPools(1);
                    }}
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
                    onChange={(e) => setMembersPerGroup(parseIntegerOrEmpty(e.target.value, 2))}
                    onBlur={() => {
                      if (membersPerGroup === '') setMembersPerGroup(2);
                    }}
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

                <Card title="Matches Between Groups">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm mb-1">Number of Matches Between Each Group Pair</label>
                      <input
                        type="number"
                        min={1}
                        max={Math.max(1, Number(membersPerGroup || 2) ** 2)}
                        value={groupGamesBetweenGroups}
                        onChange={(e) => {
                          if (e.target.value === '') {
                            setGroupGamesBetweenGroups('');
                            return;
                          }
                          const maxAllowed = Math.max(1, Number(membersPerGroup || 2) ** 2);
                          const parsed = Number.parseInt(e.target.value, 10);
                          if (!Number.isFinite(parsed)) return;
                          setGroupGamesBetweenGroups(Math.max(1, Math.min(maxAllowed, parsed)));
                        }}
                        onBlur={() => {
                          if (groupGamesBetweenGroups === '') {
                            setGroupGamesBetweenGroups(1);
                          }
                        }}
                        className="w-32 px-3 py-2 border rounded-lg bg-white text-slate-900"
                      />
                    </div>
                    <div className="space-y-2">
                      {groupLevelPairings.map((row, idx) => (
                        <div
                          key={`pair-${idx}`}
                          className="grid grid-cols-[1fr_auto_1fr] items-center gap-2"
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={row.levelA1}
                              onChange={(e) => updateGroupPairing(idx, 'levelA1', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                            >
                              {Array.from({ length: Math.max(2, Number(membersPerGroup) || 2) }).map(
                                (_, lIdx) => (
                                  <option key={`a1-${idx}-${lIdx + 1}`} value={lIdx + 1}>
                                    L{lIdx + 1}
                                  </option>
                                )
                              )}
                            </select>
                            <select
                              value={row.levelA2}
                              onChange={(e) => updateGroupPairing(idx, 'levelA2', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                            >
                              {Array.from({ length: Math.max(2, Number(membersPerGroup) || 2) }).map(
                                (_, lIdx) => (
                                  <option key={`a2-${idx}-${lIdx + 1}`} value={lIdx + 1}>
                                    L{lIdx + 1}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                          <span className="text-sm text-slate-500">VS</span>
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={row.levelB1}
                              onChange={(e) => updateGroupPairing(idx, 'levelB1', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                            >
                              {Array.from({ length: Math.max(2, Number(membersPerGroup) || 2) }).map(
                                (_, lIdx) => (
                                  <option key={`b1-${idx}-${lIdx + 1}`} value={lIdx + 1}>
                                    L{lIdx + 1}
                                  </option>
                                )
                              )}
                            </select>
                            <select
                              value={row.levelB2}
                              onChange={(e) => updateGroupPairing(idx, 'levelB2', e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                            >
                              {Array.from({ length: Math.max(2, Number(membersPerGroup) || 2) }).map(
                                (_, lIdx) => (
                                  <option key={`b2-${idx}-${lIdx + 1}`} value={lIdx + 1}>
                                    L{lIdx + 1}
                                  </option>
                                )
                              )}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      Players in each group are ranked by skill as L1, L2, L3... Choose non-repeating
                      Lx vs Ly combinations.
                    </p>
                  </div>
                </Card>

                <Card title="Point System">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm mb-1">Winner Team Point</label>
                      <input
                        type="number"
                        min={0}
                        value={winnerTeamPoint}
                        onChange={(e) => setWinnerTeamPoint(parseNonNegativeOrEmpty(e.target.value))}
                        onBlur={() => {
                          if (winnerTeamPoint === '') setWinnerTeamPoint(0);
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                      />
                    </div>
                    <div />
                    <div>
                      <label className="block text-sm mb-1">
                        Winner Bonus: Opposite Team Score Less Than
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={winnerBonusOppScoreLessThan}
                        onChange={(e) =>
                          setWinnerBonusOppScoreLessThan(parseNonNegativeOrEmpty(e.target.value))
                        }
                        onBlur={() => {
                          if (winnerBonusOppScoreLessThan === '') setWinnerBonusOppScoreLessThan(0);
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Winner Bonus Point</label>
                      <input
                        type="number"
                        min={0}
                        value={winnerBonusPoint}
                        onChange={(e) => setWinnerBonusPoint(parseNonNegativeOrEmpty(e.target.value))}
                        onBlur={() => {
                          if (winnerBonusPoint === '') setWinnerBonusPoint(0);
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">
                        Loser Bonus: Score Greater Than
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={loserBonusScoreGreaterThan}
                        onChange={(e) =>
                          setLoserBonusScoreGreaterThan(parseNonNegativeOrEmpty(e.target.value))
                        }
                        onBlur={() => {
                          if (loserBonusScoreGreaterThan === '') setLoserBonusScoreGreaterThan(0);
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Loser Bonus Point</label>
                      <input
                        type="number"
                        min={0}
                        value={loserBonusPoint}
                        onChange={(e) => setLoserBonusPoint(parseNonNegativeOrEmpty(e.target.value))}
                        onBlur={() => {
                          if (loserBonusPoint === '') setLoserBonusPoint(0);
                        }}
                        className="w-full px-3 py-2 border rounded-lg bg-white text-slate-900"
                      />
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card title="Pool Settings (Doubles)">
                <input
                  type="number"
                  min={1}
                  value={t.numPools}
                  onChange={(e) => t.setNumPools(parseIntegerOrEmpty(e.target.value, 1))}
                  onBlur={() => {
                    if (t.numPools === '') t.setNumPools(1);
                  }}
                  className="w-32 px-3 py-2 border rounded-lg bg-white text-slate-900"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Configure how many pools you want before fixtures are generated.
                </p>
              </Card>
            )}

            <div className="sm:col-span-3 flex justify-end">
              <button className="btn-primary w-full sm:w-auto" onClick={goToNextStep}>
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
                <div className="mt-4">
                  <div className="space-y-2 sm:hidden">
                    {t.players.map((p, i) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {i + 1}. {p.name}
                            </p>
                            <p className="text-xs text-slate-500">Skill: {p.skill}</p>
                          </div>
                          <button
                            className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            onClick={() => t.removePlayer(p.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
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
                  onClick={handleAutoPairFromBuilder}
                >
                  Auto-pair (balanced)
                </button>
                <button
                  className="w-full sm:w-auto px-3 py-2 rounded-lg border hover:bg-slate-100"
                  onClick={handleShuffleTeamsFromBuilder}
                  disabled={t.teams.length < 2}
                >
                  Shuffle Teams
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
                              className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                              onClick={() => t.startEditTeam(tm.id)}
                              aria-label={`Edit ${tm.name}`}
                              title="Edit"
                            >
                              <EditIcon />
                            </button>
                            <button
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                              onClick={() => t.removeTeam(tm.id)}
                              aria-label={`Remove ${tm.name}`}
                              title="Remove"
                            >
                              <DeleteIcon />
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
                                className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                onClick={() => t.startEditTeam(tm.id)}
                                aria-label={`Edit ${tm.name}`}
                                title="Edit"
                              >
                                <EditIcon />
                              </button>
                              <button
                                className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                onClick={() => t.removeTeam(tm.id)}
                                aria-label={`Remove ${tm.name}`}
                                title="Remove"
                              >
                                <DeleteIcon />
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
                <button className="btn-primary w-full sm:w-auto" onClick={goToNextStep}>
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
                      <div className="flex flex-wrap gap-2">
                        {t.mode === 'group' && (
                          <button
                            className="px-3 py-2 rounded-lg border hover:bg-slate-100"
                            onClick={handleAutoCreateGroupMembers}
                          >
                            Auto Create Groups (Balanced)
                          </button>
                        )}
                        {t.mode !== 'group' && (
                          <button
                            className="px-3 py-2 rounded-lg border hover:bg-slate-100"
                            onClick={t.startBulkEdit}
                          >
                            Bulk Edit
                          </button>
                        )}
                      </div>
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

                  {t.bulkEditing && t.mode !== 'group' ? (
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
                    <>
                      {t.mode === 'group' ? (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {t.pools.map((pool, idx) => {
                            const poolLabel = groupNames[idx] || `Group ${pool.name}`;
                            const usedPlayerIds = new Set(
                              (t.teams || []).flatMap((tm) => tm.players || [])
                            );
                            const availablePlayers = (t.players || []).filter(
                              (p) => !usedPlayerIds.has(p.id)
                            );
                            return (
                              <div key={pool.id} className="rounded-xl border p-3 bg-white space-y-2">
                                <div className="font-semibold">{poolLabel}</div>
                                <div className="space-y-2">
                                  {(pool.teamIds || []).map((teamId, memberIdx) => {
                                    const team = t.teamsById[teamId];
                                    if (!team) return null;
                                    const currentPlayerId = team.players?.[0] || '';
                                    const usedByOthers = new Set(
                                      (t.teams || [])
                                        .filter((tm) => tm.id !== team.id)
                                        .flatMap((tm) => tm.players || [])
                                    );
                                    const options = (t.players || []).filter(
                                      (p) => p.id === currentPlayerId || !usedByOthers.has(p.id)
                                    );
                                    return (
                                      <div key={team.id} className="grid grid-cols-[1fr_auto] gap-2 items-center">
                                        <select
                                          value={currentPlayerId}
                                          onChange={(e) =>
                                            handleChangeGroupMember(team.id, e.target.value)
                                          }
                                          className="w-full px-2 py-1.5 border rounded-lg bg-white text-sm"
                                        >
                                          {options.map((p) => (
                                            <option key={p.id} value={p.id}>
                                              L{memberIdx + 1}: {p.name} (S{p.skill})
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                          onClick={() => handleDeleteGroupMember(team.id)}
                                          title="Remove player from group"
                                          aria-label="Remove player from group"
                                        >
                                          <DeleteIcon />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="grid grid-cols-[1fr_auto] gap-2 items-center pt-1 border-t">
                                  <select
                                    value={groupAddSelections[pool.id] || ''}
                                    onChange={(e) =>
                                      setGroupAddSelections((prev) => ({
                                        ...prev,
                                        [pool.id]: e.target.value,
                                      }))
                                    }
                                    className="w-full px-2 py-1.5 border rounded-lg bg-white text-sm"
                                  >
                                    <option value="">Add player...</option>
                                    {availablePlayers.map((p) => (
                                      <option key={p.id} value={p.id}>
                                        {p.name} (S{p.skill})
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className="px-2.5 py-1.5 rounded-lg border text-sm hover:bg-slate-100 disabled:opacity-50"
                                    onClick={() =>
                                      handleAddGroupMember(pool.id, groupAddSelections[pool.id] || '')
                                    }
                                    disabled={!groupAddSelections[pool.id]}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
                                      className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                                      onClick={() => t.startEditTeam(tm.id)}
                                      aria-label={`Edit ${tm.name}`}
                                      title="Edit"
                                    >
                                      <EditIcon />
                                    </button>
                                    <button
                                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                                      onClick={() => t.removeTeam(tm.id)}
                                      aria-label={`Remove ${tm.name}`}
                                      title="Remove"
                                    >
                                      <DeleteIcon />
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
                    onChange={(e) => t.setNumPools(parseIntegerOrEmpty(e.target.value, 1))}
                    onBlur={() => {
                      if (t.numPools === '') t.setNumPools(1);
                    }}
                    className="w-full sm:w-28 px-3 py-2 border rounded-lg bg-white text-slate-900"
                  />
                </div>
                <button
                  className="btn-primary w-full sm:w-auto"
                  onClick={handleAutoAssignGroupsAndFixtures}
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
                  onScoreChange={handleGroupScoreChange}
                  onFinalize={handleFinalizeGroupMatch}
                  onReset={handleResetGroupMatch}
                />

                <div className="rounded-xl border p-4 bg-white mt-6">
                  <div className="font-semibold mb-2">Group Points</div>
                  <div className="sm:hidden space-y-2">
                    {fixtureGroupPointRows.map((row) => (
                      <div key={row.groupId} className="rounded-lg border p-2.5">
                        <div className="font-medium text-sm">{row.groupName}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          Pts: {row.points} | Played: {row.played} | Won: {row.won}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500">
                          <th className="py-2 pr-2">Group</th>
                          <th className="py-2">Points</th>
                          <th className="py-2">Played</th>
                          <th className="py-2">Won</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fixtureGroupPointRows.map((row) => (
                          <tr key={row.groupId} className="border-t">
                            <td className="py-2 pr-2">{row.groupName}</td>
                            <td className="py-2">{row.points}</td>
                            <td className="py-2">{row.played}</td>
                            <td className="py-2">{row.won}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
                  {t.mode !== 'group' && (
                    <div className="text-sm text-slate-500">
                      Qualifiers:{' '}
                      {t.pools.length === 1 ? 'top 4 overall' : 'top 2 each group'}{' '}
                      → {t.qualifiers.length}
                    </div>
                  )}
                  {t.mode !== 'group' && t.semiMatches.length === 0 && (
                    <button className="btn-primary w-full sm:w-auto" onClick={handleGenerateSemis}>
                      Generate Semifinals
                    </button>
                  )}
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
                onScoreChange={handleGroupScoreChange}
                onFinalize={handleFinalizeGroupMatch}
                onReset={handleResetGroupMatch}
                canResetCompletedMatches={isAdminUser}
              />

              <div className="rounded-xl border p-4 bg-white mt-6">
                <div className="font-semibold mb-2">Group Points</div>
                <div className="sm:hidden space-y-2">
                  {fixtureGroupPointRows.map((row) => (
                    <div key={row.groupId} className="rounded-lg border p-2.5">
                      <div className="font-medium text-sm">{row.groupName}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Pts: {row.points} | Played: {row.played} | Won: {row.won}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2 pr-2">Group</th>
                        <th className="py-2">Points</th>
                        <th className="py-2">Played</th>
                        <th className="py-2">Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixtureGroupPointRows.map((row) => (
                        <tr key={row.groupId} className="border-t">
                          <td className="py-2 pr-2">{row.groupName}</td>
                          <td className="py-2">{row.points}</td>
                          <td className="py-2">{row.played}</td>
                          <td className="py-2">{row.won}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
                {t.mode !== 'group' && (
                  <div className="text-sm text-slate-500">
                    Qualifiers:{' '}
                    {t.pools.length === 1 ? 'top 4 overall' : 'top 2 each group'} →{' '}
                    {t.qualifiers.length}
                  </div>
                )}
                {t.mode !== 'group' && t.semiMatches.length === 0 &&
                  t.groupMatches.length > 0 &&
                  t.groupMatches.every((m) => m?.status === 'Completed') && (
                  <button className="btn-primary w-full sm:w-auto" onClick={handleGenerateSemis}>
                    Generate Semifinals
                  </button>
                )}
              </div>
            </Card>
          </section>
            )}

            {/* Step 6: Knockouts */}
            {t.step === 6 && (
          <section className="mt-6 grid gap-6">
            <Card title="Knockout Matches">
              {!(
                t.groupMatches.length > 0 && t.groupMatches.every((m) => m?.status === 'Completed')
              ) ? (
                <p className="text-sm text-slate-500">
                  Knockout matches will be available after all group matches are completed.
                </p>
              ) : t.semiMatches.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No semifinals generated yet.
                </p>
              ) : (
                <MatchesTable
                  matches={[...(t.semiMatches || []), ...(t.finalMatch ? [t.finalMatch] : [])]}
                  teamsById={t.teamsById}
                  poolsById={{}}
                  onScoreChange={(mid, a, b, changedField) =>
                    handleKoScoreChange(
                      mid,
                      a,
                      b,
                      t.finalMatch?.id === mid ? 'final' : 'semi',
                      changedField
                    )
                  }
                  onFinalize={(mid) =>
                    handleFinalizeKoMatch(mid, t.finalMatch?.id === mid ? 'final' : 'semi')
                  }
                  onReset={(mid) =>
                    t.finalMatch?.id === mid
                      ? t.setFinalMatch({
                          ...t.finalMatch,
                          scoreA: null,
                          scoreB: null,
                          winnerTeamId: null,
                          status: 'Pending',
                        })
                      : t.setSemiMatches((ms) =>
                          ms.map((m) =>
                            m.id === mid
                              ? {
                                  ...m,
                                  scoreA: null,
                                  scoreB: null,
                                  winnerTeamId: null,
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
                        handleKoScoreChange(
                          t.finalMatch.id,
                          v,
                          t.finalMatch.scoreB,
                          'final',
                          'A'
                        )
                      }
                    />
                    <span className="text-slate-500">-</span>
                    <ScoreInput
                      value={t.finalMatch.scoreB}
                      onChange={(v) =>
                        handleKoScoreChange(
                          t.finalMatch.id,
                          t.finalMatch.scoreA,
                          v,
                          'final',
                          'B'
                        )
                      }
                    />
                    <div className="hidden sm:block grow" />
                    <button
                      className="btn-primary w-full sm:w-auto"
                      onClick={() => handleFinalizeKoMatch(t.finalMatch.id, 'final')}
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
              <div className="ml-auto w-full sm:w-auto rounded-xl border bg-white/95 backdrop-blur px-3 py-3 shadow-lg flex flex-wrap sm:flex-nowrap justify-end gap-2">
                <button
                  className="flex-1 sm:flex-none min-w-0 sm:min-w-28 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium text-sm sm:text-base hover:bg-slate-100"
                  onClick={saveCurrentAsTournament}
                >
                  Save
                </button>
                <button
                className="flex-1 sm:flex-none min-w-0 sm:min-w-28 px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium text-sm sm:text-base hover:bg-slate-100 disabled:opacity-50"
                onClick={goToPreviousStep}
                disabled={t.step <= 1}
              >
                Previous
              </button>
              <button
                className="btn-primary flex-1 sm:flex-none min-w-0 sm:min-w-28 w-full sm:w-auto ml-0 sm:ml-1 text-sm sm:text-base"
                onClick={goToNextStep}
                disabled={t.step > 6}
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

      <footer className="max-w-6xl mx-auto px-3 sm:px-4 py-8 sm:py-10 text-xs text-slate-500 text-center">
        Powered by Whitefeather
      </footer>

      <style>{`
        .btn-primary {
          padding: 0.55rem 1rem;
          border-radius: 0.9rem;
          border: 1px solid #9fdcc9;
          background: linear-gradient(135deg, #dff7ef 0%, #c7f1e4 55%, #b3ead9 100%);
          color: #0f3d2f;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(15, 118, 110, 0.12);
          transition: transform 150ms ease, filter 150ms ease, box-shadow 150ms ease;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          filter: brightness(1.02);
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
        }
        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}
