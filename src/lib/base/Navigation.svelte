<script>
	import { shortenString } from '$lib/utils.js';
	import WalletSigner from '$lib/WalletSigner/WalletSigner.svelte';
	import PendingVotesAlert from '$lib/PendingVotesAlert.svelte';
	import { user, loggedIn, logout } from '$stores/sessionManager.js';
	import { draftCount } from '$lib/draftVotes.js';
	import { Button } from '$lib/components/ui/button';
	import { User, Power } from 'lucide-svelte';
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
			<User /> {shortenString($user?.voterId, 10, true)}
		</Button>
		<Button
			size="sm"
			variant="ghost"
			class="text-white hover:bg-red-600 hover:text-white"
			onclick={logout}
			aria-label="Log out"
			title="Log out"
		>
			<Power class="h-4 w-4" aria-hidden="true" />
		</Button>
	{/if}
</nav>
