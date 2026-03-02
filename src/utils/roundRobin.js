export function roundRobin(teamIds) {
  const ids = [...teamIds];
  if (ids.length % 2 === 1) ids.push('BYE');
  const n = ids.length,
    half = n / 2,
    rounds = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < half; i++) {
      const a = ids[i],
        b = ids[n - 1 - i];
      if (a !== 'BYE' && b !== 'BYE') rounds.push([a, b]);
    }
    ids.splice(1, 0, ids.pop());
  }
  return rounds;
}
