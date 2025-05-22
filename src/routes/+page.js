import { api } from '$stores/sessionManager.js';

export async function load({ fetch }) {
	const ballotsUpcoming = await api.fetch(fetch, '/ballots?status=upcoming');
	const ballotsLive = await api.fetch(fetch, '/ballots?status=live');
	const ballotsClosed = await api.fetch(fetch, '/ballots?status=closed');

	return {
		liveBallots: await ballotsLive.json(),
		closedBallots: await ballotsClosed.json(),
		upcomingBallots: await ballotsUpcoming.json()
	};
}
