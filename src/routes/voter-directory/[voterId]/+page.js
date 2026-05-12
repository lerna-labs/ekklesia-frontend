import { api } from '$stores/sessionManager.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params }) {
	const { voterId } = params;
	if (!voterId) {
		throw error(400, 'Voter ID is required');
	}

	let voterData;
	try {
		voterData = await api.fetch(fetch, '/voters/' + encodeURIComponent(voterId));
	} catch (err) {
		// `api.fetch` re-throws as a SvelteKit error preserving the
		// backend's status + message. We surface the backend message
		// for the failure modes the user can act on, and only mask it
		// behind a friendlier line for outright unknowns.
		const status = err.status || 500;
		const upstream = err.body?.message;

		if (status === 400) {
			throw error(400, upstream || 'That voter ID is not in a recognized format.');
		}
		if (status === 404) {
			throw error(404, 'Voter not found');
		}
		if (status === 403) {
			throw error(403, 'You do not have permission to access this voter.');
		}
		throw error(status, upstream || 'An unexpected error occurred');
	}

	return {
		voterData: await voterData.json()
	};
}
