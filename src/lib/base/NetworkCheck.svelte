<script>
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { page } from '$app/stores';
	let { serverStatus } = $page.data;
	let { children } = $props();
</script>

{#if serverStatus}
	<Popover.Root>
		<Popover.Trigger class={children ? 'children' : 'w-full'}>
			{#if children}
				{@render children()}
			{:else}
				<div
					class="w-full bg-orange-600 p-2 text-center text-xs font-semibold uppercase text-white"
				>
					{serverStatus.network}
				</div>
			{/if}
		</Popover.Trigger>
		<Popover.Content class="w-[450px] text-xs">
			<h1 class="mb-2 text-sm font-bold">Server Info</h1>

			<div class="grid grid-cols-2 gap-x-4 gap-y-1">
				<div><span class="font-semibold">Status:</span> {serverStatus.status}</div>
				<div><span class="font-semibold">Message:</span> {serverStatus.message}</div>
				<div><span class="font-semibold">Environment:</span> {serverStatus.environment}</div>
				<div><span class="font-semibold">Network ID:</span> {serverStatus.networkId}</div>
				<div class="whitespace-nowrap">
					<span class="font-semibold">Timestamp:</span>
					{new Date(serverStatus.timestamp).toLocaleString()}
				</div>
			</div>

			<h2 class="mb-1 mt-3 text-sm font-bold">Server</h2>
			<div class="grid grid-cols-2 gap-x-4 gap-y-1">
				<div class="whitespace-nowrap">
					<span class="whitespace-nowrap font-semibold">Uptime:</span>
					{serverStatus.server.uptime}
				</div>
				<div><span class="font-semibold">Version:</span> {serverStatus.server.version}</div>
				<div>
					<span class="font-semibold">Node Version:</span>
					{serverStatus.server.nodeVersion}
				</div>
			</div>

			<h3 class="mb-1 mt-2 text-sm font-bold">Memory Usage</h3>
			<div class="grid grid-cols-3 gap-x-2 gap-y-1">
				<div><span class="font-semibold">RSS:</span> {serverStatus.server.memoryUsage.rss}</div>
				<div>
					<span class="font-semibold">Heap Total:</span>
					{serverStatus.server.memoryUsage.heapTotal}
				</div>
				<div>
					<span class="font-semibold">Heap Used:</span>
					{serverStatus.server.memoryUsage.heapUsed}
				</div>
			</div>

			<h2 class="mb-1 mt-3 text-sm font-bold">Frontend</h2>
			<div class="grid grid-cols-2 gap-x-4 gap-y-1">
				<div><span class="font-semibold">Version:</span> {serverStatus.frontend.version}</div>
				<div class="whitespace-nowrap">
					<span class="font-semibold">Build Time:</span>
					{new Date(serverStatus.frontend.buildTime).toLocaleString()}
				</div>
			</div>

			<h2 class="mb-1 mt-3 text-sm font-bold">Database</h2>
			<div class="grid grid-cols-2 gap-x-4 gap-y-1">
				<div><span class="font-semibold">Status:</span> {serverStatus.database.status}</div>
				<div><span class="font-semibold">Message:</span> {serverStatus.database.message}</div>
			</div>
		</Popover.Content>
	</Popover.Root>
{/if}
