<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import { convertTimestamp, lovelaceToAda } from './utils';
	let { voterData } = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			<div class="overflow-hidden text-ellipsis whitespace-nowrap" title={voterData.voterId}>
				{voterData.voterId}
			</div>
		</Card.Title>
		<Card.Description
			>Last Login: {voterData.lastLogin
				? convertTimestamp(voterData.lastLogin)
				: 'never'}</Card.Description
		>
	</Card.Header>
	<Card.Content class="text-sm">
		<p>Ballots voted on: {voterData.ballotsVoted} Ballots</p>
		<p>Proposals voted on: {voterData.proposalsVoted} Proposals</p>
	</Card.Content>
</Card.Root>
