import { describe, it, expect } from 'vitest';
import { isAbstainRow } from './groupResults.js';

const legacy = { source: 'legacy' };
const hydra = { source: 'hydra' };

describe('isAbstainRow', () => {
  it('matches the abstain id in any case on any ballot', () => {
    for (const id of ['abstain', 'Abstain', 'ABSTAIN']) {
      expect(isAbstainRow({ id, label: 'x' }, hydra)).toBe(true);
      expect(isAbstainRow({ id, label: 'x' }, legacy)).toBe(true);
    }
  });

  it('matches id 0 or "0" labelled Abstain on a legacy ballot', () => {
    expect(isAbstainRow({ id: 0, label: 'Abstain' }, legacy)).toBe(true);
    expect(isAbstainRow({ id: '0', label: 'ABSTAIN' }, legacy)).toBe(true);
  });

  it('does not match that row on a non-legacy ballot', () => {
    expect(isAbstainRow({ id: 0, label: 'Abstain' }, hydra)).toBe(false);
    expect(isAbstainRow({ id: 0, label: 'Abstain' }, undefined)).toBe(false);
  });

  it('does not match id 0 with another label', () => {
    expect(isAbstainRow({ id: 0, label: 'Maybe' }, legacy)).toBe(false);
  });
});
