import { api } from '$stores/sessionManager.js';
import { normalizeBallot } from '$lib/utils.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	// The v1 detail endpoint dispatches across adapters, so both hydra and
	// legacy ballots resolve through a single call. Response shape is
	// `{ data: UnifiedBallot }`.
	const response = await api.v1.fetch(fetch, '/ballots/' + params.ballotId);

	if (response.status !== 200) {
		throw error(response.status, 'Ballot not found');
	}

	const payload = await response.json();
	const ballot = normalizeBallot(payload?.data ?? payload);

	return {
		ballot
	};
}
