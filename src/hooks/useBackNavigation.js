import { useEffect, useRef } from 'react';

// Maps the app's screen state (activeMenu / tournamentView / selected tournament)
// to URL paths and back, so the browser/PWA back button navigates between
// screens instead of exiting the app, and screens get shareable/deep-linkable
// URLs. Navigation itself stays driven by App state — this only mirrors it into
// window.history.

const MENU_TO_PATH = {
  home: '/',
  fixture: '/create',
  players: '/players',
  'player-stats': '/players/stats',
  profile: '/profile',
  'skill-level': '/skill',
  predictions: '/tournament-predictions',
  fixtures: '/fixtures',
  'team-predictions': '/predictions',
  scoreboard: '/scoreboard',
  tournaments: '/tournaments',
  login: '/login',
};

const keyOf = (nav) =>
  `${nav.activeMenu}|${nav.tournamentView || 'list'}|${nav.selectedTournamentId || ''}`;

export function navToPath(nav) {
  const tid = nav.selectedTournamentId;
  if (nav.activeMenu === 'tournament' && tid) return `/tournament/${tid}`;
  if (nav.activeMenu === 'tournament-settings' && tid) return `/tournament/${tid}/settings`;
  if (nav.activeMenu === 'tournaments' && tid) {
    if (nav.tournamentView === 'matches') return `/tournament/${tid}/matches`;
    if (nav.tournamentView === 'points') return `/tournament/${tid}/points`;
    if (nav.tournamentView === 'match') return `/tournament/${tid}/match`;
  }
  return MENU_TO_PATH[nav.activeMenu] || '/';
}

export function pathToNav(pathname) {
  const clean = (pathname || '/').replace(/\/+$/, '') || '/';
  if (clean === '/team-predictions') {
    return { activeMenu: 'team-predictions', tournamentView: 'list', selectedTournamentId: null };
  }
  const m = clean.match(/^\/tournament\/([^/]+)(?:\/(settings|matches|points|match))?$/);
  if (m) {
    const selectedTournamentId = m[1];
    switch (m[2]) {
      case 'settings':
        return { activeMenu: 'tournament-settings', tournamentView: 'list', selectedTournamentId };
      case 'matches':
        return { activeMenu: 'tournaments', tournamentView: 'matches', selectedTournamentId };
      case 'points':
        return { activeMenu: 'tournaments', tournamentView: 'points', selectedTournamentId };
      case 'match':
        return { activeMenu: 'tournaments', tournamentView: 'match', selectedTournamentId };
      default:
        return { activeMenu: 'tournament', tournamentView: 'list', selectedTournamentId };
    }
  }
  const found = Object.entries(MENU_TO_PATH).find(([, p]) => p === clean);
  if (found) return { activeMenu: found[0], tournamentView: 'list', selectedTournamentId: null };
  return null;
}

export function useBackNavigation({
  isLoggedIn,
  activeMenu,
  setActiveMenu,
  tournamentView,
  setTournamentView,
  selectedTournament,
  setSelectedTournament,
  loadTournament,
}) {
  const restoringRef = useRef(false);
  const lastKeyRef = useRef(null);
  const initedRef = useRef(false);
  const navRef = useRef(null);

  navRef.current = {
    activeMenu,
    tournamentView,
    selectedTournamentId: selectedTournament?.id || null,
  };

  // Reflect screen state into history. Coalesced via a microtask timer so a
  // multi-setState navigation (e.g. set tournament + set menu) produces one
  // history entry, not several.
  useEffect(() => {
    if (!isLoggedIn) return undefined;
    if (restoringRef.current) {
      restoringRef.current = false;
      lastKeyRef.current = keyOf(navRef.current);
      return undefined;
    }
    const timer = setTimeout(() => {
      const nav = navRef.current;
      const key = keyOf(nav);
      if (lastKeyRef.current === key) return;
      lastKeyRef.current = key;
      const path = navToPath(nav);
      const state = { appNav: nav };
      if (!initedRef.current) {
        initedRef.current = true;
        window.history.replaceState(state, '', path);
      } else {
        window.history.pushState(state, '', path);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isLoggedIn, activeMenu, tournamentView, selectedTournament]);

  // Browser back/forward -> restore the recorded screen state.
  useEffect(() => {
    async function onPop(event) {
      const nav = event.state?.appNav;
      if (!nav || !isLoggedIn) return;
      const tid = nav.selectedTournamentId || null;
      const needsTournament =
        tid && ['tournament', 'tournament-settings', 'tournaments'].includes(nav.activeMenu);
      let loaded;
      if (needsTournament && selectedTournament?.id !== tid) {
        try {
          loaded = await loadTournament(tid);
        } catch {
          loaded = undefined;
        }
      }
      // Apply together so React batches into a single render (one reflect pass).
      restoringRef.current = true;
      if (loaded !== undefined) setSelectedTournament(loaded);
      else if (!tid) setSelectedTournament(null);
      setTournamentView(nav.tournamentView || 'list');
      setActiveMenu(nav.activeMenu);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, selectedTournament]);
}
