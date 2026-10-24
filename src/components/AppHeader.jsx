import React, { useState } from 'react';

export default function AppHeader({
  menuRef,
  menuOpen,
  setMenuOpen,
  authBusy,
  isLoggedIn,
  isAdmin,
  onHome,
  onFixture,
  onPlayer,
  onSkillLevel,
  onPredictions,
  onFixtures,
  onTeamPredictions,
  onProfile,
  onScoreboard,
  onTournaments,
  onAuth,
}) {
  const [logoBroken, setLogoBroken] = useState(false);

  return (
    <header
      className="app-theme-header sticky top-0 z-20 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="app-theme-header-shell max-w-6xl mx-auto px-3 sm:px-4 py-2.5">
        <div className="app-theme-header-brandbar rounded-2xl px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-start gap-1">
              <span className="shrink-0">
                {logoBroken ? (
                  <span className="app-theme-logo-fallback text-3xl sm:text-4xl leading-none">🏸</span>
                ) : (
                  <span className="app-theme-logo inline-flex h-11 w-11 sm:h-14 sm:w-14 rounded-full overflow-hidden">
                    <img
                      src="/logo.png"
                      alt="Tournament Manager logo"
                      className="h-full w-full object-cover scale-[1]"
                      onError={() => setLogoBroken(true)}
                    />
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <h1 className="app-theme-brand-title text-xl sm:text-2xl font-bold leading-tight truncate">
                  Whitefeather
                </h1>
                <div className="app-theme-brand-subtitle text-[11px] sm:text-xs mt-0.5">
                  Badminton Club
                </div>
              </div>
            </div>

            {isLoggedIn && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  className="app-theme-menu-button h-11 w-11 rounded-xl text-lg leading-none shadow-sm"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                >
                  ☰
                </button>
                {menuOpen && (
                  <div className="app-theme-menu absolute right-0 mt-2 w-56 rounded-xl shadow-lg z-50 overflow-hidden backdrop-blur">
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm"
                      onClick={onHome}
                    >
                      Home
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                      onClick={onFixture}
                    >
                      Create Tournament
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                      onClick={onPlayer}
                    >
                      Players
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                      onClick={onSkillLevel}
                    >
                      Skill Level
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                      onClick={onPredictions}
                    >
                      Predictions
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                      onClick={onFixtures}
                    >
                      Fixtures
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                      onClick={onTeamPredictions}
                    >
                      Team Match Picks
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                      onClick={onProfile}
                    >
                      My Profile
                    </button>
                    {isAdmin && (
                      <button
                        className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t"
                        onClick={onScoreboard}
                      >
                        Scoreboard
                      </button>
                    )}
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
                      onClick={onTournaments}
                    >
                      Tournaments
                    </button>
                    <button
                      className="app-theme-menu-item w-full text-left px-3 py-2 text-sm border-t disabled:opacity-60"
                      onClick={onAuth}
                      disabled={authBusy}
                    >
                      {authBusy ? 'Please wait…' : 'Logout'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
