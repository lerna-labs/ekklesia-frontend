<script>
	import { shortenString } from '$lib/utils.js';
	import WalletSigner from '$lib/WalletSigner/WalletSigner.svelte';
	import PendingVotesAlert from '$lib/PendingVotesAlert.svelte';
	import { user, loggedIn } from '$stores/sessionManager.js';
	import { draftCount } from '$lib/draftVotes.js';
	import { Button } from '$lib/components/ui/button';
	import { User } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
</script>

<nav class="flex gap-1">
	{#if $draftCount > 0}
		<div in:fade={{ duration: 300 }} out:fade={{ duration: 300 }} class="flex items-center">
			<PendingVotesAlert />
		</div>
	{/if}
	{#if !$loggedIn}
		<WalletSigner mode="login" dark={true} />
	{:else}
		<Button href="/dashboard" size="sm" class="bg-white text-black hover:bg-gray-200">
			<User /> {shortenString($user?.voterId, 10, true)}</Button
		>
	{/if}
</nav>
