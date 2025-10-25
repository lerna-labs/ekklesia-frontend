<script>
	import { onMount, onDestroy } from 'svelte';
	// Chart.js v3+ automatic registration
	import Chart from 'chart.js/auto';

	// Props
	export let data = { labels: [], datasets: [] };
	// If the parent doesn't pass options, we use our defaults. Keep undefined
	// as the sentinel for "not provided" so callers can pass an empty object
	// intentionally if they want to override everything.
	export let options = undefined;
	export let plugins = [];
	export let title;

	// If the parent wants a full redraw instead of in-place update, toggle this
	export let redraw = false;

	let canvas;
	let chart;

	function deepClone(obj) {
		try {
			return JSON.parse(JSON.stringify(obj));
		} catch (e) {
			// Fallback: return the reference (Chart will attempt to work with it)
			return obj;
		}
	}

	function applyDatasetDefaults(dataObj) {
		if (!dataObj) return dataObj;
		// Ensure datasets array exists
		if (!Array.isArray(dataObj.datasets)) return dataObj;

		// Apply defaults to each dataset: remove borders by default
		dataObj.datasets = dataObj.datasets.map((ds) => {
			// If dataset is a primitive or not an object, leave it
			if (!ds || typeof ds !== 'object') return ds;
			const copy = Object.assign({}, ds);
			if (copy.borderWidth === undefined) copy.borderWidth = 0;
			if (copy.borderColor === undefined) copy.borderColor = 'transparent';
			return copy;
		});

		return dataObj;
	}

	// Default options used when the parent doesn't provide any `options` prop.
	const defaultOptions = {
		responsive: true,
		plugins: {
			legend: { display: false, position: 'bottom' },
			title: { display: false },
			tooltip: {
				displayColors: true,
				callbacks: {
					label: function (context) {
						const data = context.chart.data;
						const value = context.parsed !== undefined ? context.parsed : context.raw;
						// compute total of the first dataset (common for doughnut)
						const total =
							data.datasets[0] && Array.isArray(data.datasets[0].data)
								? data.datasets[0].data.reduce((a, b) => a + (Number(b) || 0), 0)
								: 0;
						const pct = total ? ((Number(value) / total) * 100).toFixed(2) : '0.00';
						return `${pct}%`;
					}
				},
				labelColor: {
					borderColor: 'transparent',
					borderWidth: 0
				},
				boxPadding: 4
			}
		}
	};

	function createChart() {
		if (!canvas) return;
		// Ensure any previous chart is removed
		if (chart) {
			try {
				chart.destroy();
			} catch (e) {}
			chart = null;
		}

		const cfg = {
			type: 'doughnut',
			data: applyDatasetDefaults(deepClone(data) || { labels: [], datasets: [] }),
			// Use provided options if set, otherwise defaultOptions
			options: options === undefined ? defaultOptions : options,
			plugins: plugins || []
		};

		chart = new Chart(canvas.getContext('2d'), cfg);
		return chart;
	}

	// Create chart when component mounts
	onMount(() => {
		createChart();
	});

	// Clean up
	onDestroy(() => {
		if (chart) {
			try {
				chart.destroy();
			} catch (e) {}
			chart = null;
		}
	});

	// Reactively update chart when `data`, `options`, or `plugins` change
	$: if (chart && data) {
		// If caller requested full redraw, recreate chart
		if (redraw) {
			createChart();
		} else {
			// Update data and options in-place for smoother transitions
			try {
				chart.data = applyDatasetDefaults(deepClone(data));
				// If options was not provided, ensure we use the component defaults
				if (options === undefined) {
					chart.options = defaultOptions;
				} else {
					chart.options = options;
				}
				if (plugins) chart.config.plugins = plugins;
				chart.update();
			} catch (e) {
				// If update failed for structural reasons, recreate chart
				createChart();
			}
		}
	}
</script>

<section class="">
	<header class="align-left mb-2 text-xs font-semibold">{title}</header>
	<canvas bind:this={canvas} style="display:block; max-width:100%;"></canvas>
</section>
