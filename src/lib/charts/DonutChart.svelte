<script>
	import { tweened } from 'svelte/motion';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import { PieChart, Text } from 'layerchart';

	let { segments = [], title, valueUnit = '', maxHeight = 300, innerRadius = 0.75 } = $props();

	function slug(label) {
		if (typeof label !== 'string') return String(label);
		return label.toLowerCase().replace(/\s+/g, '_');
	}

	const targetValues = $derived(segments.map((s) => Number(s.value) || 0));
	const tweenOpts = {
		duration: 400,
		easing: (t) => t * (2 - t),
		interpolate: (a, b) => (t) =>
			Array.from(
				{ length: Math.max(a.length, b.length) },
				(_, i) => (a[i] ?? 0) + t * ((b[i] ?? 0) - (a[i] ?? 0))
			)
	};
	const tweenedValues = tweened([], tweenOpts);

	$effect(() => {
		const next = segments.map((s) => Number(s.value) || 0);
		tweenedValues.set(next, tweenOpts);
	});

	const chartData = $derived(
		segments.map((s, i) => ({
			name: slug(s.label),
			label: s.label,
			value: $tweenedValues[i] ?? Number(s.value) ?? 0,
			color: s.color || '#e5e7eb'
		}))
	);

	const chartConfig = $derived.by(() => {
		const config = { value: { label: title || 'Share' } };
		for (const s of segments) {
			const key = slug(s.label);
			config[key] = { label: s.label, color: s.color || '#e5e7eb' };
		}
		return config;
	});

	// Use tweened values for center text so it animates with the chart
	const highestIndex = $derived.by(() => {
		const vals = $tweenedValues;
		if (!vals.length && segments.length) {
			let maxIdx = 0;
			for (let i = 1; i < segments.length; i++) {
				if (Number(segments[i].value) > Number(segments[maxIdx].value)) maxIdx = i;
			}
			return maxIdx;
		}
		if (!vals.length) return -1;
		let maxIdx = 0;
		for (let i = 1; i < vals.length; i++) {
			if (vals[i] > vals[maxIdx]) maxIdx = i;
		}
		return maxIdx;
	});
	const highestPercent = $derived.by(() => {
		if (highestIndex < 0 || !segments[highestIndex]) return '0';
		const val = $tweenedValues[highestIndex];
		const num = val != null ? val : Number(segments[highestIndex].value) || 0;
		return Math.min(100, num).toFixed(1);
	});
	const highestLabel = $derived(highestIndex >= 0 && segments[highestIndex] ? segments[highestIndex].label : '');
</script>

