import { get, writable } from 'svelte/store';
import { user } from '$stores/sessionManager.js';

/**
 * Client-side cache of the voter's last-used signer tool, so the broker
 * vote modal can skip the picker and jump straight to signing on the
 * next submission.
 *
 * Stored per userId — `ekklesia-signer-pref-<userId>` — mirroring the
 * draft cache. Two recognized shapes:
 *
 *   { kind: 'wallet', walletName: 'eternl' }   // CIP-30 browser wallet
 *   { kind: 'signer' }                         // CardanoSigner offline
 *
 * On logout the in-memory store resets; on next login it rehydrates
 * from storage for the new user. Nothing sensitive lands in this
 * record — only the tool choice + wallet identifier.
 */

const STORAGE_PREFIX = 'ekklesia-signer-pref-';

export const signerPreference = writable(null);

function storageKey() {
  const u = get(user);
  return u?.userId ? STORAGE_PREFIX + u.userId : null;
}

function isValidPref(p) {
  if (!p || typeof p !== 'object') return false;
  if (p.kind === 'wallet' && typeof p.walletName === 'string' && p.walletName.length > 0) {
    return true;
  }
  if (p.kind === 'signer') return true;
  return false;
}

export function loadSignerPreference() {
  if (typeof localStorage === 'undefined') return null;
  const key = storageKey();
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    return isValidPref(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSignerPreference(pref) {
  if (!isValidPref(pref)) return;
  if (typeof localStorage === 'undefined') return;
  const key = storageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(pref));
  } catch {
    // ignore
  }
  signerPreference.set(pref);
}

export function clearSignerPreference() {
  if (typeof localStorage === 'undefined') return;
  const key = storageKey();
  if (!key) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  signerPreference.set(null);
}

export function hydrateSignerPreference() {
  signerPreference.set(loadSignerPreference());
}

// Follow the user store so the preference is always in sync with the
// current session — matches how draftVotes.js reacts to login/logout.
user.subscribe((u) => {
  if (!u) {
    signerPreference.set(null);
  } else {
    hydrateSignerPreference();
  }
});
