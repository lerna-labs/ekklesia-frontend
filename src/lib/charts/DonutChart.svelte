<script>
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { PieChart } from 'layerchart';

	let { segments = [], title } = $props();

	function slug(label) {
		if (typeof label !== 'string') return String(label);
		return label.toLowerCase().replace(/\s+/g, '_');
	}

	const chartData = $derived(
		segments.map((s) => ({
			name: slug(s.label),
			value: Number(s.value) || 0,
			color: s.color || '#e5e7eb'
		}))
	);

	const chartConfig = $derived.by(() => {
		const config = { value: { label: 'Value' } };
		for (const s of segments) {
			const key = slug(s.label);
			config[key] = { label: s.label, color: s.color || '#e5e7eb' };
		}
		return config;
	});
</script>

<section class="">
	{#if title}
		<header class="align-left mb-4 text-xs font-semibold">{title}</header>
	{/if}
	<Chart.Container config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
		<PieChart
			data={chartData}
			key="name"
			value="value"
			c="color"
			innerRadius={60}
			padding={29}
			props={{ pie: { motion: 'tween' } }}
		>
			{#snippet tooltip()}
				<Chart.Tooltip hideLabel />
			{/snippet}
		</PieChart>
	</Chart.Container>
</section>
