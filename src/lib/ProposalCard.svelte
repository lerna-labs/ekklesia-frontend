<script>
	import { get } from 'svelte/store';
	import Text from './base/Text.svelte';
	import { loggedIn, user } from './../stores/sessionManager.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ProposalVote from '$lib/ProposalVote.svelte';
	import VotePopover from './VotePopover.svelte';
	import Comments from '$lib/Comments.svelte';
	import ProposalDetails from './ProposalDetails.svelte';
	import { draftsTree, draftHasSelection, draftIsAbstaining } from '$lib/draftVotes.js';
	import { acceptedCredentialsOf, voterCredentialFromId } from '$lib/utils.js';
	import { CircleCheck, Circle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-svelte';
	let { proposal, ballot } = $props();

	// Drafted indicator — visible when the authed user has a locally
	// saved selection or abstain flag for this proposal. Doesn't reflect
	// other browsers or pre-submit state on other devices.
	const draft = $derived($draftsTree?.[ballot._id]?.[proposal._id] ?? null);
	const hasSelection = $derived(draftHasSelection(draft));
	const isAbstaining = $derived(draftIsAbstaining(draft));
	const hasDraft = $derived(hasSelection || isAbstaining);

	// Suppress the drafted indicator for voters who can't actually vote
	// on this ballot — a wrong-credential or validation-script failure.
	// Draft state is moot if it'll never be submittable.
	const acceptedCredentials = $derived(acceptedCredentialsOf(ballot));
	const voterCredential = $derived(voterCredentialFromId($user?.voterId));
	const hasTypeMismatch = $derived(
		$loggedIn &&
			!!acceptedCredentials &&
			voterCredential != null &&
			!acceptedCredentials.includes(voterCredential)
	);
	const isIneligible = $derived(hasTypeMismatch || ballot?.voterValidated === false);

	// Seed the collapsed/expanded state once at mount from the current
	// eligibility picture. Eligible + logged-in voters start with the
	// vote form open — the quick-draft flow they had before. Anonymous
	// or ineligible visitors start collapsed, with a "Show vote options"
	// trigger so the list stays scannable. Subsequent changes (login
	// mid-view, etc.) don't re-seed — the voter can expand manually.
	function initiallyExpanded() {
		if (!get(loggedIn)) return false;
		if (ballot?.voterValidated === false) return false;
		const accepted = acceptedCredentialsOf(ballot);
		const cred = voterCredentialFromId(get(user)?.voterId);
		if (accepted && cred && !accepted.includes(cred)) return false;
		return true;
	}
	let voteFormOpen = $state(initiallyExpanded());
</script>

<Card.Root class="relative mb-4 overflow-hidden">
	<Card.Header>
		<Card.Title>
			<div class="flex items-start gap-2">
				{#if $loggedIn && !isIneligible}
					<span
						class="mt-1 shrink-0"
						class:text-emerald-600={hasSelection}
						class:text-amber-600={isAbstaining}
						class:text-slate-300={!hasDraft}
						title={isAbstaining
							? 'You have drafted an abstention on this proposal'
							: hasSelection
								? 'You have a draft vote on this proposal'
								: 'Not yet voted'}
					>
						{#if isAbstaining}
							<MinusCircle class="h-5 w-5" aria-label="Abstaining" />
						{:else if hasSelection}
							<CircleCheck class="h-5 w-5" aria-label="Drafted" />
						{:else}
							<Circle class="h-5 w-5" aria-label="Not yet voted" />
						{/if}
					</span>
				{/if}
				<div class="flex-1 text-xl">
					<a href={'/ballots/' + ballot._id + '/proposals/' + proposal._id}>{proposal.title}</a>
				</div>
			</div>
		</Card.Title>
		<Card.Description>
			<ProposalDetails {proposal} {ballot} />
		</Card.Description>
	</Card.Header>
	<Card.Content class="pb-0">
		{#if proposal.summary}
			<div class="mb-4">
				<Text text={proposal.summary} />
			</div>
		{:else if proposal.description}
			<div class="mb-4">
				<Text text={proposal.description} />
			</div>
		{/if}
	</Card.Content>
	<Card.Footer class="block">
		{#if ballot.status === 'live'}
			<!--
				Collapsible vote form. Default-expanded for logged-in +
				eligible voters (preserves the quick-draft-from-the-list
				flow); collapsed otherwise (anonymous + ineligible voters
				see a scannable list with a click-to-preview trigger).
			-->
			<div class="mb-2 flex justify-end">
				<Button
					variant="ghost"
					size="sm"
					class="text-xs text-muted-foreground hover:text-foreground"
					onclick={() => (voteFormOpen = !voteFormOpen)}
					aria-expanded={voteFormOpen}
				>
					{voteFormOpen ? 'Hide vote options' : 'Show vote options'}
					{#if voteFormOpen}
						<ChevronUp class="h-3 w-3" aria-hidden="true" />
					{:else}
						<ChevronDown class="h-3 w-3" aria-hidden="true" />
					{/if}
				</Button>
			</div>
			{#if voteFormOpen}
				<div class="mb-4">
					<ProposalVote {proposal} {ballot} />
				</div>
			{/if}
		{/if}

		<div class="flex items-center justify-between">
			<div class="flex gap-1">
				<Button
					href={`/ballots/${ballot._id}/proposals/${proposal._id}`}
					size="sm"
					variant="secondary"
				>
					View Proposal
				</Button>
				<Comments {proposal} {ballot} />
				{#if proposal.voteCount != null}
					<VotePopover {proposal} {ballot} />
				{/if}
			</div>
		</div>
	</Card.Footer>
</Card.Root>
