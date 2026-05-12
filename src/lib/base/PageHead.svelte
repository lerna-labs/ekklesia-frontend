<script>
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { BRAND } from './branding.js';

	// Build-time defaults (overridable per-instance for one-off pages).
	export let defaultTitle = BRAND.title;
	export let defaultDescription = BRAND.description;
	export let siteName = BRAND.name;
	export let defaultOgImage = BRAND.ogImage;

	// This will reactively update when $page changes
	$: description = generatePageDescription($page.url.pathname, $page.data);

	// Function to generate page suffix based on URL path and page data
	function generatePageSuffix(pathname, pageData) {
		// Homepage has no suffix
		if (pathname === '/') {
			return '';
		}

		// Get path segments
		const pathSegments = pathname.split('/').filter(Boolean);

		let pageParts = [];

		// Handle first and second segments (resource type and ID)
		if (pathSegments.length >= 2) {
			const resourceType = pathSegments[0];
			const resourceId = pathSegments[1];
			const isIdLike =
				resourceId && resourceId.length > 12 && !isNaN(parseInt(resourceId.charAt(0), 16));

			// Handle ballot pages
			if (resourceType === 'ballots' && isIdLike) {
				if (pageData.ballot && pageData.ballot.title) {
					pageParts.push(pageData.ballot.title);
				} else {
					pageParts.push('Ballot Details');
				}
			}
			// Handle proposal pages
			else if (resourceType === 'proposals' && isIdLike) {
				if (pageData.proposal && pageData.proposal.title) {
					pageParts.push(pageData.proposal.title);
				} else {
					pageParts.push('Proposal Details');
				}
			}
			// Handle vote pages
			else if (resourceType === 'votes' && isIdLike) {
				pageParts.push(`Vote #${resourceId.substring(0, 8)}...`);
			}
		}

		// Handle additional segments for nested routes
		if (pathSegments.length > 2) {
			for (let i = 2; i < pathSegments.length; i++) {
				const segment = pathSegments[i];
				// Capitalize the segment
				const formattedSegment = segment.charAt(0).toUpperCase() + segment.slice(1);
				pageParts.push(formattedSegment);
			}
		}

		// If we haven't set any page parts yet, use the last segment
		if (pageParts.length === 0) {
			const lastSegment = pathSegments[pathSegments.length - 1];
			if (lastSegment) {
				pageParts.push(lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1));
			}
		}

		// Return formatted suffix or empty string
		return pageParts.length ? ` | ${pageParts.join(' | ')}` : '';
	}

	// Function to generate description based on URL path and page data
	function generatePageDescription(pathname, pageData) {
		// Default description for homepage
		if (pathname === '/') {
			return defaultDescription;
		}

		// Get path segments
		const pathSegments = pathname.split('/').filter(Boolean);

		// For specific paths with available data
		if (pathSegments.length >= 2) {
			const resourceType = pathSegments[0];
			const resourceId = pathSegments[1];

			// Handle ballot pages
			if (resourceType === 'ballots') {
				if (pageData.ballot) {
					if (pageData.ballot.description) {
						return pageData.ballot.description.length > 160
							? pageData.ballot.description.substring(0, 157) + '...'
							: pageData.ballot.description;
					}
					return `Voting information for ballot: ${pageData.ballot.title || 'Unnamed ballot'}`;
				}
				return 'Ballot details and voting information';
			}

			// Handle proposal pages
			if (resourceType === 'proposals') {
				if (pageData.proposal) {
					if (pageData.proposal.description) {
						return pageData.proposal.description.length > 160
							? pageData.proposal.description.substring(0, 157) + '...'
							: pageData.proposal.description;
					}
					return `Details for proposal: ${pageData.proposal.title || 'Unnamed proposal'}`;
				}
				return 'Proposal details and voting options';
			}
		}

		return defaultDescription;
	}

	// Resolve absolute OG image URL when BRAND.url is configured.
	$: ogImage =
		defaultOgImage.startsWith('/') && BRAND.url
			? `${BRAND.url.replace(/\/$/, '')}${defaultOgImage}`
			: defaultOgImage;
</script>

<svelte:head>
	<title>{defaultTitle}{generatePageSuffix($page.url.pathname, $page.data)}</title>
	<meta name="description" content={description} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content="website" />
	<meta property="og:url" content={browser ? window.location.href : BRAND.url} />
	<meta
		property="og:title"
		content="{defaultTitle}{generatePageSuffix($page.url.pathname, $page.data)}"
	/>
	<meta property="og:description" content={description} />
	<meta property="og:site_name" content={siteName} />
	<meta property="og:image" content={ogImage} />

	<!-- Twitter -->
	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:url" content={browser ? window.location.href : BRAND.url} />
	<meta
		property="twitter:title"
		content="{defaultTitle}{generatePageSuffix($page.url.pathname, $page.data)}"
	/>
	<meta property="twitter:description" content={description} />
	<meta property="twitter:image" content={ogImage} />
	{#if BRAND.twitterHandle}
		<meta name="twitter:site" content={BRAND.twitterHandle} />
		<meta name="twitter:creator" content={BRAND.twitterHandle} />
	{/if}
</svelte:head>
