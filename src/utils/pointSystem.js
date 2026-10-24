const nonNegative = (value) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

// An explicit empty list disables bonuses; older tournaments retain their single rule.
export function getWinnerBonusRules(pointSystem = {}) {
  const rules = Array.isArray(pointSystem?.winnerBonusRules)
    ? pointSystem.winnerBonusRules
    : [{ opponentScoreLessThan: pointSystem?.winnerBonusOppScoreLessThan ?? 0,
         points: pointSystem?.winnerBonusPoints ?? 0 }];
  return rules.map((rule) => ({
    opponentScoreLessThan: nonNegative(rule?.opponentScoreLessThan),
    points: nonNegative(rule?.points),
  }));
}

export function winnerBonusForScore(rules, loserScore) {
  return rules.reduce((bonus, rule) =>
    loserScore < rule.opponentScoreLessThan ? Math.max(bonus, rule.points) : bonus, 0);
}

export function getLoserBonusRules(pointSystem = {}) {
  const rules = Array.isArray(pointSystem?.loserBonusRules)
    ? pointSystem.loserBonusRules
    : [{
        loserScoreGreaterThan: pointSystem?.loserBonusScoreGreaterThan ?? 0,
        points: pointSystem?.loserBonusPoints ?? 0,
      }];
  return rules.map((rule) => ({
    loserScoreGreaterThan: nonNegative(rule?.loserScoreGreaterThan),
    points: nonNegative(rule?.points),
  }));
}

export function loserBonusForScore(rules, loserScore) {
  return rules.reduce((bonus, rule) =>
    loserScore > rule.loserScoreGreaterThan ? Math.max(bonus, rule.points) : bonus, 0);
}
