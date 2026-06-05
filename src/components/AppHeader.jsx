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
  onProfile,
  onScoreboard,
  onTournaments,
  onAuth,
}) {
  const [logoBroken, setLogoBroken] = useState(false);

  return (
    <header
      className="sticky top-0 z-20 bg-white/85 dark:bg-navy-900/85 backdrop-blur border-b border-slate-200/80"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5">
        <div className="rounded-2xl border border-navy-700 bg-gradient-to-r from-navy-800 to-navy-900 px-3 py-2.5 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-start gap-1">
              <span className="shrink-0">
                {logoBroken ? (
                  <span className="text-3xl sm:text-4xl leading-none">🏸</span>
                ) : (
                  <span className="inline-flex h-11 w-11 sm:h-14 sm:w-14 rounded-full overflow-hidden">
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
                <h1 className="text-xl sm:text-2xl font-bold leading-tight text-white truncate">
                  Whitefeather
                </h1>
                <div className="text-[11px] sm:text-xs text-gold-300 mt-0.5">
                  Badminton Club
                </div>
              </div>
            </div>

            {isLoggedIn && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  className="h-11 w-11 rounded-xl border border-white/25 bg-white/10 dark:bg-navy-900/10 text-white hover:bg-white/20 text-lg leading-none shadow-sm"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                >
                  ☰
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 shadow-lg z-50 overflow-hidden backdrop-blur">
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100"
                      onClick={onHome}
                    >
                      Home
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
                      onClick={onFixture}
                    >
                      Create Tournament
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
                      onClick={onPlayer}
                    >
                      Players
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
                      onClick={onSkillLevel}
                    >
                      Skill Level
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
                      onClick={onPredictions}
                    >
                      Predictions
                    </button>
                    <button
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
                      onClick={onProfile}
                    >
                      My Profile
                    </button>
                    {isAdmin && (
                      <button
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
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
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t disabled:opacity-60"
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
