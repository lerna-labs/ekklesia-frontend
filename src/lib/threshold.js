// Label and rule text for the pass-threshold badge on legacy ballots.
// Returns null unless `reached` is a boolean.
export function thresholdBadge(reached, ballot) {
  if (typeof reached !== 'boolean') return null;
  const label = reached ? 'Threshold reached' : 'Threshold not reached';
  const t = ballot?.voteThreshold;
  if (typeof t !== 'number') return { label, rule: '' };
  const pct = Number((t * 100).toFixed(2));
  const unit = ballot?.voteWeighted ? 'voting power' : 'votes';
  return { label, rule: `Yes above ${pct}% of Yes and No ${unit}, Abstain not counted.` };
}
