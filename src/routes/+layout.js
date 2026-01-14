import { api, loggedIn, voter, getJWT } from '$stores/sessionManager.js';
export const csr = true; // Client-side rendering only
export const ssr = false; // Disable server-side rendering

export async function load({ fetch }) {
	// TOKEN CHECKS
	const jwt = getJWT();
	if (jwt) {
		try {
			const validate = await api.fetch(fetch, '/dashboard/');
			if (validate.status === 200) {
				const sessionData = await validate.json();
				voter.set(sessionData);
				loggedIn.set(true);
			} else {
				loggedIn.set(false);
			}
		} catch (error) {
			console.error('Error validating token:', error);
			loggedIn.set(false);
		}
	}
}
