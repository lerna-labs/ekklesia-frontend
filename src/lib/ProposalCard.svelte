<script>
	import { get } from 'svelte/store';
	import MarkdownBrief from './base/MarkdownBrief.svelte';
	import { loggedIn, user } from './../stores/sessionManager.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import ProposalVote from '$lib/ProposalVote.svelte';
	import VotePopover from './VotePopover.svelte';
	import ProposalDetails from './ProposalDetails.svelte';
	import {
		draftsTree,
		submittedTree,
		draftHasSelection,
		draftIsAbstaining,
		draftIsCleared,
		isProposalDraftDivergent
	} from '$lib/draftVotes.js';
	import { acceptedCredentialsOf, voterCredentialFromId } from '$lib/utils.js';
	import { CircleCheck, Circle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-svelte';
	let { proposal, ballot } = $props();

	// Three-state vote indicator:
	//   empty (slate-300)   — voter hasn't touched this proposal
	//   amber               — divergent local draft OR an in-flight
	//                         VotePackage; i.e. a pending intent that
	//                         hasn't landed on Hydra yet
	//   emerald             — Hydra-confirmed submission recorded AND
	//                         the local draft (rehydrated from /mine)
	//                         still matches it
	//
	// Drafts get rehydrated from the server-side submitted state on every
	// page load — so "has local draft" alone doesn't imply "voter has
	// pending changes". Compare against the submitted baseline to tell
	// whether the local draft would actually change anything on submit.
	const localDraft = $derived($draftsTree?.[ballot._id]?.[proposal._id] ?? null);
	const hasLocalSelection = $derived(draftHasSelection(localDraft));
	const isLocalAbstaining = $derived(draftIsAbstaining(localDraft));
	const isLocalCleared = $derived(draftIsCleared(localDraft));
	// `cleared` is a real draft entry — it's the voter's explicit intent to
	// remove their prior vote. Counting it as "has draft" prevents the
	// fallback to `voterVote` below from masking a cleared state with the
	// previously-submitted selection.
	const hasLocalDraft = $derived(hasLocalSelection || isLocalAbstaining || isLocalCleared);
	const isDivergent = $derived.by(() => {
		void $draftsTree;
		void $submittedTree;
		return isProposalDraftDivergent(ballot._id, proposal._id);
	});

	// Server-side submission seeded by the proposals loader from
	// /v1/votes/:ballotId/mine. `voterVote` is the schema-v2
	// VoteSelection — `{abstain: true}` or `{selection: [...]}`.
	// `voterVoteStatus` is 'confirmed' | 'in-flight'.
	const serverAbstaining = $derived(proposal.voterVote?.abstain === true);
	const serverHasSelection = $derived(
		Array.isArray(proposal.voterVote?.selection) && proposal.voterVote.selection.length > 0
	);

	// What the indicator should actually show. Local draft wins on shape
	// (selection vs abstain vs cleared); color reflects whether anything
	// is pending — either a divergent edit OR an in-flight package that
	// hasn't yet landed on Hydra.
	const hasSelection = $derived(hasLocalSelection || (!hasLocalDraft && serverHasSelection));
	const isAbstaining = $derived(isLocalAbstaining || (!hasLocalDraft && serverAbstaining));
	const hasDraft = $derived(hasSelection || isAbstaining || isLocalCleared);
	const isPending = $derived(
		isDivergent || proposal.voterVoteStatus === 'in-flight'
	);
	const isConfirmed = $derived(!isPending && proposal.voterVoteStatus === 'confirmed');

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
						class:text-emerald-600={hasDraft && isConfirmed}
						class:text-amber-600={hasDraft && isPending}
						class:text-slate-300={!hasDraft}
						title={(() => {
							if (isLocalCleared) {
								return "You've cleared your previously-submitted vote on this proposal — submit to remove it from the on-chain record.";
							}
							if (!hasDraft) return 'Not yet voted';
							if (isConfirmed) {
								return isAbstaining
									? 'Your abstention on this proposal is recorded on Hydra'
									: 'Your vote on this proposal is recorded on Hydra';
							}
							// pending
							return isAbstaining
								? 'You have a pending abstention on this proposal (not yet submitted)'
								: 'You have a pending vote on this proposal (not yet submitted)';
						})()}
					>
						{#if isAbstaining}
							<MinusCircle
								class="h-5 w-5"
								aria-label={isConfirmed ? 'Abstention submitted' : 'Abstention pending'}
							/>
						{:else if hasSelection}
							<CircleCheck
								class="h-5 w-5"
								aria-label={isConfirmed ? 'Vote submitted' : 'Vote pending'}
							/>
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
				<MarkdownBrief markdown={proposal.summary} inline headings="flatten" breaks />
			</div>
		{:else if proposal.description}
			<div class="mb-4">
				<MarkdownBrief markdown={proposal.description} inline headings="flatten" breaks />
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
					variant="outline"
				>
					View Proposal
				</Button>
				{#if proposal.voteCount != null}
					<VotePopover {proposal} {ballot} />
				{/if}
			</div>
		</div>
	</Card.Footer>
</Card.Root>
