<script>
	import { onMount } from 'svelte';
	import { LayoutGrid, List } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { on } from 'svelte/events';
	let { onChange } = $props();

	// Initialize with default, will be updated in onMount
	let view = $state('grid');

	// Load view preference from localStorage on component mount
	onMount(() => {
		const savedView = localStorage.getItem('proposalViewPreference');
		if (savedView) {
			view = savedView;
		}
	});

	// Update localStorage when view changes
	function updateViewPreference(newView) {
		view = newView;
		localStorage.setItem('proposalViewPreference', newView);
		onChange(newView);
	}
</script>

{#if view == 'grid'}
	<Button class="pl-3 pr-3" variant="outline" onclick={() => updateViewPreference('list')}>
		<List />
	</Button>
{:else}
	<Button class="pl-3 pr-3" variant="outline" onclick={() => updateViewPreference('grid')}>
		<LayoutGrid />
	</Button>
{/if}
