<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import Badge from '$lib/BallotBadge.svelte';
	import { convertTimestamp, lovelaceToAda } from '$lib/utils.js';
	import BallotDetails from './BallotDetails.svelte';
	let { ballot } = $props();
	import Countdown from './Countdown.svelte';
</script>

<!-- {#if ballot.status == 'upcoming'}
	<div class="relative top-4 z-0 rounded-xl rounded-b-none bg-slate-900">
		<Countdown targetDate={ballot.votePeriodStart} className="text-white p-4 pb-8" />
	</div>
{/if} -->
<Card.Root class="z-1000 relative mb-4">
	<Card.Header class="pt-5">
		<Card.Title class="flex gap-2 text-xl">
			{ballot.name}
			<Badge status={ballot.status} />
		</Card.Title>
		<Card.Description>
			<BallotDetails {ballot} />
		</Card.Description>
	</Card.Header>
	<Card.Content class="text-sm">
		{ballot.description}
	</Card.Content>

	<Card.Footer class="flex items-center justify-between">
		<Button href={'/ballots/' + ballot._id + '/proposals'} variant="outline" size="sm">
			View Ballot
		</Button>
	</Card.Footer>
</Card.Root>
