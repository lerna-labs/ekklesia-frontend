import { api } from '$stores/sessionManager.js';

export async function load({ fetch, url }) {
	// Extract filters from URL
	const tag = url.searchParams.get('tag');
	const search = url.searchParams.get('search');

	// Build query string
	let queryParams = [];
	if (tag) {
		queryParams.push(`tag=${encodeURIComponent(tag)}`);
	}
	if (search) {
		queryParams.push(`search=${encodeURIComponent(search)}`);
	}
	const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';

	// Fetch FAQs
	const response = await api.fetch(fetch, `/faqs${queryString}`);
	const faqsData = await response.json();
	const faqs = Array.isArray(faqsData) ? faqsData : faqsData.faqs || faqsData.data || [];

	// Extract all unique tags from all FAQs
	const allTags = new Set();
	faqs.forEach((faq) => {
		if (faq.tags && Array.isArray(faq.tags)) {
			faq.tags.forEach((tag) => allTags.add(tag));
		}
	});

	return {
		faqs,
		tags: Array.from(allTags).sort(),
		selectedTag: tag || null,
		search: search || null
	};
}
