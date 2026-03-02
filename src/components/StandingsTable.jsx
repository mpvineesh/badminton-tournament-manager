import React from 'react';
export default function StandingsTable({ rows, teamsById }) {
  if (!rows || !rows.length) return <div>No matches yet.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="py-2 pr-2">Rank</th>
            <th className="py-2 pr-2">Team</th>
            <th className="py-2">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.teamId} className="border-t">
              <td className="py-2 pr-2">{i + 1}</td>
              <td className="py-2 pr-2">{teamsById[r.teamId]?.name || r.teamId}</td>
              <td className="py-2">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
