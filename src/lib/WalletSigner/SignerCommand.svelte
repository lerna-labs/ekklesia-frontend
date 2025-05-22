<script>
	import { toast } from 'svelte-sonner';
	import { Copy } from 'lucide-svelte';
	let { signType, signerAddress, dataHex } = $props();
	const NETWORK = import.meta.env.VITE_NETWORK_ID;
	console.log(NETWORK);
	const testNetMagic = NETWORK == 1 ? '' : '--testnet-magic xxx';

	function copyCommand() {
		// Create the complete command text with proper substitutions
		const command = `./cardano-signer sign --cip30 --data-hex "${dataHex}" --address ${signerAddress} --secret-key ${signType}.skey --json ${testNetMagic}`;

		// Copy the formatted command
		navigator.clipboard.writeText(command);

		toast.success('Command copied to clipboard');
	}
</script>

<button
	type="button"
	class="copyPayload"
	aria-label="Copy command to clipboard"
	onclick={(e) => {
		e.preventDefault();
		copyCommand();
	}}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			copyCommand();
		}
	}}
>
	<div class="copyButton">
		<Copy size={14} />
	</div>

	<pre class="w-full overflow-y-hidden bg-slate-100 text-xs">
./cardano-signer sign --cip30 --data-hex "{dataHex}" \
--address {signerAddress} \
--secret-key {signType}.skey \
--json {testNetMagic}
</pre>
</button>

<style>
	.copyPayload {
		position: relative;
		text-align: left;
		display: block;
		margin-top: 0;
	}

	.copyButton {
		position: absolute;
		top: 1rem;
		right: 0.5rem;
	}

	pre {
		padding: 1rem;
		border-radius: 0.5rem;
		box-sizing: border-box;
		width: 100%;
		overflow-x: auto; /* Allow horizontal scrolling */
		white-space: pre-wrap; /* Wrap text when needed */
		word-break: break-word; /* Break words to prevent overflow */
		font-size: 0.6rem; /* Slightly smaller font */
		line-height: 1.5; /* Better line spacing */
	}
</style>
