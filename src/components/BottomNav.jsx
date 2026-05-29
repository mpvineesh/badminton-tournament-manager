import React from 'react';

function Icon({ name, className = 'h-6 w-6' }) {
  const common = { className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case 'tournaments':
      return (
        <svg {...common}>
          <path d="M8 21h8M12 17v4" />
          <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
          <path d="M5 5H3v2a3 3 0 0 0 3 3M19 5h2v2a3 3 0 0 1-3 3" />
        </svg>
      );
    case 'players':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
          <path d="M16 7a3 3 0 0 1 0 6M20.5 20a5.5 5.5 0 0 0-4-5.3" />
        </svg>
      );
    case 'scoreboard':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M9 9h2M13 9h2M9 13h6" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    default:
      return null;
  }
}

const TABS = [
  { key: 'home', label: 'Home', match: (m) => m === 'home' },
  {
    key: 'tournaments',
    label: 'Events',
    match: (m) => ['tournaments', 'tournament', 'tournament-settings', 'fixture'].includes(m),
  },
  { key: 'players', label: 'Players', match: (m) => ['players', 'player-stats'].includes(m) },
  { key: 'scoreboard', label: 'Live', match: (m) => m === 'scoreboard' },
  { key: 'profile', label: 'Profile', match: (m) => m === 'profile' },
];

export default function BottomNav({ activeMenu, onNavigate }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 dark:border-navy-700 bg-white/95 dark:bg-navy-900/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="mx-auto grid max-w-3xl grid-cols-5">
        {TABS.map((tab) => {
          const active = tab.match(activeMenu);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onNavigate(tab.key)}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
                active ? 'text-navy-800' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-gold-500" />
              )}
              <Icon name={tab.key} className={active ? 'h-6 w-6' : 'h-6 w-6'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
