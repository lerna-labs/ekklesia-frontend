<script>
	import * as Card from '$lib/components/ui/card/index.js';
	import { Copy } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import {
		convertTimestamp,
		shortenString,
		voterCredentialFromId,
		credentialLabel,
		voterDisplayName
	} from './utils';

	let { voterData } = $props();

	const userId = $derived(voterData?.userId ?? '');
	const credential = $derived(credentialLabel(voterCredentialFromId(userId)));
	const displayName = $derived(voterDisplayName(voterData));

	async function copyId() {
		if (!userId) return;
		try {
			await navigator.clipboard.writeText(userId);
			toast.success('Voter ID copied');
		} catch {
			toast.error('Could not copy to clipboard');
		}
	}
</script>

<Card.Root>
	<Card.Header class="pb-3">
		{#if credential}
			<div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{credential}
			</div>
		{/if}
		{#if displayName}
			<Card.Title class="pt-1 text-xl font-semibold leading-tight sm:text-2xl">
				{displayName}
			</Card.Title>
			<button
				type="button"
				onclick={copyId}
				title="Click to copy full Voter ID"
				class="group mt-2 inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-brand"
			>
				<span>{shortenString(userId, 24, true)}</span>
				<Copy class="h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-brand" />
			</button>
		{:else}
			<Card.Title class="pt-1">
				<button
					type="button"
					onclick={copyId}
					title="Click to copy full Voter ID"
					class="group inline-flex items-center gap-2 font-mono text-base font-semibold leading-tight hover:text-brand sm:text-lg"
				>
					<span>{shortenString(userId, 24, true)}</span>
					<Copy class="h-4 w-4 text-slate-400 transition-colors group-hover:text-brand" />
				</button>
			</Card.Title>
		{/if}
		<Card.Description class="pt-1">
			Last login: {voterData.lastLogin ? convertTimestamp(voterData.lastLogin) : 'never'}
		</Card.Description>
	</Card.Header>
	<Card.Content class="text-sm">
		<p>Ballots voted on: {voterData.ballotsVoted}</p>
		<p>Proposals voted on: {voterData.proposalsVoted}</p>
	</Card.Content>
</Card.Root>
