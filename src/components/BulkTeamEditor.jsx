import React from 'react';
import PlayerSelectInline from './PlayerSelectInline.jsx';
export default function BulkTeamEditor({
  teams,
  players,
  mode,
  rows,
  onChange,
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-[520px] w-full text-sm">
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
                      value={rows[t.id]?.p1 || ''}
                      onChange={(v) => onChange(t.id, 0, v)}
                    />
                  </td>
                  <td className="p-2">
                    <PlayerSelectInline
                      players={players}
                      value={rows[t.id]?.p2 || ''}
                      onChange={(v) => onChange(t.id, 1, v)}
                    />
                  </td>
                </>
              ) : (
                <td className="p-2">
                  <PlayerSelectInline
                    players={players}
                    value={rows[t.id]?.p1 || ''}
                    onChange={(v) => onChange(t.id, 0, v)}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
