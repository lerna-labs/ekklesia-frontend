/**
 * Frontend-side persistence of pool voters' calidus bech32 IDs.
 *
 * Why this exists: `GET /v0/session/` and `GET /v0/dashboard/` (the two
 * endpoints `refreshUserSession()` calls on every SPA boot) do not carry
 * `calidusID`. Only `POST /v0/session/` returns it — and that response is
 * consumed transiently by the login flow. After login, `$user.calidusID` is
 * undefined for pool voters, which makes the broker sign step silently
 * no-op (`signerAddress` falls through to the wallet's address, which is
 * also undefined for pool because `WalletConnect` skips the wallet probe
 * for hand-entered pool IDs).
 *
 * Until `GET /v0/session/` carries the calidus bech32 — see
 * `.claude/trds/BACKEND_GET_SESSION_CALIDUS.md` — we capture it from the
 * POST /session response at login time and stash it here so
 * `refreshUserSession()` can re-apply it to `$user` on every reload.
 *
 * Storage shape:
 *   localStorage["ekklesia-calidus-<userId>"] = "calidus1..."
 *
 * The calidus bech32 is on-chain public data (CIP-151 hot-key
 * registration), not a credential — caching it across sessions is fine.
 * Namespaced by userId so multiple wallets on one browser don't collide.
 *
 * Once the backend ships its fix this module becomes redundant; the
 * `if (cached) merged.calidusID = cached;` line in `refreshUserSession`
 * can simply trust the backend payload.
 */

const PREFIX = 'ekklesia-calidus-';

export function saveCalidusID(userId, calidusID) {
	if (typeof localStorage === 'undefined') return;
	if (!userId || !calidusID) return;
	try {
		localStorage.setItem(PREFIX + userId, calidusID);
	} catch {
		// quota errors are non-fatal — the ID is recoverable from the
		// next POST /session round-trip if the voter logs in again.
	}
}

export function loadCalidusID(userId) {
	if (typeof localStorage === 'undefined') return null;
	if (!userId) return null;
	try {
		return localStorage.getItem(PREFIX + userId) || null;
	} catch {
		return null;
	}
}

export function clearCalidusID(userId) {
	if (typeof localStorage === 'undefined') return;
	if (!userId) return;
	try {
		localStorage.removeItem(PREFIX + userId);
	} catch {
		// ignore
	}
}
