<script>
  let {
    lowerBound = 0,
    upperBound = 100,
    median = 50,
    lowerLabel = '',
    upperLabel = '',
    class: className = '',
  } = $props();

  // Ensure median is within bounds
  const clampedMedian = $derived(Math.max(lowerBound, Math.min(upperBound, median)));

  // Calculate the position of the median as a percentage
  const medianPosition = $derived.by(() => {
    if (upperBound === lowerBound) return 50;
    return ((clampedMedian - lowerBound) / (upperBound - lowerBound)) * 100;
  });

  // Format labels - use provided labels or default to bound values
  const displayLowerLabel = $derived(lowerLabel || lowerBound.toString());
  const displayUpperLabel = $derived(upperLabel || upperBound.toString());
</script>

<div class="median-scale-container {className}">
  <div class="scale-wrapper">
    <div class="scale-background"></div>
    <div class="median-rectangle" style="left: {medianPosition}%"></div>
  </div>

  <!-- Labels row -->
  <div class="mt-2 flex justify-between text-xs text-muted-foreground">
    <span class="font-medium">{displayLowerLabel}</span>
    <span class="font-medium">{displayUpperLabel}</span>
  </div>
</div>

<style>
  .median-scale-container {
    width: 100%;
    overflow: visible;
  }

  .scale-wrapper {
    position: relative;
    width: 100%;
    height: 16px;
    overflow: visible;
    display: flex;
    align-items: center;
  }

  .scale-background {
    width: 100%;
    height: 6px;
    background-color: #e5e7eb;
    border-radius: 3px;
  }

  .median-rectangle {
    position: absolute;
    width: 4px;
    height: 12px;
    background-color: #f97316;
    border-radius: 2px;
    transform: translateX(-50%);
    top: 50%;
    margin-top: -6px;
  }
</style>
