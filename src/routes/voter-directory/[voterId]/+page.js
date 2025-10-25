import { api } from '$stores/sessionManager.js';
import { error } from '@sveltejs/kit';
export async function load({ fetch, params }) {
	const { voterId } = params;
	let voterData;
	if (!voterId) {
		throw error(400, 'Voter ID is required');
	}
	try {
		voterData = await api.fetch(fetch, '/voters/' + voterId);
	} catch (err) {
		if (err.status === 404) {
			throw error(404, 'Voter not found');
		} else if (err.status === 403) {
			throw error(403, 'Forbidden: You do not have permission to access this resource');
		} else {
			throw error(err.status || 500, 'An unexpected error occurred');
		}
	}

	return {
		voterData: await voterData.json()
	};
}
