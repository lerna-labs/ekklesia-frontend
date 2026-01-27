<script>
	import { onMount } from 'svelte';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import { loggedIn, voter } from '$stores/sessionManager';
	import { lovelaceToAda } from './utils';
	import { api } from '$stores/sessionManager.js';
    import { Checkbox } from '$lib/components/ui/checkbox/index.js';
    import { Slider } from "bits-ui";

	let { proposal, ballot } = $props();
	let options = $derived(proposal.voteOptions);
	let value = $derived(proposal.voterVote ? proposal.voterVote[0] : null);
    let sliderValue =  $derived(proposal.voterVote ? proposal.voterVote[0] : null);
	let loading = $state(true);
	let error = $state(null);
	let componentId = Math.random().toString(36).substring(2, 15);
	// track option ids that were reverted so we can show a temporary visual indicator
	let reverted = $state([]);

	// Function to handle vote change with optimistic update and rollback on failure
	// prevValue is passed so we can revert if the API request fails
	async function storeVote(newValue, prevValue) {
		if (newValue === null || newValue === undefined) return;
		loading = true;

		try {
			const voteStoreRequest = await api.fetch(fetch, '/vote/' + proposal._id, {
				method: 'POST',
				body: JSON.stringify({ vote: [newValue] }),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (voteStoreRequest.status === 200) {
				const voteStored = await voteStoreRequest.json();
				if (voteStored.changes) $voter.pendingVotesCount = true;
				toast.success('Vote updated successfully (not submitted!)');
				// value already set optimistically; keep it
			} else {
				// try to read error information and show it directly
				let errorData;
				try {
					errorData = await voteStoreRequest.json();
				} catch (e) {
					errorData = null;
				}
				const msg =
					(errorData && errorData.message) || voteStoreRequest.statusText || 'Unknown error';

				// Revert optimistic UI — set to undefined when there is no previous value so the radio clears
				value = prevValue ?? undefined;
				const prev = prevValue ? [String(prevValue)] : [];
				const next = newValue ? [String(newValue)] : [];
				const added = next.filter((id) => !prev.includes(id));
				const removed = prev.filter((id) => !next.includes(id));
				const changedIds = [...new Set([...added.map(String), ...removed.map(String)])];

				if (changedIds.length) {
					const current = reverted.map(String);
					reverted = [...reverted, ...changedIds.filter((id) => !current.includes(id))];
					setTimeout(() => {
						reverted = reverted.filter((id) => !changedIds.includes(id));
					}, 1200);
				}

				toast.error('Error storing vote: ' + msg);
				console.error('Error storing vote (server):', msg, voteStoreRequest);
				return;
			}
		} catch (err) {
			// Revert optimistic UI — set to undefined when there is no previous value so the radio clears
			value = prevValue ?? undefined;

			const prev = prevValue ? [String(prevValue)] : [];
			const next = newValue ? [String(newValue)] : [];
			const added = next.filter((id) => !prev.includes(id));
			const removed = prev.filter((id) => !next.includes(id));
			const changedIds = [...new Set([...added.map(String), ...removed.map(String)])];

			if (changedIds.length) {
				const current = reverted.map(String);
				reverted = [...reverted, ...changedIds.filter((id) => !current.includes(id))];
				setTimeout(() => {
					reverted = reverted.filter((id) => !changedIds.includes(String(id)));
				}, 1200);
			}

			// extract message from possible shapes thrown by api.fetch / SvelteKit
			let message = 'Unknown error';
			try {
				if (err && err.body) {
					if (typeof err.body === 'string') {
						message = err.body;
					} else if (err.body.message) {
						message = err.body.message;
					} else {
						message = JSON.stringify(err.body);
					}
				} else if (err && err.message) {
					message = err.message;
				}
			} catch (e) {
				if (err && err.message) message = err.message;
			}

			toast.error('Error storing vote: ' + message);
			console.error('Error storing vote:', message, err);
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		loading = false;
	});
</script>

<Card.Root class="relative h-full">
	<Card.Header>
		<Card.Title>{value ? 'Your Vote' : 'Vote now!'}</Card.Title>
		<Card.Description>
			{#if ballot.voteWeighted}
				<div class="mt-2 flex flex-col gap-1 text-xs">
					<div>
						<span class="font-semibold">Voting Power:</span>
						{lovelaceToAda(ballot.votingPower)}
					</div>
				</div>
			{/if}
		</Card.Description>
	</Card.Header>
	<Card.Content>
        <div class="mb-5 mt-5">
            <Slider.Root
    step={proposal.voteIncrement}
    min={proposal.voteOptions[0].id}
    max={proposal.voteOptions[proposal.voteOptions.length - 1].id}
    bind:value={sliderValue}
    type="single"
    trackPadding={1}
    class="relative flex touch-none select-none items-center w-full {value === 'abstain' ? 'opacity-50' : ''}"
    onValueCommit={(e) => {
        const prevValue = value;
        const newValue = sliderValue;
        value = newValue;
        storeVote(newValue, prevValue);
    }}

  >
    {#snippet children({ tickItems })}
    <span
    class="bg-slate-900 relative grow overflow-hidden rounded-full h-1.5 w-full"
>
        <Slider.Range class="bg-primary absolute w-full" />
      </span>
      <Slider.Thumb
        index={0}
        class="border-primary/75 bg-background focus-visible:ring-ring block size-4 rounded-full border shadow transition-colors focus-visible:outline-none focus-visible:ring-1 disabled:pointer-events-none disabled:opacity-50"
      />
      <Slider.ThumbLabel
        index={0}
        class="bg-slate-900 mb-3 text-nowrap rounded-md px-2 py-1 text-xs font-medium text-white"
      >
        {sliderValue}
      </Slider.ThumbLabel>
    
      {#each tickItems as { index, value } (index)}
        <Slider.Tick
          {index}
          class="bg-background z-1 h-2 w-[0px]"
        />
        {#if proposal.voteOptions.find((option) => option.id === value)}
        <Slider.TickLabel
          {index}
          class="text-slate-500 data-selected:text-black mt-4 text-xs font-medium leading-none"
          position="bottom"
        >
          {value}
        </Slider.TickLabel>
        {/if}
      {/each}
    {/snippet}
  </Slider.Root>


    </div>

        	<!-- new abstain logic -->
			{#if proposal.abstainAllowed}
            <div
                class="mb-1 flex items-center space-x-2 mt-10 {value === 'abstain' ? '' : 'opacity-50'}"
            >
                <Checkbox id="abstain" value="abstain" disabled={loading} checked={value === "abstain"} onCheckedChange={(e) => {
if(e) {
    const newValue = "abstain";
    const prevValue = value;
    sliderValue = null;
    value = newValue;
    storeVote(newValue, prevValue);
} 
}}
class={value === "abstain" ? "pointer-events-none" : ""}
          />
            <Label for="abstain" class="truncate leading-4">Abstain</Label>
        </div>
        {/if}
	</Card.Content>
</Card.Root>

