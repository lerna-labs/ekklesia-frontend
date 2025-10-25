import { api } from '$stores/sessionManager.js';

export async function load({ fetch, url }) {
	// Extract query parameters from the URL
	const search = url.searchParams.get('search');
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '25';
	const sort = url.searchParams.get('sort') || 'votes';
	const direction = url.searchParams.get('direction') || 'desc';

	// Build query string
	let queryParams = [];
	if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
	queryParams.push(`page=${encodeURIComponent(page)}`);
	queryParams.push(`limit=${encodeURIComponent(limit)}`);

	// Add sort parameters if not using defaults
	if (sort !== '_id') queryParams.push(`sort=${encodeURIComponent(sort)}`);
	if (direction !== 'asc') queryParams.push(`direction=${encodeURIComponent(direction)}`);

	const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

	// Fetch voters with query parameters
	const response = await api.fetch(fetch, `/voters${queryString}`);

	// Parse the response data
	const votersData = await response.json();

	return {
		// Extract the voters array from the response
		voters: votersData.data || [],
		// Include pagination metadata
		pagination: votersData.pagination || {
			total: 0,
			page: parseInt(page, 10),
			limit: parseInt(limit, 10),
			totalPages: 0
		},
		search,
		// Pass current page and limit for pagination controls
		currentPage: parseInt(page, 10),
		perPage: parseInt(limit, 10),
		// Pass sort parameters for UI controls
		sort,
		direction
	};
}
