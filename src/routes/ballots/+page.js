import { api } from '$stores/sessionManager.js';

export async function load({ fetch, url }) {
	// Extract query parameters from the URL
	const voterType = url.searchParams.get('voterType');
	const status = url.searchParams.get('status');
	const search = url.searchParams.get('search');
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';

	// Build query string
	let queryParams = [];
	if (voterType) queryParams.push(`voterType=${encodeURIComponent(voterType)}`);
	if (status) queryParams.push(`status=${encodeURIComponent(status)}`);
	if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
	queryParams.push(`page=${encodeURIComponent(page)}`);
	queryParams.push(`limit=${encodeURIComponent(limit)}`);
	const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

	// Fetch ballots with query parameters
	const ballots = await api.fetch(fetch, `/ballots${queryString}`);
	const voterTypes = await api.fetch(fetch, '/ballots/voterTypes');

	// Parse the response data
	const ballotsData = await ballots.json();

	return {
		// Extract the ballots array from the response
		ballots: ballotsData.data || [],
		// Include pagination metadata
		pagination: ballotsData.pagination || {
			total: 0,
			page: parseInt(page, 10),
			limit: parseInt(limit, 10),
			totalPages: 0
		},
		// Pass other data for filters
		voterTypes: await voterTypes.json(),
		voterType,
		status,
		search,
		// Pass current page and limit for pagination controls
		currentPage: parseInt(page, 10),
		perPage: parseInt(limit, 10)
	};
}
