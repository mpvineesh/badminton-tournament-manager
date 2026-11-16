import React from 'react';
import './TournamentMatchesList.css';

// "All Matches" view for a tournament. Cards follow the SMASHPICKS fixture
// cards (match number, pairing pill, team over players, score in the middle)
// and keep the quick-score and live-scoring actions underneath.

const STAGE_ORDER = ['Group', 'Semifinal', 'Final'];
const STAGE_LABELS = { Group: 'Group Stage', Semifinal: 'Semifinals', Final: 'Final' };

function statusChip(status) {
  if (status === 'Completed') return { label: 'FINAL', className: 'is-final' };
  if (status === 'Live') return { label: 'LIVE', className: 'is-live' };
  return { label: 'UPCOMING', className: '' };
}

function splitLabel(label, fallback) {
  const text = String(label || '').trim();
  const pair = text.match(/pair\s+([A-Z]{1,3})\b/i);
  const title = text.replace(/\s*[·|-]?\s*pair\s+[A-Z]{1,3}\b/i, '').trim();
  return { title: title || fallback, pairing: pair ? pair[1].toUpperCase() : '' };
}

function describeSide(match, side, teamsById, playersById) {
  const team = teamsById[match?.[`team${side}Id`] || ''];
  const display = String(match?.[`team${side}Display`] || '').trim();
  const explicitIds = match?.[`team${side}PlayerIds`];
  // Name the players on court. A whole-roster team is only listed when it is a pair.
  const ids = Array.isArray(explicitIds) && explicitIds.length
    ? explicitIds
    : (team?.players || []).length <= 2 ? team?.players || [] : [];
  const names = ids.map((id) => playersById[id]?.name).filter(Boolean).join(' & ');
  const teamName = String(team?.name || '').trim();
  const players = names || display;
  if (!teamName) return { teamName: '', players: players || 'TBD' };
  if (!players || players.toLowerCase() === teamName.toLowerCase()) return { teamName: '', players: teamName };
  return { teamName, players };
}

