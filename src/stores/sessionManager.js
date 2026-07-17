import { goto, invalidateAll } from '$app/navigation';
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
// Set by click interceptors on `[data-walletsigner-action="navigateAfterLogin"]`
// so that after a successful login we can `goto()` the originally requested URL.
export const redirectAfterLogin = writable(null);
export const user = writable(null);
export const jwt = writable(null);

// Runtime config served by the backend at GET /v1/config. Loaded once on app
// boot by +layout.js. Lets ops switch explorer / IPFS gateway / network
// without a frontend redeploy. Default values mirror the backend defaults so
// a bare-local dev bring-up still renders something sensible.
export const config = writable({
  ipfsGatewayBase: 'https://ipfs.io/ipfs/',
  explorerTxBase: 'https://cexplorer.io/tx/',
  explorerAddressBase: 'https://cexplorer.io/address/',
  network: 'preprod',
});

// Set JWT in cookie only. localStorage is intentionally NOT used: it would
// be readable by any JS in the page origin, turning any future XSS into a
// session-exfil vector. The cookie carries auth on every fetch via
// `credentials: 'include'`.
export function setJWT(token, expiresIn) {
  if (typeof document !== 'undefined') {
    const isDev = import.meta.env.DEV;
    const isSecureContext = window.location.protocol === 'https:';

    const cookieOptions = {
      expires: new Date(expiresIn),
      path: '/',
      secure: !isDev || isSecureContext,
      sameSite: isDev ? 'lax' : 'strict',
    };

    Cookies.set('token', token, cookieOptions);
  }

  jwt.set(token);
}

// Get JWT from cookie.
export function getJWT() {
  const cookieToken = Cookies.get('token');
  const token = cookieToken ? decodeURIComponent(cookieToken) : null;
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
      credentials: 'include',
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

// Best-effort request that returns the Response on any HTTP status (no
// throw) and null on network failure. Crucially, it does NOT log the
// user out on 401 — callers use this for optional/enrichment reads
// where "not authorized" should just mean "skip this side request."
async function apiTryFetch(base, fetchFn, url, options = {}) {
  try {
    const token = get(jwt) || getJWT();
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return await fetchFn(base + url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    return null;
  }
}

// Handle connection failures gracefully
export const api = {
  fetch: (fetch, url, options = {}) => apiFetch(V0_BASE, fetch, url, options),
  tryFetch: (fetch, url, options = {}) => apiTryFetch(V0_BASE, fetch, url, options),
  v1: {
    fetch: (fetch, url, options = {}) => apiFetch(V1_BASE, fetch, url, options),
    tryFetch: (fetch, url, options = {}) => apiTryFetch(V1_BASE, fetch, url, options),
  },
};

export const logout = async () => {
  try {
    // Call the backend logout endpoint to clear server-side session
    const response = await fetch(`${V0_BASE}/session`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${get(jwt) || getJWT()}`,
      },
      credentials: 'include',
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
      sameSite: isDev ? 'lax' : 'strict',
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

    // If the voter is on an auth-required page (currently just the
    // dashboard), bounce them to the homepage — staying put would show
    // a blank / 401 state. On any public page (ballots, proposals,
    // results, voter directory, home), keep them where they are and
    // just re-run loads so the page re-renders in its logged-out
    // state. Less disruptive to someone who just wanted to drop auth.
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
    const PRIVATE_PREFIXES = ['/dashboard'];
    if (PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
      goto('/');
    } else {
      invalidateAll();
    }
  }
};
