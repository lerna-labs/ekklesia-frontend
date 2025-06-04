<script>
	import { loggedIn } from '$stores/sessionManager.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import BallotBadge from '$lib/BallotBadge.svelte';
	import Text from '$lib/base/Text.svelte';
	import ProposalVote from '$lib/ProposalVote.svelte';
	import ProposalDetails from '$lib/ProposalDetails.svelte';
	import { convertTimestamp } from '$lib/utils';
	import Button from '$lib/components/ui/button/button.svelte';
	import VoteDetails from '$lib/VoteDetails.svelte';
	import Markdown from '$lib/base/Markdown.svelte';
	let { data } = $props();
	let { ballot, proposal } = data;
	let proposalData = proposal.data;
</script>

<div class="flex gap-2 text-xl">
	<h1>{proposal.name}</h1>
	<BallotBadge status={ballot.status} />
</div>

<section class="text-sm">
	<ProposalDetails {proposal} />
</section>

{#if proposal.description}
	<div class="mt-6">
		<h2 class="text-lg">Description</h2>
		<Text text={proposal.description} />
	</div>
{/if}

{#if proposal.data?.details}
	<section class="mt-6">
		<h2 class="mb-1 text-lg">Proposal Details</h2>
		<Markdown markdown={proposal.data.details} />
	</section>
{/if}

{#if proposal.data?.links}
	<section class="mt-6">
		<h2 class="mb-2 text-lg">Additional Information</h2>
		<ul class="square-list pl-4 text-sm">
			{#each proposal.data.links as link}
				<li>
					<a
						href={link.url}
						target="_blank"
						rel="noopener noreferrer"
						class="text-orange-600 hover:underline"
					>
						{link.name || link.url}
					</a>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<div class="mt-12"></div>
{#if ballot.status != 'upcoming'}
	<div class="mt-12 w-full">
		<div class="relative left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] w-screen bg-slate-900">
			<div class="m-auto grid max-w-3xl grid-cols-1 gap-6 p-4 pb-12 pt-8 text-white md:grid-cols-2">
				<Card.Root class="flex h-full flex-col">
					<Card.Header>
						<Card.Title class="mb-2 p-0 text-lg">
							{ballot.status == 'live' ? 'Preliminary Results' : 'Results'}
						</Card.Title>
					</Card.Header>
					<Card.Content class="flex-1 pt-1">
						<VoteDetails {ballot} {proposal} />
					</Card.Content>
				</Card.Root>

				<Card.Root class="flex h-full flex-col">
					<Card.Header>
						<Card.Title class="mb-2 p-0 text-lg">
							{ballot.status == 'live' ? 'Vote now!' : 'Voting'}
						</Card.Title>
					</Card.Header>
					<Card.Content class="flex-1 pt-0">
						<ProposalDetails {proposal} />

						<ProposalVote {ballot} {proposal} />
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(.square-list li) {
		list-style-type: square;
	}
</style>
