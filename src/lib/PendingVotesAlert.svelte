<script>
	import { BellRing } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button/index.js';
</script>

<Button class="bg-orange-600 hover:bg-orange-700" size="sm" href="/dashboard/#pending-votes">
	<div class="ring-animation">
		<BellRing />
	</div>
	Unsubmitted Votes!
</Button>

<style>
	.ring-animation {
		display: inline-block;
		animation: ring 4s ease-in-out infinite;
		transform-origin: 50% 0;
	}

	@keyframes ring {
		0% {
			transform: rotate(0);
		}
		1% {
			transform: rotate(15deg);
		}
		3% {
			transform: rotate(-13deg);
		}
		5% {
			transform: rotate(11deg);
		}
		7% {
			transform: rotate(-9deg);
		}
		9% {
			transform: rotate(7deg);
		}
		11% {
			transform: rotate(-5deg);
		}
		13% {
			transform: rotate(3deg);
		}
		15% {
			transform: rotate(-1deg);
		}
		17% {
			transform: rotate(0);
		}
	}
</style>
