<script>
	import { versionInfo } from '$stores/versionStore';
	import { onMount } from 'svelte';
	import NetworkCheck from './NetworkCheck.svelte';
</script>

<div class="w-full bg-slate-900">
	<footer class="m-auto max-w-3xl items-center justify-between bg-slate-900 p-4 text-slate-300">
		<div class="mb-8 mt-1 leading-7">
			<h3 class="font-medium">
				Ekklesia <span class="font-light">/ɪˈkli.zi.ə/</span>
			</h3>

			<p class="text-light mb-4 italic">
				&mdash; An assembly of citizens called out from their homes into some public place for
				deliberation.
			</p>
		</div>

		<div class="w-full items-center text-xs text-slate-400 sm:flex sm:justify-between">
			<div class="mb-1">
				&copy; Adam Dean & Mad Orkestra 2025 | Version {$versionInfo.version}
			</div>
			{#if $versionInfo.buildTime}
				<!-- <NetworkCheck> -->
				<span class="ml-1 text-gray-500">
					(Built: {new Date($versionInfo.buildTime).toLocaleDateString()})
				</span>
				<!-- </NetworkCheck> -->
			{/if}
		</div>
	</footer>
</div>
