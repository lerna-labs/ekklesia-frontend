<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	import { Input } from '$lib/components/ui/input/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	let { href, open } = $props();
</script>

<AlertDialog.Root bind:open trapFocus={false}>
	<AlertDialog.Content
		class="my-8 max-h-[80vh] w-[calc(100%-2rem)] max-w-[calc(32rem-2rem)] gap-0 sm:m-8 sm:w-[calc(100%-4rem)] sm:max-w-[calc(32rem-4rem)] dark:border-0"
	>
		<AlertDialog.Header>
			<AlertDialog.Title>Caution</AlertDialog.Title>
			<AlertDialog.Description>You are about open an external website.</AlertDialog.Description>
		</AlertDialog.Header>

		<Input type="text" value={href} class="mb-2 mt-4 text-sm" />

		<AlertDialog.Footer class="p-0">
			<AlertDialog.Cancel
				onclick={() => {
					dispatch('close');
					open = false;
				}}
			>
				Cancel
			</AlertDialog.Cancel>
			<AlertDialog.Action
				onclick={() => {
					dispatch('close');
					open = false;
					window.open(href, '_blank');
				}}
			>
				Continue
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
