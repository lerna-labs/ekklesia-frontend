<script>
	import { shortenString } from '$lib/utils.js';
	import WalletSigner from '$lib/WalletSigner/WalletSigner.svelte';
	import PendingVotesAlert from '$lib/PendingVotesAlert.svelte';
	import { api, user, loggedIn } from '$stores/sessionManager.js';
	import { Button } from '$lib/components/ui/button';
	import { User } from 'lucide-svelte';
	import { afterNavigate } from '$app/navigation';
	import { fade } from 'svelte/transition';

	let pendingVotesCount = $state(0);
	$effect(() => {
		if ($user) {
			pendingVotesCount = $user.pendingVotesCount || 0;
		}
		if ($user?.pendingVotesCount) {
			pendingVotesCount = $user.pendingVotesCount;
		} else {
			pendingVotesCount = 0;
		}
	});
</script>

<nav class="flex gap-1">
	{#if pendingVotesCount || $user?.pendingVotesCount}
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
