import { api } from '$stores/sessionManager.js';
import { normalizeBallot } from '$lib/utils.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	const [ballotResponse, proposalResponse] = await Promise.all([
		api.v1.fetch(fetch, '/ballots/' + params.ballotId),
		api.fetch(fetch, '/ballots/' + params.ballotId + '/proposals?search=' + params.proposalId)
	]);

	if (ballotResponse.status !== 200) {
		throw error(ballotResponse.status, 'Ballot not found');
	}
	if (proposalResponse.status !== 200) {
		throw error(proposalResponse.status, 'Proposal not found');
	}

	const proposalData = await proposalResponse.json();
	if (!proposalData.data || proposalData.data.length === 0) {
		throw error(404, 'Proposal not found');
	}

	const ballotPayload = await ballotResponse.json();

	return {
		ballot: normalizeBallot(ballotPayload?.data ?? ballotPayload),
		proposal: proposalData.data[0]
	};
}
