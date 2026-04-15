import { api } from '$stores/sessionManager.js';
import { normalizeBallot } from '$lib/utils.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params, url }) {
	// Extract query parameters from the URL
	const search = url.searchParams.get('search');
	const page = url.searchParams.get('page') || '1';
	const limit = url.searchParams.get('limit') || '10';
	const tags = url.searchParams.get('tags');
	const categories = url.searchParams.get('categories');
	const sort = url.searchParams.get('sort');
	const direction = url.searchParams.get('direction') || 'desc';
	const hasVoted = url.searchParams.get('hasVoted');
	const thresholdReached = url.searchParams.get('thresholdReached');

	// Build query string
	let queryParams = [];
	if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
	if (tags) queryParams.push(`tags=${encodeURIComponent(tags)}`);
	if (categories) queryParams.push(`categories=${encodeURIComponent(categories)}`);

	if (sort) queryParams.push(`sort=${encodeURIComponent(sort)}`);
	if (direction) queryParams.push(`direction=${encodeURIComponent(direction)}`);
	if (hasVoted) queryParams.push(`hasVoted=${encodeURIComponent(hasVoted)}`);
	if (thresholdReached)
		queryParams.push(`thresholdReached=${encodeURIComponent(thresholdReached)}`);
	queryParams.push(`page=${encodeURIComponent(page)}`);
	queryParams.push(`limit=${encodeURIComponent(limit)}`);
	const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

	// Fetch ballot data via unified v1 dispatcher (handles both legacy + hydra)
	const [ballotResponse, proposalsResponse] = await Promise.all([
		api.v1.fetch(fetch, '/ballots/' + params.ballotId),
		api.fetch(fetch, `/ballots/${params.ballotId}/proposals${queryString}`)
	]);

	if (ballotResponse.status !== 200) {
		throw error(ballotResponse.status, 'Ballot not found');
	}

	if (proposalsResponse.status !== 200) {
		throw error(proposalsResponse.status, 'Proposals not found');
	}

	// v1 wraps the ballot in `{ data }`; unwrap + normalize so `_id` stays available.
	const ballotPayload = await ballotResponse.json();
	const ballot = normalizeBallot(ballotPayload?.data ?? ballotPayload);
	const proposalsData = await proposalsResponse.json();

	// Fetch filter options
	const tagsFilterResponse = await api.fetch(fetch, '/ballots/' + params.ballotId + '/tags');
	const categoriesFilterResponse = await api.fetch(
		fetch,
		'/ballots/' + params.ballotId + '/categories'
	);

	// Process filter responses
	let tagsOptions = [];
	let categoriesOptions = [];

	if (tagsFilterResponse.status === 200) {
		tagsOptions = await tagsFilterResponse.json();
	}

	if (categoriesFilterResponse.status === 200) {
		categoriesOptions = await categoriesFilterResponse.json();
	}

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
		tags,
		categories,
		sort,
		direction,
		hasVoted,
		thresholdReached,
		// Pass current page and limit for pagination controls
		currentPage: parseInt(page, 10),
		perPage: parseInt(limit, 10),
		filterOptions: {
			tags: tagsOptions,
			categories: categoriesOptions,
			thresholdReached: ballot.voteThreshold != 0 ? true : false
		}
	};
}
