import { describe, it, expect } from 'vitest';
import { thresholdBadge } from './threshold.js';

describe('thresholdBadge', () => {
  it('returns null unless reached is a boolean', () => {
    expect(thresholdBadge(undefined, { voteThreshold: 0.5 })).toBeNull();
    expect(thresholdBadge(null, { voteThreshold: 0.5 })).toBeNull();
  });

  it('labels reached and not reached', () => {
    expect(thresholdBadge(true, { voteThreshold: 0.5 }).label).toBe('Threshold reached');
    expect(thresholdBadge(false, { voteThreshold: 0.5 }).label).toBe('Threshold not reached');
  });

  it('states the rule in voting power for a weighted ballot', () => {
    expect(thresholdBadge(true, { voteThreshold: 0.5, voteWeighted: true }).rule).toBe(
      'Yes above 50% of Yes and No voting power, Abstain not counted.',
    );
  });

  it('states the rule in votes for an unweighted ballot', () => {
    expect(thresholdBadge(false, { voteThreshold: 2 / 3, voteWeighted: false }).rule).toBe(
      'Yes above 66.67% of Yes and No votes, Abstain not counted.',
    );
  });

  it('gives no rule text without a numeric threshold', () => {
    expect(thresholdBadge(true, {}).rule).toBe('');
  });
});
