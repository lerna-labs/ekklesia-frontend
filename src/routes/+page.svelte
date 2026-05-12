<script>
	import BallotCard from '$lib/BallotCard.svelte';
	import FAQs from '$lib/FAQs.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import MarkdownBrief from '$lib/base/MarkdownBrief.svelte';
	import { content } from '$lib/content.js';
	let { data } = $props();

	const hero = content.home.hero;
	const upcoming = content.home.upcoming;
	const live = content.home.live;
	const closed = content.home.closed;
</script>

{#if hero}
	<section class="mb-8">
		<h1>{hero.data.title}</h1>
		<MarkdownBrief markdown={hero.body} class="mb-4" />
		{#if hero.data.ctaLabel && hero.data.ctaHref}
			<Button href={hero.data.ctaHref} size="sm">{hero.data.ctaLabel}</Button>
		{/if}
	</section>
{/if}

{#if data.upcomingBallots.data.length > 0}
	<section class="mb-8">
		<h2>{upcoming?.data.title ?? 'Upcoming Ballots'}</h2>
		{#if upcoming?.body}
			<MarkdownBrief markdown={upcoming.body} class="mb-6" />
		{/if}
		{#each data.upcomingBallots.data as ballot}
			<BallotCard {ballot} />
		{/each}
	</section>
{/if}

{#if data.liveBallots.data.length > 0}
	<section class="mb-10">
		<h2>{live?.data.title ?? 'Live Ballots'}</h2>
		{#if live?.body}
			<MarkdownBrief markdown={live.body} class="mb-6" />
		{/if}
		{#each data.liveBallots.data as ballot}
			<BallotCard {ballot} />
		{/each}
	</section>
{/if}

<FAQs />

{#if data.closedBallots.data.length > 0}
	<section>
		<h2>{closed?.data.title ?? 'Closed Ballots'}</h2>
		{#if closed?.body}
			<MarkdownBrief markdown={closed.body} class="mb-6" />
		{/if}
		{#each data.closedBallots.data as ballot}
			<BallotCard {ballot} />
		{/each}
	</section>
{/if}

<div class="mt-12"></div>
