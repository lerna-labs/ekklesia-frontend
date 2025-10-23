<script>
	import Text from './base/Text.svelte';
	import Badge from '$lib/BallotBadge.svelte';
	import BallotDetails from './BallotDetails.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { convertTimestamp, lovelaceToAda } from '$lib/utils.js';
	let { ballot } = $props();
</script>

<Card.Root class="z-1000 relative mb-4">
	<Card.Header class="pt-5">
		<Card.Title class="flex gap-2 text-xl">
			{ballot.title}
			<Badge status={ballot.status} />
		</Card.Title>
		<Card.Description>
			<BallotDetails {ballot} />
		</Card.Description>
	</Card.Header>
	<Card.Content class="pt-4 text-sm">
		<Text text={ballot.description} expanded={true} />
	</Card.Content>

	<Card.Footer class="flex items-center justify-between">
		<Button href={'/ballots/' + ballot._id + '/proposals'} variant="outline" size="sm">
			View Ballot
		</Button>
	</Card.Footer>
</Card.Root>
