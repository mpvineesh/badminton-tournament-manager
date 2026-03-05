import React from 'react';

export default function AppHeader({
  menuRef,
  menuOpen,
  setMenuOpen,
  authBusy,
  isLoggedIn,
  onHome,
  onFixture,
  onPlayer,
  onSkillLevel,
  onPredictions,
  onProfile,
  onTournaments,
  onAuth,
}) {
  return (
    <header className="sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5">
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-cyan-50/80 to-indigo-50/80 px-3 py-2.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-tight text-slate-900 truncate">
                <span className="mr-2">🏸</span>
                Tournament Manager
              </h1>
              <div className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Tournament & Fixture Companion
              </div>
            </div>

            {isLoggedIn && (
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  className="h-11 w-11 rounded-xl border border-slate-300 bg-white/90 hover:bg-white text-lg leading-none shadow-sm"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-label="Open menu"
                  aria-expanded={menuOpen}
                >
                  ☰
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white/95 shadow-lg z-50 overflow-hidden backdrop-blur">
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
