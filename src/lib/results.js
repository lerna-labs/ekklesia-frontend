import { api } from '$stores/sessionManager.js';

// Fetch the result for a single proposal. Returns the serialized Result
// document (including `source`, `ballotSource`, hydra provenance fields),
// or null if the backend has no results yet (404).
export async function fetchProposalResult(fetch, proposalId) {
	try {
		const res = await api.v1.fetch(fetch, '/results/proposal/' + proposalId);
		const payload = await res.json();
		return payload?.data ?? null;
	} catch (err) {
		if (err?.status === 404) return null;
		throw err;
	}
}

// Fetch the array of results for every proposal in a ballot.
export async function fetchBallotResults(fetch, ballotId) {
	try {
		const res = await api.v1.fetch(fetch, '/results/ballot/' + ballotId);
		const payload = await res.json();
		return payload?.data ?? [];
	} catch (err) {
		if (err?.status === 404) return [];
		throw err;
	}
}

/**
 * Focus-aware polling. The TRD caps live-ballot result polling at ~30s and
 * only wants it to run while the tab is actually visible. When the tab is
 * hidden we clear the interval; on reshow we immediately re-fetch and
 * restart. The backend cache TTL for `/results/*` is 30s so this lines up.
 *
 * @param {() => (void | Promise<void>)} tick — the fetch-and-update callback
 * @param {number} intervalMs
 * @returns {() => void} cleanup
 */
export function startResultsPoller(tick, intervalMs = 30_000) {
	if (typeof document === 'undefined') return () => {};

	let timer = null;
	const start = () => {
		if (timer != null) return;
		timer = setInterval(() => {
			void tick();
		}, intervalMs);
	};
	const stop = () => {
		if (timer == null) return;
		clearInterval(timer);
		timer = null;
	};
	const onVisibility = () => {
		if (document.visibilityState === 'visible') {
			void tick();
			start();
		} else {
			stop();
		}
	};

	document.addEventListener('visibilitychange', onVisibility);
	if (document.visibilityState === 'visible') start();

	return () => {
		document.removeEventListener('visibilitychange', onVisibility);
		stop();
	};
}
