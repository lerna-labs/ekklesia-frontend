<script>
  import { onMount, onDestroy } from 'svelte';
  import Chart from 'chart.js/auto';
  import { lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
  import { brandColor } from '$lib/base/brandColor.js';

  /**
   * Minimal histogram wrapper around Chart.js bar. Takes the backend's
   * pre-bucketed payload (`[{bucketMin, bucketMax, count, power}]`), a
   * color, and an optional "dimension" (`count` or `power`) so the same
   * bucket array drives either an unweighted or weighted histogram.
   *
   * `medianMark` — optional numeric value of the median; if provided and
   * within [min, max] we overlay a dashed vertical rule at that x-position.
   */
  let {
    buckets = [],
    dimension = 'count',
    color = '#6366f1',
    medianMark = null,
    ariaLabel = 'Distribution histogram',
  } = $props();

  let canvas;
  let chart;

  function rangeBounds(bs) {
    if (!bs.length) return { min: 0, max: 1 };
    return { min: bs[0].bucketMin, max: bs[bs.length - 1].bucketMax };
  }

  function buildConfig() {
    const labels = buckets.map((b) => {
      // Use the bucket center as the category label; show as short int.
      const mid = (b.bucketMin + b.bucketMax) / 2;
      return Number.isInteger(mid) ? String(mid) : mid.toFixed(1);
    });
    const data = buckets.map((b) => (dimension === 'power' ? b.power : b.count));
    const maxVal = data.reduce((m, v) => (v > m ? v : m), 0);

    // Median marker rendered as a Chart.js annotation-lite: we fake it
    // with a single-point line dataset aligned to the closest bucket.
    const datasets = [
      {
        data,
        backgroundColor: color,
        hoverBackgroundColor: color,
        borderColor: 'transparent',
        borderRadius: 2,
        borderSkipped: false,
        maxBarThickness: 28,
      },
    ];

    return {
      type: 'bar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 6, left: 0, right: 0, bottom: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const i = items[0].dataIndex;
                const b = buckets[i];
                if (!b) return '';
                const mn = Number.isInteger(b.bucketMin) ? b.bucketMin : b.bucketMin.toFixed(1);
                const mx = Number.isInteger(b.bucketMax) ? b.bucketMax : b.bucketMax.toFixed(1);
                return `${mn} to ${mx}`;
              },
              label: (ctx) => {
                const v = ctx.parsed.y;
                return dimension === 'power' ? lovelaceToAda(v) : `${v} vote${v === 1 ? '' : 's'}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxRotation: 0,
              autoSkip: true,
              autoSkipPadding: 8,
              font: { size: 9 },
              color: '#64748b',
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9' },
            border: { display: false },
            ticks: {
              precision: 0,
              font: { size: 9 },
              color: '#64748b',
              maxTicksLimit: 4,
              callback: (value) =>
                dimension === 'power' ? lovelaceToAdaCompact(value) : String(value),
            },
            suggestedMax: maxVal * 1.1 || 1,
          },
        },
      },
    };
  }

  function buildMedianLinePlugin() {
    // Chart.js plugin draws the median line + label directly on canvas.
    // Scoped to this component's config — doesn't register globally.
    return {
      id: 'medianMark',
      afterDatasetsDraw(c) {
        if (medianMark == null) return;
        const { min, max } = rangeBounds(buckets);
        if (max <= min) return;
        if (medianMark < min || medianMark > max) return;
        const ratio = (medianMark - min) / (max - min);
        const xAxis = c.scales.x;
        const yAxis = c.scales.y;
        const xStart = xAxis.left;
        const xEnd = xAxis.right;
        const x = xStart + (xEnd - xStart) * ratio;
        const ctx = c.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = brandColor('brand');
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.moveTo(x, yAxis.top);
        ctx.lineTo(x, yAxis.bottom);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        ctx.font = '9px ui-sans-serif, system-ui, sans-serif';
        ctx.fillStyle = brandColor('brand-hover');
        ctx.textAlign = x > (xStart + xEnd) / 2 ? 'right' : 'left';
        const label =
          'Median ' + (Number.isInteger(medianMark) ? medianMark : medianMark.toFixed(1));
        const tx = ctx.textAlign === 'right' ? x - 4 : x + 4;
        ctx.fillText(label, tx, yAxis.top + 9);
        ctx.restore();
      },
    };
  }

  function create() {
    if (!canvas) return;
    if (chart) {
      try {
        chart.destroy();
      } catch {}
      chart = null;
    }
    const cfg = buildConfig();
    cfg.plugins = [buildMedianLinePlugin()];
    chart = new Chart(canvas.getContext('2d'), cfg);
  }

  onMount(create);
  onDestroy(() => {
    if (chart) {
      try {
        chart.destroy();
      } catch {}
    }
  });

  // React on any input change — simplest to redraw
  $effect(() => {
    buckets;
    dimension;
    color;
    medianMark;
    if (chart) create();
  });
</script>

<div class="relative h-full w-full" role="img" aria-label={ariaLabel}>
  <canvas bind:this={canvas}></canvas>
</div>
