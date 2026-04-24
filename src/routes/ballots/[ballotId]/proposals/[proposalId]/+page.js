import { api } from '$stores/sessionManager.js';
import { normalizeBallot } from '$lib/utils.js';
import { loadMyBallotVotes, mineToProposalAnnotations } from '$lib/broker.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	const [ballotV1, ballotV0, proposalResponse, siblingsResponse, mine] = await Promise.all([
		api.v1.fetch(fetch, '/ballots/' + params.ballotId),
		api.fetch(fetch, '/ballots/' + params.ballotId),
		api.v1.fetch(fetch, '/proposals/' + params.proposalId),
		api.v1.fetch(fetch, '/proposals/ballot/' + params.ballotId + '?limit=500'),
		loadMyBallotVotes(fetch, params.ballotId)
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

	// Seed the proposal with the voter's submitted selection so the vote
	// form rehydrates on page load. See mineToProposalAnnotations() for
	// the in-flight > confirmed priority rule.
	const annotations = mineToProposalAnnotations(mine);
	const ann = annotations[String(proposal._id)];
	if (ann) {
		proposal.voterVote = ann.voterVote;
		proposal.voterVoteStatus = ann.voterVoteStatus;
	}

	// Build prev/next sibling links from the ballot's full proposal list.
	let prev = null;
	let next = null;
	if (siblingsResponse.ok) {
		const siblingsPayload = await siblingsResponse.json();
		const siblings = (siblingsPayload?.data ?? []).map((p) => ({
			_id: p._id ?? p.id,
			title: p.title
		}));
		const idx = siblings.findIndex((s) => String(s._id) === String(proposal._id));
		if (idx > 0) prev = siblings[idx - 1];
		if (idx >= 0 && idx < siblings.length - 1) next = siblings[idx + 1];
	}

	return { ballot, proposal, prev, next };
}
