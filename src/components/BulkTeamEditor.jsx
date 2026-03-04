import React from 'react';
import PlayerSelectInline from './PlayerSelectInline.jsx';
export default function BulkTeamEditor({
  teams,
  players,
  mode,
  rows,
  onChange,
}) {
  const getRowValue = (teamId, index) => {
    const row = rows?.[teamId];
    if (Array.isArray(row)) return row[index] || '';
    if (row && typeof row === 'object') {
      if (index === 0) return row.p1 || '';
      if (index === 1) return row.p2 || '';
    }
    return '';
  };

  return (
    <div className="rounded-lg border">
      <div className="space-y-3 p-3 sm:hidden">
        {teams.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-sm font-semibold text-slate-800">{t.name}</div>
            <div className="space-y-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Player 1</label>
                <PlayerSelectInline
                  players={players}
                  value={getRowValue(t.id, 0)}
                  onChange={(v) => onChange(t.id, 0, v)}
                />
              </div>
              {mode === 'doubles' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Player 2</label>
                  <PlayerSelectInline
                    players={players}
                    value={getRowValue(t.id, 1)}
                    onChange={(v) => onChange(t.id, 1, v)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="p-2">Team</th>
              {mode === 'doubles' && (
                <>
                  <th className="p-2">P1</th>
                  <th className="p-2">P2</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2">{t.name}</td>
                {mode === 'doubles' ? (
                  <>
                    <td className="p-2">
                      <PlayerSelectInline
                        players={players}
                        value={getRowValue(t.id, 0)}
                        onChange={(v) => onChange(t.id, 0, v)}
                      />
                    </td>
                    <td className="p-2">
                      <PlayerSelectInline
                        players={players}
                        value={getRowValue(t.id, 1)}
                        onChange={(v) => onChange(t.id, 1, v)}
                      />
                    </td>
                  </>
                ) : (
                  <td className="p-2">
                    <PlayerSelectInline
                      players={players}
                      value={getRowValue(t.id, 0)}
                      onChange={(v) => onChange(t.id, 0, v)}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
