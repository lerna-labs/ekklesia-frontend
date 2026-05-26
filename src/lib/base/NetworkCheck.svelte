<script>
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { page } from '$app/stores';
	let { serverStatus } = $page.data;
	let { children } = $props();

	// The backend's health endpoint currently returns a lot of internals
	// (node version, memory usage, uptime, database internals). None of
	// that belongs in the public UI — the popover only surfaces fields a
	// visitor actually needs to know: the network this deployment is
	// talking to, the environment label, and the frontend build. Backend
	// fingerprinting fields are intentionally ignored here; the backend
	// should also stop returning them.
</script>

{#if serverStatus}
	<Popover.Root>
		<Popover.Trigger class={children ? 'children' : 'w-full'}>
			{#if children}
				{@render children()}
			{:else}
				<div
					class="w-full bg-network-warning p-2 text-center text-xs font-semibold uppercase text-network-warning-foreground"
				>
					{serverStatus.network}
				</div>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-[320px] text-xs">
			<h1 class="mb-2 text-sm font-bold">Deployment</h1>

			<div class="grid grid-cols-2 gap-x-4 gap-y-1">
				{#if serverStatus.network}
					<div><span class="font-semibold">Network:</span> {serverStatus.network}</div>
				{/if}
				{#if serverStatus.networkId != null}
					<div><span class="font-semibold">Network ID:</span> {serverStatus.networkId}</div>
				{/if}
				{#if serverStatus.environment}
					<div><span class="font-semibold">Environment:</span> {serverStatus.environment}</div>
				{/if}
				{#if serverStatus.status}
					<div><span class="font-semibold">Status:</span> {serverStatus.status}</div>
				{/if}
			</div>

			{#if serverStatus.frontend?.version || serverStatus.frontend?.buildTime}
				<h2 class="mb-1 mt-3 text-sm font-bold">Frontend</h2>
				<div class="grid grid-cols-2 gap-x-4 gap-y-1">
					{#if serverStatus.frontend.version}
						<div><span class="font-semibold">Version:</span> {serverStatus.frontend.version}</div>
					{/if}
					{#if serverStatus.frontend.buildTime}
						<div class="whitespace-nowrap">
							<span class="font-semibold">Build:</span>
							{new Date(serverStatus.frontend.buildTime).toLocaleString()}
						</div>
					{/if}
				</div>
			{/if}
		</Popover.Content>
	</Popover.Root>
{/if}
