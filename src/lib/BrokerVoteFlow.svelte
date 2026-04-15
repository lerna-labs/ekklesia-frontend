<script>
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import WalletMinimalIcon from '@lucide/svelte/icons/wallet-minimal';
	import { TriangleAlert } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { user } from '$stores/sessionManager.js';
	import { invalidateAll } from '$app/navigation';

	import WalletConnect from '$lib/WalletSigner/WalletConnect.svelte';
	import { signData as signWithWallet } from '$lib/WalletSigner/WalletSigner.js';
	import SignerCommand from '$lib/WalletSigner/SignerCommand.svelte';
	import {
		postDraft,
		postSignature,
		postSubmit,
		getPendingBallotVotes,
		toWitness,
		merkleRootPayloadHex
	} from '$lib/broker.js';
	import ConfirmationModal from '$lib/ConfirmationModal.svelte';

	/**
	 * @type {{
	 *   ballot: any,
	 *   buttonText?: string,
	 *   existingPackage?: any,
	 *   triggerVariant?: 'default' | 'outline'
	 * }}
	 */
	let {
		ballot,
		buttonText = 'Submit Votes',
		existingPackage = null,
		triggerVariant = 'default'
	} = $props();

	// Cosigner mode = caller handed us an in-flight package (typically surfaced
	// by ballot-detail auto-discovery via /v1/votes/:ballotId/packages). We
	// skip the /draft round-trip and go straight to the signing step on open.
	const isCosigner = $derived(!!existingPackage);

	let open = $state(false);
	let phase = $state('idle');
	/** @type {string|null} */ let errorMessage = $state(null);

	// Draft state
	/** @type {{id:string,status:string,nonce:number}|null} */
	let pkg = $state(null);
	/** @type {string|null} */ let merkleRoot = $state(null);
	/** @type {any} */ let multisigState = $state(null);

	// Confirmation state
	let confirmationOpen = $state(false);
	/** @type {string|undefined} */ let hydraTxId = $state(undefined);
	/** @type {string|undefined} */ let ipfsCid = $state(undefined);
	/** @type {string|undefined} */ let confirmedAt = $state(undefined);

	// Wallet / CardanoSigner shared state
	let tab = $state('wallet');
	let connecting = $state(false);
	/** @type {any} */ let connectedWallet = $state(undefined);
	let cardanoSignerJSON = $state('');

	const signType = $derived.by(() => detectSignType());

	// Signer address for wallet.signData(). Matches the current v0 convention
	// used by SignerWallet.svelte: bech32 for the connected identity, except
	// `pool` uses the Calidus bech32 when present on the user.
	const signerAddress = $derived.by(() => {
		if (!connectedWallet) return undefined;
		if (signType === 'pool' && $user?.calidusID) return $user.calidusID;
		return connectedWallet.address;
	});

	function resetFlow() {
		phase = 'idle';
		errorMessage = null;
		pkg = null;
		merkleRoot = null;
		multisigState = null;
		cardanoSignerJSON = '';
	}

	function close() {
		open = false;
		resetFlow();
	}

	function seedFromExistingPackage() {
		if (!existingPackage) return;
		pkg = {
			id: existingPackage.id || existingPackage._id?.toString(),
			status: existingPackage.status,
			nonce: existingPackage.nonce
		};
		merkleRoot = existingPackage.merkleRoot ?? null;
		multisigState = existingPackage.multisig ?? null;
		phase = merkleRoot ? 'awaiting-signature' : 'failed';
		if (!merkleRoot) {
			errorMessage = 'Package is missing its signing payload — please re-draft.';
		}
	}

	async function startDraft() {
		if (isCosigner) {
			seedFromExistingPackage();
			return;
		}

		errorMessage = null;
		phase = 'drafting';

		let votes;
		try {
			votes = await getPendingBallotVotes(fetch, ballot._id);
		} catch (err) {
			phase = 'idle';
			errorMessage = err?.body?.message || err?.message || 'Could not load your pending votes';
			toast.error(errorMessage);
			return;
		}
		if (!votes.length) {
			phase = 'idle';
			errorMessage = 'No pending votes for this ballot. Make a selection first.';
			toast.error(errorMessage);
			return;
		}

		// `nativeScript` and `calidusDeclaration` are belt-and-suspenders. The
		// backend can auto-pull the cached nativeScript from the User doc
		// (see BACKEND_PREREQS.md §2) so either path works; sending it
		// explicitly is still correct and keeps the client honest if the
		// multisig state on the server is somehow stale.
		const body = { votes };
		if ($user?.multiSig && $user?.nativeScript) body.nativeScript = $user.nativeScript;
		// Pool voters using a CIP-151 Calidus hot key declare it on draft so
		// the broker knows which subordinate key it's about to see as the
		// witness signer.
		const signType_ = detectSignType();
		if (signType_ === 'pool' && $user?.calidusID) {
			body.calidusDeclaration = { calidusId: $user.calidusID };
		}

		let draft;
		try {
			draft = await postDraft(fetch, ballot._id, body);
		} catch (err) {
			phase = 'failed';
			errorMessage = err?.body?.message || err?.message || 'Draft failed';
			toast.error(errorMessage);
			return;
		}
		if (draft?.status === 'error' || !draft?.merkleRoot) {
			phase = 'failed';
			errorMessage = draft?.message || 'Draft failed';
			toast.error(errorMessage);
			return;
		}

		pkg = draft.package;
		merkleRoot = draft.merkleRoot;
		multisigState = draft.multisig ?? null;
		phase = 'awaiting-signature';
	}

	function detectSignType() {
		const id = $user?.voterId ?? '';
		if (id.startsWith('stake')) return 'stake';
		if (id.startsWith('pool')) return 'pool';
		if (id.startsWith('drep')) return 'drep';
		if (id.startsWith('addr')) return 'addr';
		return 'stake';
	}

	async function submitWitness(coseSign1Hex, coseKeyHex) {
		if (!pkg || !merkleRoot) return;
		phase = 'submitting';

		let res;
		try {
			res = await postSignature(fetch, ballot._id, pkg.id, toWitness(coseSign1Hex, coseKeyHex));
		} catch (err) {
			phase = 'failed';
			errorMessage = err?.body?.message || err?.message || 'Submission failed';
			toast.error(errorMessage);
			return;
		}

		if (res?.status === 'error') {
			phase = 'failed';
			errorMessage = res.message || 'Submission failed';
			toast.error(errorMessage);
			return;
		}

		if (res?.submitted) {
			// Key-based or last-cosigner multisig — Hydra confirmation lands inline.
			const p = res.package || {};
			hydraTxId = p.hydraTxId ?? undefined;
			ipfsCid = p.ipfsCid ?? undefined;
			confirmedAt = p.confirmedAt ?? undefined;
			phase = 'confirmed';
			open = false;
			confirmationOpen = true;
			await invalidateAll();
			return;
		}

		// Multisig — threshold not yet satisfied. Stay open and show outstanding keys.
		multisigState = res.multisig ?? null;
		phase = 'awaiting-cosigners';
	}

	async function signWithConnectedWallet() {
		if (!merkleRoot || !signerAddress) return;
		const payloadHex = merkleRootPayloadHex(merkleRoot);
		const signature = await signWithWallet(connectedWallet, signerAddress, payloadHex);
		if (signature?.error) {
			toast.error(signature.error);
			return;
		}
		// CIP-30 signData returns `{ signature, key }` where `signature` is the
		// COSE_Sign1 hex and `key` is the COSE key hex.
		await submitWitness(signature.signature, signature.key);
	}

	async function submitPastedSignerJSON() {
		let parsed;
		try {
			parsed = JSON.parse(cardanoSignerJSON);
		} catch {
			toast.error('Invalid JSON — paste the raw CardanoSigner output');
			return;
		}
		if (!parsed?.signature || !parsed?.key) {
			toast.error('JSON must include both `signature` and `key` fields');
			return;
		}
		await submitWitness(parsed.signature, parsed.key);
	}

	async function retrySubmission() {
		if (!pkg) return;
		phase = 'submitting';
		let res;
		try {
			res = await postSubmit(fetch, ballot._id, pkg.id);
		} catch (err) {
			phase = 'failed';
			errorMessage = err?.body?.message || err?.message || 'Retry failed';
			toast.error(errorMessage);
			return;
		}
		if (res?.status === 'error') {
			phase = 'failed';
			errorMessage = res.message || 'Retry failed';
			toast.error(errorMessage);
			return;
		}
		const p = res.package || {};
		if (p.status === 'hydra-confirmed') {
			hydraTxId = p.hydraTxId ?? undefined;
			ipfsCid = p.ipfsCid ?? undefined;
			confirmedAt = p.confirmedAt ?? undefined;
			phase = 'confirmed';
			open = false;
			confirmationOpen = true;
			await invalidateAll();
		} else {
			errorMessage = 'Package is in state: ' + p.status;
			phase = 'failed';
		}
	}