<section class="donut-chart-section flex flex-col rounded-xl bg-muted/40 px-3 pt-3 pb-0" data-donut-chart>
	{#if title}
		<header class="align-left mb-4 text-xs font-semibold">{title}</header>
	{/if}
		<Chart.Container config={chartConfig} class="mx-auto w-full max-w-full min-h-0 flex-1 aspect-square" style="max-height:{maxHeight}px">
		<PieChart
			data={chartData}
			key="name"
			value="value"
			c="color"
			innerRadius={innerRadius}
			outerRadius={1}
			padding={0}
			legend={false}
			props={{ pie: { motion: 'tween' } }}
		>
			{#snippet aboveMarks()}
				<Text
					value={highestPercent + '%'}
					textAnchor="middle"
					verticalAnchor="middle"
					class="fill-foreground text-3xl! font-bold"
					dy={-8}
				/>
				<Text
					value={highestLabel}
					textAnchor="middle"
					verticalAnchor="middle"
					class="fill-muted-foreground! text-muted-foreground"
					dy={8}
				/>
			{/snippet}
			{#snippet tooltip()}
				<Chart.Tooltip hideLabel class="donut-tooltip-content">
					{#snippet formatter({ name, index, value, item, payload })}
						{@const configKey = typeof name === 'string' ? slug(name) : (item?.name != null ? slug(String(item.name)) : '')}
						{@const seg = segments.find((s) => slug(s.label) === configKey)}
						{@const segmentConfig = chartConfig[configKey]}
						{@const lineColor = segmentConfig?.color ?? seg?.color ?? item?.color ?? '#e5e7eb'}
						{@const absolute = seg?.count ?? value}
						{@const absoluteStr = seg?.absoluteLabel != null ? String(seg.absoluteLabel) : (typeof absolute === 'number' ? absolute.toLocaleString() : String(absolute))}
						{@const showUnit = seg?.absoluteLabel == null && valueUnit}
						{@const numValue = typeof value === 'number' ? value : Number(value) || 0}
						{@const relativeStr = numValue.toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%'}
						{@const labelText = segmentConfig?.label ?? seg?.label ?? name ?? item?.name ?? '—'}
						<div class="donut-tooltip-item">
							<!-- Line 1: indicator + label + absolute value -->
							<div class="donut-tooltip-row">
								<span
									class="donut-tooltip-indicator"
									style="background:{lineColor};width:4px;min-width:4px;height:14px;flex-shrink:0;display:block;border-radius:2px;"
									aria-hidden="true"
								></span>
								<span class="donut-tooltip-label">{labelText}</span>
								<span class="donut-tooltip-absolute">{absoluteStr}{showUnit ? ' ' + valueUnit : ''}</span>
							</div>
							<!-- Line 2: relative % right-aligned -->
							<div class="donut-tooltip-secondary">
								<span class="donut-tooltip-relative">{relativeStr}</span>
							</div>
						</div>
					{/snippet}
				</Chart.Tooltip>
			{/snippet}
		</PieChart>
	</Chart.Container>
	{#if segments.length}
		<div class="donut-legend" role="list" aria-label="Legend">
			{#each segments as seg}
				<div class="donut-legend-item" role="listitem">
					<span
						class="donut-legend-swatch"
						style="background-color: {seg.color ?? '#e5e7eb'}"
						aria-hidden="true"
					></span>
					<span class="text-muted-foreground">{seg.label}</span>
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.donut-legend {
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
		display: flex !important;
		flex-direction: column !important;
		gap: 0.0625rem 0 !important;
		text-align: left;
		font-family: inherit;
	}
	.donut-legend-item {
		display: flex !important;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.65rem;
		font-family: inherit;
	}
	.donut-legend-swatch {
		width: 0.5rem;
		height: 0.5rem;
		flex-shrink: 0;
		border-radius: 2px;
	}
	/* Allow tooltip to escape chart bounds */
	:global(.donut-chart-section .lc-tooltip-context-container),
	:global(.donut-chart-section .lc-root-container) {
		overflow: visible !important;
	}
	:global(.donut-tooltip-content) {
		width: max-content !important;
		min-width: 0 !important;
		max-width: 280px !important;
		font-family: inherit !important;
	}
	:global(.donut-tooltip-content *) {
		font-family: inherit !important;
	}
	:global(.donut-tooltip-content .grid > div) {
		display: block !important;
	}
	/* Tooltip item: column layout so Total row stacks below */
	:global(.donut-tooltip-content .donut-tooltip-item) {
		display: flex !important;
		flex-direction: column !important;
		gap: 0 !important;
		min-width: 0 !important;
		width: 100% !important;
	}
	/* Row: indicator + label + values */
	:global(.donut-tooltip-content .donut-tooltip-row) {
		display: flex !important;
		align-items: center !important;
		gap: 0.5rem !important;
		min-height: 20px !important;
	}
	/* Colored indicator bar - force visibility; color from inline style */
	:global(.donut-tooltip-content .donut-tooltip-indicator) {
		width: 4px !important;
		min-width: 4px !important;
		height: 14px !important;
		max-height: 14px !important;
		flex-shrink: 0 !important;
		display: block !important;
		border-radius: 2px !important;
	}
	:global(.donut-tooltip-content .donut-tooltip-label) {
		flex: 1 1 auto !important;
		min-width: 0 !important;
		color: var(--muted-foreground) !important;
		font-size: 0.75rem !important;
	}
	:global(.donut-tooltip-content .donut-tooltip-absolute) {
		font-weight: 500 !important;
		font-variant-numeric: tabular-nums !important;
		line-height: 1.25 !important;
		margin-left: auto !important;
	}
	:global(.donut-tooltip-content .donut-tooltip-secondary) {
		display: flex !important;
		justify-content: flex-end !important;
		padding-left: calc(4px + 0.5rem) !important; /* indent past indicator+gap */
	}
	:global(.donut-tooltip-content .donut-tooltip-relative) {
		font-size: 0.65rem !important;
		color: var(--muted-foreground) !important;
		font-weight: 400 !important;
		line-height: 1.25 !important;
	}
</style>
