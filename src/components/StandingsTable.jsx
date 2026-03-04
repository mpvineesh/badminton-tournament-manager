import React from 'react';
export default function StandingsTable({ rows, teamsById }) {
  if (!rows || !rows.length) return <div>No matches yet.</div>;
  const showKnockoutCols = rows.some(
    (r) => r.semiPoints != null || r.finalPoints != null || r.totalPoints != null
  );
  return (
    <div>
      <div className="sm:hidden space-y-2">
        {rows.map((r, i) => (
          <div key={r.teamId} className="rounded-lg border border-slate-200 p-2.5 bg-gradient-to-br from-white to-indigo-50/40">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-500">Rank #{i + 1}</div>
              <div className="text-xs font-semibold rounded-full border px-2 py-0.5">
                {showKnockoutCols ? r.totalPoints || 0 : r.points} pts
              </div>
            </div>
            <div className="mt-1 text-sm font-medium">
              {teamsById[r.teamId]?.name || r.teamId}
            </div>
            {showKnockoutCols && (
              <div className="mt-1 text-xs text-slate-500">
                Group: {r.points || 0} | SF: {r.semiPoints || 0} | Final: {r.finalPoints || 0}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden sm:block overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 bg-slate-50/80">
              <th className="py-2 pr-2">Rank</th>
              <th className="py-2 pr-2">Team</th>
              {showKnockoutCols ? (
                <>
                  <th className="py-2">Group</th>
                  <th className="py-2">SF</th>
                  <th className="py-2">Final</th>
                  <th className="py-2">Total</th>
                </>
              ) : (
                <th className="py-2">Pts</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.teamId} className="border-t">
                <td className="py-2 pr-2">{i + 1}</td>
                <td className="py-2 pr-2">{teamsById[r.teamId]?.name || r.teamId}</td>
                {showKnockoutCols ? (
                  <>
                    <td className="py-2">{r.points || 0}</td>
                    <td className="py-2">{r.semiPoints || 0}</td>
                    <td className="py-2">{r.finalPoints || 0}</td>
                    <td className="py-2 font-semibold">{r.totalPoints || 0}</td>
                  </>
                ) : (
                  <td className="py-2">{r.points}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
