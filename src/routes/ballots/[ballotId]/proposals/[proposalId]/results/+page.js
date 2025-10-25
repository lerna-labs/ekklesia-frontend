import { api } from '$stores/sessionManager.js';
import { error } from '@sveltejs/kit';
export async function load({ fetch, params }) {
    const ballot = await api.fetch(fetch, '/ballots/' + params.ballotId);
    const proposal = await api.fetch(
        fetch,
        '/ballots/' + params.ballotId + '/proposals?search=' + params.proposalId
    );

    let proposalData = await proposal.json();
    if (proposalData.data.length === 0) {
        throw error(404, 'Proposal not found');
    }

    if (ballot.status !== 200) {
        throw error(ballot.status, 'Ballot not found');
    }

    if (proposal.status !== 200) {
        throw error(proposal.status, 'Proposal not found');
    }

    return {
        ballot: await ballot.json(),
        proposal: proposalData.data[0]
    };
}
