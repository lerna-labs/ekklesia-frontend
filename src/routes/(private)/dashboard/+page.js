import { api } from '$stores/sessionManager.js';

export async function load({ fetch }) {
	console.log('Loading dashboard data');
	const voterData = await api.fetch(fetch, '/dashboard/');
	const voterBallots = await api.fetch(fetch, '/dashboard/ballots');
	const voterTransactions = await api.fetch(fetch, '/transactions');
	const voterPendingVotes = await api.fetch(fetch, '/dashboard/pending');
	return {
		voter: await voterData.json(),
		ballots: await voterBallots.json(),
		transactions: await voterTransactions.json(),
		pendingVotes: await voterPendingVotes.json()
	};
}
