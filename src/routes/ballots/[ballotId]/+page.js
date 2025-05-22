import { api } from '$stores/sessionManager.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	const ballot = await api.fetch(fetch, '/ballots/' + params.ballotId);

	if (ballot.status !== 200) {
		throw error(ballot.status, 'Ballot not found');
	}

	return {
		ballot: await ballot.json()
	};
}
