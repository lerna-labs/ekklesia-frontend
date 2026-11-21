import { describe, it, expect, vi } from 'vitest';

vi.mock('$stores/sessionManager.js', () => ({ api: { v1: { fetch: vi.fn() } } }));

import { certificationState } from './certified.js';

const hydraFinal = { source: 'final' };

describe('certificationState', () => {
  it('is archived for a closed legacy ballot', () => {
    expect(certificationState(null, null, { status: 'closed', source: 'legacy' })).toBe('archived');
    expect(
      certificationState(null, { source: 'live' }, { status: 'closed', source: 'legacy' }),
    ).toBe('archived');
  });

  it('keeps certified and narrative ahead of archived', () => {
    const ballot = { status: 'closed', source: 'legacy' };
    expect(certificationState({ certified: true }, null, ballot)).toBe('certified');
    expect(
      certificationState({ certified: false, narrative: { url: 'https://x.test' } }, null, ballot),
    ).toBe('narrative');
  });

  it('is hydra-provisional for a closed Hydra ballot with a final result', () => {
    expect(certificationState(null, hydraFinal, { status: 'closed', source: 'hydra' })).toBe(
      'hydra-provisional',
    );
  });

  it('is voting for an open legacy ballot with a result', () => {
    expect(certificationState(null, { source: 'live' }, { status: 'live', source: 'legacy' })).toBe(
      'voting',
    );
  });

  it('is null with no result and no archived basis', () => {
    expect(certificationState(null, null, { status: 'closed', source: 'hydra' })).toBeNull();
  });
});
