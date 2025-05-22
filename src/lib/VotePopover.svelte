<script>
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import VoteDetails from './VoteDetails.svelte';
	let { proposal, ballot, outline = false } = $props();
	let totalVotes = $derived(proposal.voteCount);
</script>

<Popover.Root>
	<Popover.Trigger
		class={outline
			? buttonVariants({ size: 'sm', variant: 'outline' })
			: buttonVariants({ size: 'sm', variant: 'secondary' })}
		disabled={!totalVotes}
	>
		{totalVotes} {totalVotes > 1 || 0 ? "Votes" : "Vote"}
	</Popover.Trigger>
	<Popover.Content>
		<VoteDetails {ballot} {proposal} />
	</Popover.Content>
</Popover.Root>
