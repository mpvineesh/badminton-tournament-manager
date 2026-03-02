import React from 'react';
export default function TeamBadge({ team, right }) {
  if (!team) return <span className="italic text-slate-400">TBD</span>;
  return (
    <div
      className={`flex ${
        right ? 'justify-end' : 'justify-start'
      } items-center gap-2`}
    >
      <div>{team.name}</div>
      <div className="text-xs text-slate-500">S{team.avgSkill}</div>
    </div>
  );
}
