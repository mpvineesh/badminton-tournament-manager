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
  onTournaments,
  onAuth,
}) {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
          🏸 Badminton Fixture Maker
        </h1>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          <button
            className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg border hover:bg-slate-100"
            onClick={onHome}
          >
            Home
          </button>
          <div className="relative" ref={menuRef}>
            <button
              className="px-3 py-1.5 rounded-lg border hover:bg-slate-100 text-lg leading-none"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              ☰
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl border bg-white shadow-lg z-20 overflow-hidden">
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
                  Fixture
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100 border-t"
                  onClick={onPlayer}
                >
                  Player
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
                  {authBusy ? 'Please wait…' : isLoggedIn ? 'Logout' : 'Login'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
