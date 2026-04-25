import { api, config } from '$stores/sessionManager.js';
import { loadCalidusID } from '$lib/calidusCache.js';

/**
 * Fetch the backend-served runtime config (IPFS gateway, explorer bases,
 * network) and seed the `config` store. The endpoint is public — no session
 * required — and a failure here should never block page load, so we swallow
 * errors and leave the defaults already in the store.
 */
export async function loadFrontendConfig(fetch) {
	try {
		const res = await api.v1.fetch(fetch, '/config');
		const payload = await res.json();
		if (payload && typeof payload === 'object') {
			config.set({
				ipfsGatewayBase: payload.ipfsGatewayBase ?? 'https://ipfs.io/ipfs/',
				explorerTxBase: payload.explorerTxBase ?? 'https://cexplorer.io/tx/',
				explorerAddressBase: payload.explorerAddressBase ?? 'https://cexplorer.io/address/',
				network: payload.network ?? 'preprod'
			});
		}
	} catch (err) {
		console.warn('Could not load frontend config from /v1/config:', err?.message || err);
	}
}

/**
 * Merge the authenticated-session read into the `user` store. Calls both the
 * legacy /v0/dashboard/ (which carries voter-facing fields like
 * `pendingVotesCount` and `multiSig`) and /v0/session/ (which the backend
 * enriches with `nativeScript`, `pendingPackages`, and `isAdmin`), and
 * combines them. Kept here rather than in sessionManager.js so tests can
 * stub out the endpoints without touching the store plumbing.
 */
export async function refreshUserSession(fetch) {
	const [dashRes, sessionRes] = await Promise.allSettled([
		api.fetch(fetch, '/dashboard/'),
		api.fetch(fetch, '/session/')
	]);

	const dash = dashRes.status === 'fulfilled' && dashRes.value.ok ? await dashRes.value.json() : {};
	const session =
		sessionRes.status === 'fulfilled' && sessionRes.value.ok ? await sessionRes.value.json() : {};

	const merged = { ...dash, ...session };

	// Backend field names drift by voter type — /session returns the
	// bech32 identifier as `userId`, while legacy /dashboard code paths
	// and older fixtures use `voterId`. Normalize both directions so
	// frontend consumers don't have to branch.
	const id = merged.voterId ?? merged.userId;
	if (id) {
		merged.voterId = id;
		merged.userId = id;
		// Pool voters sign with a CIP-151 Calidus hot key. Today neither
		// /v0/session nor /v0/dashboard carry `calidusID`, so we restore
		// it from the localStorage cache populated at login time. Backend
		// payload wins if it's ever populated. See
		// .claude/trds/BACKEND_GET_SESSION_CALIDUS.md.
		if (merged.calidusID == null && typeof id === 'string' && id.startsWith('pool')) {
			const cached = loadCalidusID(id);
			if (cached) merged.calidusID = cached;
		}
	}

	return merged;
}
