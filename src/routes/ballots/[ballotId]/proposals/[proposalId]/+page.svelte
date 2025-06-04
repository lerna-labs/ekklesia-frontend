<script>
	import { loggedIn } from '$stores/sessionManager.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Accordion from '$lib/components/ui/accordion/index.js';
	import BallotBadge from '$lib/BallotBadge.svelte';
	import Text from '$lib/base/Text.svelte';
	import ProposalVote from '$lib/ProposalVote.svelte';
	import ProposalStats from '$lib/ProposalStats.svelte';
	import ProposalDetails from '$lib/ProposalDetails.svelte';
	import ProposalCost from '$lib/ProposalCost.svelte';
	import { convertTimestamp } from '$lib/utils';
	import ProposalOwner from '$lib/ProposalOwner.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import VoteDetails from '$lib/VoteDetails.svelte';
	let { data } = $props();
	let { ballot, proposal } = data;
	let proposalData = proposal.data;
	let owner = proposalData?.data?.owner_info || null;
</script>

<div class="flex gap-2 text-xl">
	<h1>{proposal.name}</h1>
	<BallotBadge status={ballot.status} />
</div>

<section class="text-sm">
	<ProposalDetails {proposal} />
	<div class="mt-3">
		<ProposalCost {proposal} />
	</div>
</section>

{#if proposal.data.description}
	<div class="mt-6">
		<h2 class="text-lg">Description</h2>
		<Text text={proposal.data.description} />
	</div>
{/if}

<section class="mt-6">
	<h2 class="mb-1 text-lg">Proposal Details</h2>
	<Accordion.Root type="multiple" class="mt-0">
		{#if proposal.data?.data?.problem_statement}
			<Accordion.Item value="item-1">
				<Accordion.Trigger class="text-md">Problem Statement</Accordion.Trigger>
				<Accordion.Content
					><Text text={proposal.data.data.problem_statement} expanded /></Accordion.Content
				>
			</Accordion.Item>
		{/if}

		{#if proposal.data?.data?.proposal_benefit}
			<Accordion.Item value="item-2">
				<Accordion.Trigger class="text-md">Proposal Benefit</Accordion.Trigger>
				<Accordion.Content
					><Text text={proposal.data.data.proposal_benefit} expanded /></Accordion.Content
				>
			</Accordion.Item>
		{/if}

		{#if proposal.data?.data?.maintain_and_support}
			<Accordion.Item value="item-3">
				<Accordion.Trigger class="text-md">Maintenance & Support</Accordion.Trigger>
				<Accordion.Content
					><Text text={proposal.data.data.maintain_and_support} expanded /></Accordion.Content
				>
			</Accordion.Item>
		{/if}

		{#if proposal.data?.data?.deliverables}
			<Accordion.Item value="item-4">
				<Accordion.Trigger class="text-md">Key Proposal Deliverable(s)</Accordion.Trigger>
				<Accordion.Content
					><Text text={proposal.data.data.deliverables} expanded /></Accordion.Content
				>
			</Accordion.Item>
		{/if}

		{#if proposal.data?.data?.resourcing}
			<Accordion.Item value="item-5">
				<Accordion.Trigger class="text-md">Resourcing & Duration Estimates</Accordion.Trigger>
				<Accordion.Content><Text text={proposal.data.data.resourcing} expanded /></Accordion.Content
				>
			</Accordion.Item>
		{/if}

		{#if proposal.data?.data?.experience}
			<Accordion.Item value="item-6">
				<Accordion.Trigger class="text-md">Vendor Experience</Accordion.Trigger>
				<Accordion.Content><Text text={proposal.data.data.experience} expanded /></Accordion.Content
				>
			</Accordion.Item>
		{/if}

		{#if proposal.data?.data?.extra_links.length > 0}
			<Accordion.Item value="item-7">
				<Accordion.Trigger class="text-md">Supporting Links</Accordion.Trigger>
				<Accordion.Content>
					<ul>
						{#each proposal.data.data.extra_links as link}
							<li class="mt-2">
								<a
									href={link.prop_link}
									target="_blank"
									rel="noopener noreferrer"
									class="text-orange-600 hover:text-orange-800"
								>
									{link.prop_link_text}
								</a>
							</li>
						{/each}
					</ul>
				</Accordion.Content>
			</Accordion.Item>
		{/if}
	</Accordion.Root>

	{#if proposal.data?.data?.contract_type}
		<div class="text-md mt-4 text-orange-500">
			<span class="font-medium">Contract Type:</span>
			{proposal.data.data.contract_type}
		</div>
	{/if}

	{#if owner}
		<div class="mt-8">
			<ProposalOwner {owner} />
		</div>
	{/if}

	{#if proposal.data.id}
		<Button
			href={'https://gov.tools/budget_discussion/' + proposal.data.id}
			target="_blank"
			rel="noopener noreferrer"
			size="sm"
			class="mt-6"
			variant="secondary">Read the full Proposal on Gov.tools</Button
		>
	{/if}
</section>
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
						<div class="mb-4 mt-2">
							<ProposalCost {proposal} />
						</div>
						<ProposalVote {ballot} {proposal} />
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</div>
{/if}
