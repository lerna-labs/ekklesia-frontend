import { goto } from '$app/navigation';
import { error } from '@sveltejs/kit';
import { writable, get } from 'svelte/store';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL;

// Normalize to the root `/api` base so we can prefix `/v0` or `/v1` explicitly.
// Accepts either `<origin>/api` or `<origin>/api/v0` in VITE_API_URL.
const API_BASE = (API_URL || '').replace(/\/v0\/?$/, '').replace(/\/$/, '');
const V0_BASE = `${API_BASE}/v0`;
const V1_BASE = `${API_BASE}/v1`;

// Create a writable store to manage the session. Named `user` for parity
// with the shared-auth conventions used by the proposal module.
export const loggedIn = writable(false);
export const showLogin = writable(false);
export const user = writable(null);
export const jwt = writable(null);

// Set JWT in cookie and localStorage (if cookies are not available)
export function setJWT(token, expiresIn) {
	if (typeof document !== 'undefined') {
		// Determine environment and protocol
		const isDev = import.meta.env.DEV;
		const isSecureContext = window.location.protocol === 'https:';

		// Configure cookie settings based on environment
		const cookieOptions = {
			expires: new Date(expiresIn),
			path: '/',
			// Only set secure flag if in production or using HTTPS
			secure: !isDev || isSecureContext,
			// Use 'lax' in development, 'strict' in production
			sameSite: isDev ? 'lax' : 'strict'
		};

		Cookies.set('token', token, cookieOptions);

		// Always store in localStorage as a fallback
		localStorage.setItem('token', token);
	}

	// Update Svelte store
	jwt.set(token);
}

// Get JWT from cookie or localStorage
export function getJWT() {
	let token = null;

	if (Cookies.get('token')) {
		token = decodeURIComponent(Cookies.get('token'));
	} else if (typeof window !== 'undefined' && localStorage.getItem('token')) {
		token = localStorage.getItem('token');
	}

	// console.log('Token from cookie/localStorage:', token);
	jwt.set(token);
	return token;
}

async function apiFetch(base, fetch, url, options = {}) {
	try {
		const token = get(jwt) || getJWT();

		const headers = new Headers(options.headers || {});
		headers.set('Content-Type', 'application/json');

		if (token) {
			headers.set('Authorization', `Bearer ${token}`);
		}

		const response = await fetch(base + url, {
			...options,
			headers,
			credentials: 'include'
		});

		if (response.status === 401) {
			logout();
			throw error(401, 'Token expired, please log in again');
		}

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			if (response.status === 404) {
				throw error(404, 'Not Found: The requested resource could not be found');
			}
			throw error(response.status, errorData.message || 'An error occurred');
		}

		return response;
	} catch (err) {
		if (err.status && err.body?.message) {
			console.log('Re-throwing error:', err);
			throw err;
		}
		throw error(500, err.message || 'An error occurred connecting to the API');
	}
}

// Handle connection failures gracefully
export const api = {
	fetch: (fetch, url, options = {}) => apiFetch(V0_BASE, fetch, url, options),
	v1: {
		fetch: (fetch, url, options = {}) => apiFetch(V1_BASE, fetch, url, options)
	}
};

export const logout = async () => {
	try {
		// Call the backend logout endpoint to clear server-side session
		const response = await fetch(`${V0_BASE}/session`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${get(jwt) || getJWT()}`
			},
			credentials: 'include'
		});

		if (!response.ok) {
			console.warn('Server logout failed, continuing with client logout');
		}
	} catch (error) {
		// Continue with client-side logout even if server request fails
		console.error('Error during server logout:', error);
	} finally {
		// Determine environment and protocol (same as in setJWT)
		const isDev = import.meta.env.DEV;
		const isSecureContext = typeof window !== 'undefined' && window.location.protocol === 'https:';

		// Configure cookie removal with the same options used when setting
		const cookieOptions = {
			path: '/',
			secure: !isDev || isSecureContext,
			sameSite: isDev ? 'lax' : 'strict'
		};

		// Clear cookie with matching options
		Cookies.remove('token', cookieOptions);

		// Clear localStorage if present
		if (typeof window !== 'undefined') {
			localStorage.removeItem('token');
		}

		// Clear the session
		jwt.set(null);
		loggedIn.set(false);
		user.set(null);

		// Redirect to the home page after logout
		goto('/');
	}
};
