<script>
	import { Input } from '$lib/components/ui/input/index.js';
	import { ThumbsUp, ThumbsDown, CircleSlash } from 'lucide-svelte';
	import VoterStake from '$lib/VoterStake.svelte';
	import VoterPool from '$lib/VoterPool.svelte';
	import VoterDrep from '$lib/VoterDrep.svelte';
	import VoterBadge from '$lib/VoterBadge.svelte';
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
	{/if}

	{#if voterData.voterType === 'stake'}
		<VoterStake {voterData} />
	{/if}

	{#if voterData.voterType === 'drep'}
		<VoterDrep {voterData} />
	{/if}

	{#if voterData.voterType === 'pool'}
		<VoterPool {voterData} />
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
