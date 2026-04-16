import { api } from '$stores/sessionManager.js';
import { normalizeBallot } from '$lib/utils.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	const [ballotV1, ballotV0, proposalResponse] = await Promise.all([
		api.v1.fetch(fetch, '/ballots/' + params.ballotId),
		api.fetch(fetch, '/ballots/' + params.ballotId),
		api.v1.fetch(fetch, '/proposals/' + params.proposalId)
	]);

	if (ballotV1.status !== 200) {
		throw error(ballotV1.status, 'Ballot not found');
	}
	if (proposalResponse.status !== 200) {
		throw error(proposalResponse.status, 'Proposal not found');
	}

	const ballotV1Payload = await ballotV1.json();
	const ballotV0Payload = ballotV0.ok ? await ballotV0.json() : {};
	const ballot = normalizeBallot(ballotV1Payload?.data ?? ballotV1Payload);

	if (ballotV0Payload?.voterValidated != null) ballot.voterValidated = ballotV0Payload.voterValidated;
	if (ballotV0Payload?.totalAllowedVoterCount != null) ballot.totalAllowedVoterCount = ballotV0Payload.totalAllowedVoterCount;
	if (ballotV0Payload?.totalVotingPower != null) ballot.totalVotingPower = ballotV0Payload.totalVotingPower;

	const proposalPayload = await proposalResponse.json();
	const proposal = proposalPayload?.data ?? proposalPayload;
	if (proposal._id == null && proposal.id != null) proposal._id = proposal.id;

	return { ballot, proposal };
}
