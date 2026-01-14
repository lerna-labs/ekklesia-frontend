import { api } from '$stores/sessionManager.js';
const VITE_SERVER_STATUS = import.meta.env.VITE_SERVER_STATUS;
import { error } from '@sveltejs/kit';

export async function load({ fetch }) {
	let serverStatus;
	try {
		serverStatus = await fetch(VITE_SERVER_STATUS);
		if (!serverStatus.ok) {
			throw error(503, {
				message: 'Server not available',
				code: 'SERVER_STATUS_NOT_AVAILABLE'
			});
		}
	} catch (err) {
		if (err?.status) {
			throw err;
		}
		throw error(503, {
			message: 'Server not available',
			code: 'SERVER_STATUS_FETCH_FAILED'
		});
	}

	const ballotsUpcoming = await api.fetch(fetch, '/ballots?status=upcoming');
	const ballotsLive = await api.fetch(fetch, '/ballots?status=live');
	const ballotsClosed = await api.fetch(fetch, '/ballots?status=closed');

	return {
		serverStatus: serverStatus ? await serverStatus.json() : null,
		liveBallots: await ballotsLive.json(),
		closedBallots: await ballotsClosed.json(),
		upcomingBallots: await ballotsUpcoming.json()
	};
}