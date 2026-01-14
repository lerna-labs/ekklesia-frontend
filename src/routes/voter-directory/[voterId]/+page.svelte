<script>
	import { Input } from '$lib/components/ui/input/index.js';
	import { ThumbsUp, ThumbsDown, CircleSlash } from 'lucide-svelte';
	import VoterInfo from '$lib/VoterInfo.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	import BallotCardVotes from '$lib/BallotCardVotes.svelte';
	let { data } = $props();
	let { voterData } = data;
</script>

<section>
	<div class="flex items-center justify-normal gap-2">
		<h1>Voter Profile</h1>
	</div>

	{#if voterData.error}
		<p>The requested Voter Profile couldn't be found.</p>
	{:else}
		<VoterInfo {voterData} />
	{/if}
</section>

<section class="mt-8">
	<h2>Votes</h2>
	{#if voterData.votes.length === 0}
		<p>This Voter has not voted on anything yet.</p>
	{:else}
		{#each voterData.votes as ballot}
			<BallotCardVotes {ballot} />
		{/each}
	{/if}
</section>

<div class="mt-12"></div>
