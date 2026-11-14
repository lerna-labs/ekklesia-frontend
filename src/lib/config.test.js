import { describe, it, expect } from 'vitest';
import { networkIdFor, normalizeWalletSigner } from '$lib/config.js';

describe('networkIdFor', () => {
  it('returns 1 for mainnet and 0 for any other network', () => {
    expect(networkIdFor('mainnet')).toBe(1);
    expect(networkIdFor('preprod')).toBe(0);
    expect(networkIdFor('preview')).toBe(0);
    expect(networkIdFor(undefined)).toBe(0);
  });
});

describe('normalizeWalletSigner', () => {
  const fallback = {
    userTypes: ['drep', 'stake', 'pool', 'addr'],
    userDefault: 'stake',
    multisig: true,
  };

  it('offers every type, defaults to stake and allows multisig when the object is absent', () => {
    expect(normalizeWalletSigner(undefined)).toEqual(fallback);
    expect(normalizeWalletSigner(null)).toEqual(fallback);
    expect(normalizeWalletSigner('x')).toEqual(fallback);
  });

  it('uses the values the backend reports', () => {
    expect(
      normalizeWalletSigner({ userTypes: ['drep', 'addr'], userDefault: 'drep', multisig: false }),
    ).toEqual({ userTypes: ['drep', 'addr'], userDefault: 'drep', multisig: false });
  });

  it('falls back per field when a field is missing or invalid', () => {
    expect(normalizeWalletSigner({ userTypes: [] })).toEqual(fallback);
    expect(normalizeWalletSigner({ userTypes: ['drep', 'pool'], userDefault: 'addr' })).toEqual({
      userTypes: ['drep', 'pool'],
      userDefault: 'drep',
      multisig: true,
    });
  });
});