export default function TournamentMatchesList({
  tournament,
  matches,
  onBack,
  onOpenMatch,
  isScorable,
  getQuickScore,
  setQuickScore,
  onQuickSave,
  saving,
  canEditCompleted = false,
}) {
  const [teamId, setTeamId] = React.useState('all');
  // Key of the completed match whose score an admin is correcting, if any.
  const [editing, setEditing] = React.useState({ key: '', error: '' });
  const teams = Array.isArray(tournament?.teams) ? tournament.teams : [];
  const teamsById = React.useMemo(() => Object.fromEntries(teams.map((team) => [team.id, team])), [teams]);
  const playersById = React.useMemo(
    () => Object.fromEntries((tournament?.players || []).map((player) => [player.id, player])),
    [tournament]
  );

  React.useEffect(() => {
    setTeamId('all');
    setEditing({ key: '', error: '' });
  }, [tournament?.id]);

  const stopEditing = (match) => {
    // Drop the draft so the inputs show the saved score next time.
    setQuickScore(match, 'a', match.scoreA ?? '');
    setQuickScore(match, 'b', match.scoreB ?? '');
    setEditing({ key: '', error: '' });
  };
  const updateResult = async (match, key) => {
    const a = Number(getQuickScore(match, 'a'));
    const b = Number(getQuickScore(match, 'b'));
    const entered = [getQuickScore(match, 'a'), getQuickScore(match, 'b')].every((value) => value !== '' && value != null);
    // Same rule the scorer uses: a finished game reaches 21 with a two-point lead.
    if (!entered || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || Math.max(a, b) < 21 || Math.abs(a - b) < 2) {
      setEditing({ key, error: 'Enter a finished score: 21 or more for the winner, with a two-point lead.' });
      return;
    }
    await onQuickSave(match);
    setEditing({ key: '', error: '' });
  };
  const clearResult = async (match) => {
    if (!window.confirm('Clear this result? The match goes back to upcoming and the standings are recalculated.')) return;
    setQuickScore(match, 'a', '');
    setQuickScore(match, 'b', '');
    await onQuickSave(match, { a: '', b: '' });
    setEditing({ key: '', error: '' });
  };

  const all = Array.isArray(matches) ? matches : [];
  const visible = teamId === 'all'
    ? all
    : all.filter((match) => match.teamAId === teamId || match.teamBId === teamId);
  const completedCount = visible.filter((match) => match.status === 'Completed').length;
  const liveCount = visible.filter((match) => match.status === 'Live').length;
  const selectedTeam = teamsById[teamId];

  const grouped = visible.reduce((acc, match) => {
    (acc[match.stage] = acc[match.stage] || []).push(match);
    return acc;
  }, {});
  const stages = [
    ...STAGE_ORDER.filter((stage) => grouped[stage]),
    ...Object.keys(grouped).filter((stage) => !STAGE_ORDER.includes(stage)),
  ];

  let counter = 0;
  return (
    <div className="tm-matches">
      <div className="tm-matches-head">
        <div className="tm-matches-heading">
          <div className="tm-matches-eyebrow">{tournament?.name}</div>
          <h2>All matches</h2>
        </div>
        <div className="tm-matches-tools">
          {teams.length > 1 && all.length > 0 && (
            <label className="tm-matches-filter" aria-label="Filter matches by team">
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
                <option value="all">All teams</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn-ghost" onClick={onBack}>Back</button>
        </div>
      </div>

      {all.length === 0 ? (
        <div className="tm-matches-empty">
          <strong>No matches yet</strong>
          <span>Generate fixtures to see matches here.</span>
        </div>
      ) : (
        <>
          <div className="tm-matches-summary" role="status">
            <strong>{visible.length}</strong>
            <span>
              {visible.length === 1 ? 'match' : 'matches'}
              {selectedTeam ? ` for ${selectedTeam.name}` : ''}
              {liveCount > 0 ? ` · ${liveCount} live` : ''}
              {` · ${completedCount} completed`}
            </span>
          </div>

          {stages.map((stage) => (
            <section key={stage} className="tm-stage">
              {stages.length > 1 && (
                <div className="tm-stage-title">
                  {STAGE_LABELS[stage] || stage} <span>· {grouped[stage].length}</span>
                </div>
              )}
              <div className="tm-grid">
                {grouped[stage].map((match) => {
                  counter += 1;
                  const { title, pairing } = splitLabel(match.label, `Match ${String(counter).padStart(2, '0')}`);
                  const chip = statusChip(match.status);
                  const sideA = describeSide(match, 'A', teamsById, playersById);
                  const sideB = describeSide(match, 'B', teamsById, playersById);
                  const decided = match.status === 'Completed' && match.winnerTeamId;
                  const winnerA = decided && match.winnerTeamId === match.teamAId;
                  const winnerB = decided && match.winnerTeamId === match.teamBId;
                  const hasScore = match.scoreA != null && match.scoreB != null;
                  const scorable = isScorable(match.status);
                  const cardKey = `${match.stage}-${match.id}`;
                  const isEditing = !scorable && editing.key === cardKey;
                  const scoreInputs = (
                    <>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`${title}: first side score`}
                        value={getQuickScore(match, 'a')}
                        onChange={(event) => setQuickScore(match, 'a', event.target.value)}
                        placeholder="A"
                      />
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`${title}: second side score`}
                        value={getQuickScore(match, 'b')}
                        onChange={(event) => setQuickScore(match, 'b', event.target.value)}
                        placeholder="B"
                      />
                    </>
                  );
                  const renderSide = (side, isWinner) => (
                    <div className={`tm-team ${isWinner ? 'is-winner' : ''} ${decided && !isWinner ? 'is-loser' : ''}`}>
                      {(side.teamName || isWinner) && (
                        <span>{[side.teamName, isWinner ? 'WON' : ''].filter(Boolean).join(' · ')}</span>
                      )}
                      <strong>{side.players}</strong>
                    </div>
                  );
                  return (
                    <article className={`tm-card ${chip.className}`} key={cardKey}>
                      <div className="tm-card-title">
                        <span>
                          {title}
                          <span className={`tm-status ${chip.className}`}>
                            {match.status === 'Live' && <i aria-hidden="true" />}
                            {chip.label}
                          </span>
                        </span>
                        {pairing && <span className="tm-pairing">{pairing}</span>}
                      </div>
                      <div className="tm-teams">
                        {renderSide(sideA, winnerA)}
                        <span className={`tm-vs ${hasScore ? 'is-score' : ''}`}>
                          {hasScore ? `${match.scoreA}–${match.scoreB}` : 'VS'}
                        </span>
                        {renderSide(sideB, winnerB)}
                      </div>
                      {isEditing ? (
                        <div className="tm-actions is-editing">
                          {scoreInputs}
                          <button type="button" className="tm-open is-primary" onClick={() => updateResult(match, cardKey)} disabled={saving}>
                            {saving ? '…' : 'Update'}
                          </button>
                          <button type="button" onClick={() => clearResult(match)} disabled={saving}>Clear</button>
                          <button type="button" className="tm-cancel" aria-label="Cancel editing" onClick={() => stopEditing(match)} disabled={saving}>✕</button>
                          {editing.error && <div className="tm-error" role="alert">{editing.error}</div>}
                        </div>
                      ) : (
                        <div className="tm-actions">
                          {scorable && (
                            <>
                              {scoreInputs}
                              <button type="button" className="tm-save" onClick={() => onQuickSave(match)} disabled={saving}>
                                {saving ? '…' : 'Save'}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className={`tm-open ${scorable ? 'is-primary' : ''}`}
                            onClick={() => onOpenMatch(match)}
                          >
                            {scorable ? 'Live scoring' : 'View match'}
                          </button>
                          {!scorable && canEditCompleted && (
                            <button type="button" onClick={() => setEditing({ key: cardKey, error: '' })}>Edit score</button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
          {visible.length === 0 && (
            <div className="tm-matches-empty"><span>No matches for this team.</span></div>
          )}
        </>
      )}
    </div>
  );
}