</script>

<AlertDialog.Root bind:open onOpenChange={(o) => { if (!o) resetFlow(); }}>
	<AlertDialog.Trigger>
		<Button size="sm" variant={triggerVariant} onclick={startDraft}>
			<WalletMinimalIcon class="size-4 shrink-0" aria-hidden="true" />
			{buttonText}
		</Button>
	</AlertDialog.Trigger>

	<AlertDialog.Content class="flex max-h-[85vh] max-w-[440px] flex-col overflow-hidden p-5">
		<AlertDialog.Header class="shrink-0">
			<AlertDialog.Title>
				{isCosigner ? 'Add your cosigner signature' : 'Submit votes on-chain'}
			</AlertDialog.Title>
			<AlertDialog.Description class="text-sm">
				{#if isCosigner}
					A vote package for <span class="font-semibold">{ballot.title}</span> is already
					waiting for your signature. Sign the same Merkle root as the other cosigners to
					satisfy the multisig threshold.
				{:else}
					Your selections for <span class="font-semibold">{ballot.title}</span> will be
					packaged, signed with your wallet, and committed to the Hydra voting head.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
			{#if phase === 'drafting' || phase === 'submitting'}
				<p class="py-8 text-center text-sm text-muted-foreground">
					{phase === 'drafting' ? 'Preparing your signing payload…' : 'Submitting to Hydra…'}
				</p>
			{:else if phase === 'awaiting-signature' && merkleRoot}
				<p class="mb-3 text-sm text-muted-foreground">
					Sign the following Merkle root with your wallet to commit your votes. You are NOT signing
					a transaction — only a receipt that binds your selections to this ballot.
				</p>
				<div class="mb-3 rounded bg-muted p-2 font-mono text-xs break-all">{merkleRoot}</div>

				<Tabs.Root bind:value={tab}>
					<Tabs.List class="mb-2 flex w-full justify-evenly">
						<Tabs.Trigger value="wallet">Connect Wallet</Tabs.Trigger>
						<Tabs.Trigger value="signer">Use CardanoSigner</Tabs.Trigger>
					</Tabs.List>

					<Tabs.Content value="wallet">
						<WalletConnect
							{signType}
							bind:loading={connecting}
							on:connected={(e) => (connectedWallet = e.detail)}
							on:nowallets={() => (tab = 'signer')}
						/>
						<Button
							class="mt-2 w-full"
							onclick={signWithConnectedWallet}
							disabled={!connectedWallet || connecting}
						>
							{connecting ? 'Waiting…' : connectedWallet ? 'Sign Merkle Root' : 'Select a wallet'}
						</Button>
					</Tabs.Content>

					<Tabs.Content value="signer">
						<SignerCommand
							signerAddress={$user?.voterId}
							{signType}
							dataHex={merkleRootPayloadHex(merkleRoot)}
							payload={{ merkleRoot, dataHex: merkleRootPayloadHex(merkleRoot) }}
						/>
						<Textarea
							placeholder="Paste the JSON output from CardanoSigner here"
							class="mt-2 max-h-[200px] min-h-[80px] w-full resize-none overflow-y-auto text-xs"
							bind:value={cardanoSignerJSON}
							rows={4}
						/>
						<Button
							class="mt-2 w-full"
							onclick={submitPastedSignerJSON}
							disabled={!cardanoSignerJSON}
						>
							Submit signature
						</Button>
					</Tabs.Content>
				</Tabs.Root>
			{:else if phase === 'awaiting-cosigners' && multisigState}
				<p class="mb-3 text-sm">
					Your signature was accepted. This multisig ballot still needs
					<span class="font-semibold">{multisigState.outstandingKeys?.length ?? 0}</span>
					more signature{(multisigState.outstandingKeys?.length ?? 0) === 1 ? '' : 's'} before it can
					be submitted to Hydra.
				</p>
				<div class="rounded border bg-muted p-2 text-xs">
					<div class="mb-1 font-semibold">Outstanding signers ({multisigState.required} required)</div>
					<ul class="space-y-1 font-mono">
						{#each multisigState.outstandingKeys ?? [] as k}
							<li class="break-all">{k}</li>
						{/each}
					</ul>
				</div>
				<p class="mt-3 text-xs text-muted-foreground">
					Each remaining cosigner should log in as this script identity and revisit this ballot to
					add their signature.
				</p>
			{:else if phase === 'failed'}
				<div class="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
					<div class="mb-1 flex items-center gap-2 font-semibold">
						<TriangleAlert class="h-4 w-4" />
						Submission failed
					</div>
					<p class="text-xs">{errorMessage}</p>
					{#if pkg}
						<Button variant="outline" size="sm" class="mt-3" onclick={retrySubmission}>
							Retry submission
						</Button>
					{/if}
				</div>
			{:else}
				<p class="py-8 text-center text-sm text-muted-foreground">Getting things ready…</p>
			{/if}
		</div>

		<AlertDialog.Footer class="mt-4 shrink-0">
			<Button variant="outline" onclick={close}>Cancel</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<ConfirmationModal bind:open={confirmationOpen} {hydraTxId} {ipfsCid} {confirmedAt} />
