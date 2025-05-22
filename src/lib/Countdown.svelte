<script>
	import { onMount, onDestroy } from 'svelte';
	import { tweened } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';
	import dayjs from 'dayjs';
	import duration from 'dayjs/plugin/duration';
	import relativeTime from 'dayjs/plugin/relativeTime';

	// Initialize dayjs plugins
	dayjs.extend(duration);
	dayjs.extend(relativeTime);

	// Props
	/** @type {string | Date} - Target date to countdown to */
	export let targetDate;

	/** @type {boolean} - Whether to show animation */
	export let animate = true;

	/** @type {string} - Text to show when expired */
	export let expiredText = 'Expired';

	/** @type {string} - Custom class to apply to container */
	export let className = '';

	// State
	let timeLeft = {};
	let intervalId;
	let isExpired = false;

	// Animation values
	const weeks = tweened(0, { duration: 600, easing: cubicOut });
	const days = tweened(0, { duration: 600, easing: cubicOut });
	const hours = tweened(0, { duration: 600, easing: cubicOut });
	const minutes = tweened(0, { duration: 600, easing: cubicOut });
	const seconds = tweened(0, { duration: 600, easing: cubicOut });

	function updateCountdown() {
		const now = dayjs();
		const target = dayjs(targetDate);
		const diff = target.diff(now);

		if (diff <= 0) {
			isExpired = true;
			if (intervalId) clearInterval(intervalId);
			return;
		}

		const durationObj = dayjs.duration(diff);

		const newTimeLeft = {
			weeks: Math.floor(durationObj.asWeeks()),
			days: durationObj.days(),
			hours: durationObj.hours(),
			minutes: durationObj.minutes(),
			seconds: durationObj.seconds()
		};

		if (animate) {
			weeks.set(newTimeLeft.weeks);
			days.set(newTimeLeft.days);
			hours.set(newTimeLeft.hours);
			minutes.set(newTimeLeft.minutes);
			seconds.set(newTimeLeft.seconds);
		}

		timeLeft = newTimeLeft;
	}

	onMount(() => {
		updateCountdown();
		// Update every second now that we're showing seconds
		intervalId = setInterval(updateCountdown, 1000);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});
</script>

<div class="countdown-timer {className}">
	{#if isExpired}
		<div class="countdown-expired">{expiredText}</div>
	{:else}
		<div class="countdown-units">
			<div class="countdown-unit">
				<span class="countdown-value">{animate ? Math.floor($weeks) : timeLeft.weeks}</span>
				<span class="countdown-label">week{timeLeft.weeks !== 1 ? 's' : ''}</span>
			</div>
			<div class="countdown-unit">
				<span class="countdown-value">{animate ? Math.floor($days) : timeLeft.days}</span>
				<span class="countdown-label">day{timeLeft.days !== 1 ? 's' : ''}</span>
			</div>
			<div class="countdown-unit">
				<span class="countdown-value">{animate ? Math.floor($hours) : timeLeft.hours}</span>
				<span class="countdown-label">hour{timeLeft.hours !== 1 ? 's' : ''}</span>
			</div>
			<div class="countdown-unit">
				<span class="countdown-value">{animate ? Math.floor($minutes) : timeLeft.minutes}</span>
				<span class="countdown-label">minute{timeLeft.minutes !== 1 ? 's' : ''}</span>
			</div>
			<div class="countdown-unit">
				<span class="countdown-value">{animate ? Math.floor($seconds) : timeLeft.seconds}</span>
				<span class="countdown-label">second{timeLeft.seconds !== 1 ? 's' : ''}</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.countdown-timer {
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-sans);
	}

	.countdown-units {
		display: flex;
		gap: 0.75rem;
	}

	.countdown-unit {
		display: flex;
		flex-direction: column;
		align-items: center;
		min-width: 3rem;
	}

	.countdown-value {
		font-size: 1.25rem;
		font-weight: 600;
	}

	.countdown-label {
		font-size: 0.75rem;
		color: var(--muted-foreground, #6c757d);
		text-transform: lowercase;
	}

	.countdown-expired {
		font-weight: 600;
		color: var(--destructive, #dc3545);
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.8;
		}
		100% {
			opacity: 1;
		}
	}

	@media (max-width: 640px) {
		.countdown-units {
			gap: 0.5rem;
		}

		.countdown-unit {
			min-width: 2.5rem;
		}

		.countdown-value {
			font-size: 1rem;
		}

		.countdown-label {
			font-size: 0.65rem;
		}
	}
</style>
