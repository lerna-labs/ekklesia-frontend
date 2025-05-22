import { api } from '$stores/sessionManager.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params, url }) {
	// Extract query parameters from the URL
	const search = url.searchParams.get('search');
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const committee = url.searchParams.get('committee');
	const roadmap = url.searchParams.get('roadmap');
	const type = url.searchParams.get('type');
	const sort = url.searchParams.get('sort');
	const direction = url.searchParams.get('direction') || 'desc';
	const hasVoted = url.searchParams.get('hasVoted');
	const thresholdReached = url.searchParams.get('thresholdReached');

	// Build query string
	let queryParams = [];
	if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
	if (committee) queryParams.push(`committee=${encodeURIComponent(committee)}`);
	if (roadmap) queryParams.push(`roadmap=${encodeURIComponent(roadmap)}`);
	if (type) queryParams.push(`type=${encodeURIComponent(type)}`);
	if (sort) queryParams.push(`sort=${encodeURIComponent(sort)}`);
	if (direction) queryParams.push(`direction=${encodeURIComponent(direction)}`);
	if (hasVoted) queryParams.push(`hasVoted=${encodeURIComponent(hasVoted)}`);
	if (thresholdReached)
		queryParams.push(`thresholdReached=${encodeURIComponent(thresholdReached)}`);
	queryParams.push(`page=${encodeURIComponent(page)}`);
	queryParams.push(`limit=${encodeURIComponent(limit)}`);
	const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

	// Fetch ballot data
	const ballotResponse = await api.fetch(fetch, '/ballots/' + params.ballotId);

	// Fetch proposals with pagination parameters
	const proposalsResponse = await api.fetch(
		fetch,
		`/ballots/${params.ballotId}/proposals${queryString}`
	);

	if (ballotResponse.status !== 200) {
		throw error(ballotResponse.status, 'Ballot not found');
	}

	if (proposalsResponse.status !== 200) {
		throw error(proposalsResponse.status, 'Proposals not found');
	}

	// Parse the response data
	const ballot = await ballotResponse.json();
	const proposalsData = await proposalsResponse.json();

	// fetch filter options
	const committeesFilter = await api.fetch(fetch, '/proposals/committees');
	const roadmapsFilter = await api.fetch(fetch, '/proposals/roadmaps');
	const typesFilter = await api.fetch(fetch, '/proposals/types');

	return {
		ballot,
		// Extract the proposals array from the response
		proposals: proposalsData.data || [],
		// Include pagination metadata
		pagination: proposalsData.pagination || {
			total: 0,
			page: parseInt(page, 10),
			limit: parseInt(limit, 10),
			totalPages: 0
		},
		search,
		committee,
		roadmap,
		type,
		sort,
		direction,
		hasVoted,
		thresholdReached,
		// Pass current page and limit for pagination controls
		currentPage: parseInt(page, 10),
		perPage: parseInt(limit, 10),
		filterOptions: {
			committees: committeesFilter.status === 200 ? await committeesFilter.json() : [],
			roadmaps: roadmapsFilter.status === 200 ? await roadmapsFilter.json() : [],
			types: typesFilter.status === 200 ? await typesFilter.json() : []
		}
	};
}
