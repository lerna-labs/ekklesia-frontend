import { api } from '$stores/sessionManager.js';

// Resilient per-endpoint fetch. The four dashboard reads are independent —
// if one of them 500s (e.g. a scaffolded ballot with a bad
// voterValidationScript) we still want the rest of the page to render
// rather than blanking the whole route on one failure.
async function tryJson(fetchImpl, path, fallback) {
	try {
		const res = await api.fetch(fetchImpl, path);
		return await res.json();
	} catch (err) {
		console.warn('[dashboard] ' + path + ' failed:', err?.body?.message || err?.message || err);
		return fallback;
	}
}

export async function load({ fetch }) {
	const [voter, ballots, transactions, pendingVotes] = await Promise.all([
		tryJson(fetch, '/dashboard/', null),
		tryJson(fetch, '/dashboard/ballots', []),
		tryJson(fetch, '/transactions', []),
		tryJson(fetch, '/dashboard/pending', [])
	]);

	// /dashboard/pending returns `{ message: "no pending votes" }` when empty;
	// normalize to an array for the consumer.
	const normalizedPending = Array.isArray(pendingVotes) ? pendingVotes : [];

	return {
		voter,
		ballots: Array.isArray(ballots) ? ballots : [],
		transactions: Array.isArray(transactions) ? transactions : [],
		pendingVotes: normalizedPending
	};
}
