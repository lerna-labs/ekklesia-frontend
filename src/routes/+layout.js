import { loggedIn, user, getJWT } from '$stores/sessionManager.js';
import { loadFrontendConfig, refreshUserSession } from '$lib/config.js';
export const csr = true; // Client-side rendering only
export const ssr = false; // Disable server-side rendering
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

	// Pull runtime config (IPFS gateway, explorer bases) once per page load.
	// Failures are non-fatal; defaults stay in place.
	await loadFrontendConfig(fetch);

	// TOKEN CHECKS
	const jwt = getJWT();
	if (jwt) {
		try {
			const sessionData = await refreshUserSession(fetch);
			if (sessionData?.userId) {
				user.set(sessionData);
				loggedIn.set(true);
			} else {
				loggedIn.set(false);
			}
		} catch (error) {
			console.error('Error validating token:', error);
			loggedIn.set(false);
		}
	}

	return {
		serverStatus: await serverStatus.json()
	};
}
