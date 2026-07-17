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
    listPackages,
    deletePackage,
    toWitness,
    merkleRootPayloadHex,
  } from '$lib/broker.js';
  import { clearBallotDrafts } from '$lib/draftVotes.js';
  import { ERROR_CODES } from '$lib/voteSchema.js';
  import { loadSignerPreference, saveSignerPreference } from '$lib/signerPreferences.js';
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
    triggerVariant = 'default',
  } = $props();

  // Cosigner mode = caller handed us an in-flight package (typically surfaced
  // by ballot-detail auto-discovery via /v1/votes/:ballotId/packages). We
  // skip the /draft round-trip and go straight to the signing step on open.
  const isCosigner = $derived(!!existingPackage);

  let open = $state(false);
  let phase = $state('idle');
  /** @type {string|null} */ let errorMessage = $state(null);
  /** @type {string|null} */ let errorCode = $state(null);
  /** @type {string|null} */ let errorQuestionId = $state(null);
  // Package-id pulled off a PACKAGE_ALREADY_SIGNED response body so the
  // Cancel+Redraft affordance knows which package to DELETE before
  // re-calling /draft.
  /** @type {string|null} */ let errorPackageId = $state(null);
  let cancelling = $state(false);

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

  // Wallet / CardanoSigner shared state. Initial tab follows the voter's
  // remembered signer tool if one is on file so returning voters don't
  // have to re-pick. `preselectedWallet` is then fed to WalletConnect
  // to auto-connect the same CIP-30 wallet.
  const initialPreference = loadSignerPreference();
  let tab = $state(initialPreference?.kind === 'signer' ? 'signer' : 'wallet');
  const preselectedWallet = $derived(
    initialPreference?.kind === 'wallet' ? initialPreference.walletName : null,
  );
  let connecting = $state(false);
  /** @type {any} */ let connectedWallet = $state(undefined);
  let cardanoSignerJSON = $state('');

  const signType = $derived.by(() => detectSignType());

  // Signer address for wallet.signData(). Matches the current v0 convention
  // used by SignerWallet.svelte: bech32 for the connected identity, except
  // `pool` uses the Calidus bech32 when present on the user.
  //
  // DRep: CIP-30 signData would need an address-shaped hex (not a raw
  // 32-byte pub key); CIP-95 signData — where present — is happy with the
  // bech32 drep1… since it embeds the key hash as payload. Prefer
  // $user.voterId, which is the drep1… bech32 post-login and works for
  // both routes.
  const signerAddress = $derived.by(() => {
    if (!connectedWallet) return undefined;
    if (signType === 'pool' && $user?.calidusID) return $user.calidusID;
    if (signType === 'drep' && $user?.drepIdHex) return $user.drepIdHex;
    return connectedWallet.address;
  });

  function resetFlow() {
    phase = 'idle';
    errorMessage = null;
    errorCode = null;
    errorQuestionId = null;
    errorPackageId = null;
    pkg = null;
    merkleRoot = null;
    multisigState = null;
    cardanoSignerJSON = '';
  }

  // Pull Hydra-shaped error details off either a thrown fetch error's
  // `body` or a JSON response body that carried `status:'error'`.
  // Schema v2 delta §"Error code routing": INVALID_VOTE vs INVALID_INPUT
  // drive different voter-facing copy. A failing questionId, when
  // present, is surfaced so the voter knows which question to revisit.
  function captureError(payload, fallback) {
    const src = payload?.body ?? payload ?? {};
    errorCode = src.code || src.errorCode || null;
    errorQuestionId = src.questionId || src.failingQuestionId || null;
    // PACKAGE_ALREADY_SIGNED (409 on /draft) returns the offending
    // package so the frontend can offer a Cancel+Redraft UX.
    errorPackageId = src.package?.id || src.package?._id || null;
    errorMessage = src.message || payload?.message || fallback;
  }

  const errorHeading = $derived(
    errorCode === ERROR_CODES.INVALID_VOTE
      ? 'Your vote needs a fix'
      : errorCode === ERROR_CODES.INVALID_INPUT
        ? 'Ballot definition rejected'
        : errorCode === ERROR_CODES.PACKAGE_ALREADY_SIGNED
          ? 'Cosigners have already signed'
          : 'Submission failed',
  );

  // Cancel button: if we have our own in-flight (non-cosigner) package,
  // DELETE it server-side so the nonce is released and the
  // "N packages awaiting action" banner doesn't carry a ghost. Cosigner
  // flows close without touching the server (the package belongs to the
  // drafter, not us).
  async function cancel() {
    const candidateId = pkg?.id ?? errorPackageId;
    if (candidateId && !isCosigner && phase !== 'confirmed') {
      cancelling = true;
      try {
        await deletePackage(fetch, ballot._id, candidateId);
      } catch (err) {
        console.warn('Cancel → delete failed:', err?.body?.message || err?.message);
      }
      cancelling = false;
    }
    open = false;
    resetFlow();
  }

  // PACKAGE_ALREADY_SIGNED recovery: delete the stuck package and
  // immediately re-enter the draft flow with the voter's current
  // selections. The fresh /draft will mint a new nonce + merkleRoot.
  async function cancelAndRedraft() {
    if (!errorPackageId) return;
    cancelling = true;
    try {
      await deletePackage(fetch, ballot._id, errorPackageId);
    } catch (err) {
      console.warn('Redraft → delete failed:', err?.body?.message || err?.message);
      toast.error('Could not cancel the stuck package — please try again.');
      cancelling = false;
      return;
    }
    cancelling = false;
    resetFlow();
    await startDraft();
  }

  function seedFromExistingPackage() {
    if (!existingPackage) return;
    pkg = {
      id: existingPackage.id || existingPackage._id?.toString(),
      status: existingPackage.status,
      nonce: existingPackage.nonce,
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
    errorCode = null;
    errorQuestionId = null;
    phase = 'drafting';

    // Pre-flight: if this voter already has an active package for this
    // ballot, resume it instead of asking the backend for a new draft.
    // The nonce is stable between draft calls (it only advances on
    // Hydra landing) so the existing package is logically the same as
    // whatever a fresh /draft would return — we just skip the round-trip.
    try {
      const existing = await listPackages(fetch, ballot._id);
      const resumable = existing.find(
        (p) => p.status === 'awaiting-signatures' || p.status === 'awaiting-submission',
      );
      if (resumable && resumable.merkleRoot) {
        pkg = {
          id: resumable.id || resumable._id?.toString(),
          status: resumable.status,
          nonce: resumable.nonce,
        };
        merkleRoot = resumable.merkleRoot;
        multisigState = resumable.multisig ?? null;
        phase = resumable.status === 'awaiting-submission' ? 'failed' : 'awaiting-signature';
        if (resumable.status === 'awaiting-submission') {
          errorMessage =
            'A previous submission attempt stalled — retry it, or it will clear itself.';
        }
        return;
      }
    } catch (err) {
      // Soft-fail: if the listing blew up, fall through to a fresh draft
      // rather than blocking the voter. They'll see the fresh-draft path.
      console.warn('Package pre-flight failed, creating fresh draft:', err?.message || err);
    }

    let votes;
    try {
      votes = await getPendingBallotVotes(fetch, ballot._id);
    } catch (err) {
      phase = 'idle';
      captureError(err, 'Could not load your pending votes');
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
      captureError(err, 'Draft failed');
      toast.error(errorMessage);
      return;
    }
    if (draft?.status === 'error' || !draft?.merkleRoot) {
      phase = 'failed';
      captureError(draft, 'Draft failed');
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
      captureError(err, 'Submission failed');
      toast.error(errorMessage);
      return;
    }

    if (res?.status === 'error') {
      phase = 'failed';
      captureError(res, 'Submission failed');
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
      // Drafts now live in the Hydra head — wipe the local cache for
      // this ballot so the "unsubmitted draft" badge clears and
      // re-drafting on this same ballot starts from an empty slate.
      clearBallotDrafts(ballot._id);
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
    const signature = await signWithWallet(connectedWallet, signerAddress, payloadHex, signType);
    if (signature?.error) {
      toast.error(signature.error);
      return;
    }
    // CIP-30 signData returns `{ signature, key }` where `signature` is the
    // COSE_Sign1 hex and `key` is the COSE key hex.
    // Remember the wallet choice so the next modal open skips the picker.
    if (connectedWallet?.walletName) {
      saveSignerPreference({ kind: 'wallet', walletName: connectedWallet.walletName });
    }
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
    // Accept both CIP-30 wallet naming (`signature` / `key`) and
    // CardanoSigner's CIP-8 naming (`COSE_Sign1_hex` / `COSE_Key_hex`).
    const coseSign1Hex = parsed?.signature ?? parsed?.COSE_Sign1_hex;
    const coseKeyHex = parsed?.key ?? parsed?.COSE_Key_hex;
    if (!coseSign1Hex || !coseKeyHex) {
      toast.error(
        'JSON must include `signature`+`key` (wallets) or `COSE_Sign1_hex`+`COSE_Key_hex` (CardanoSigner)',
      );
      return;
    }
    // Remember that this voter prefers the offline signer path.
    saveSignerPreference({ kind: 'signer' });
    await submitWitness(coseSign1Hex, coseKeyHex);
  }

  async function retrySubmission() {
    if (!pkg) return;
    phase = 'submitting';
    let res;
    try {
      res = await postSubmit(fetch, ballot._id, pkg.id);
    } catch (err) {
      phase = 'failed';
      captureError(err, 'Retry failed');
      toast.error(errorMessage);
      return;
    }
    if (res?.status === 'error') {
      phase = 'failed';
      captureError(res, 'Retry failed');
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
      clearBallotDrafts(ballot._id);
      await invalidateAll();
    } else {
      errorMessage = 'Package is in state: ' + p.status;
      phase = 'failed';
    }
  }
</script>

<AlertDialog.Root
  bind:open
  onOpenChange={(o) => {
    // Dismissing the dialog (Escape, click-outside when allowed) is
    // treated the same as Cancel: if we drafted a package this session,
    // tell the server to release it so the nonce is recycled and no
    // ghost surfaces on the dashboard banner.
    if (!o) {
      const candidateId = pkg?.id ?? errorPackageId;
      if (candidateId && !isCosigner && phase !== 'confirmed') {
        deletePackage(fetch, ballot._id, candidateId).catch((err) => {
          console.warn('Dialog-dismiss → delete failed:', err?.body?.message || err?.message);
        });
      }
      resetFlow();
    }
  }}
>
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
          A vote package for <span class="font-semibold">{ballot.title}</span> is already waiting for
          your signature. Sign the same Merkle root as the other cosigners to satisfy the multisig threshold.
        {:else}
          Your selections for <span class="font-semibold">{ballot.title}</span> will be packaged, signed
          with your wallet, and committed to the Hydra voting head.
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
        <div class="mb-3 break-all rounded bg-muted p-2 font-mono text-xs">{merkleRoot}</div>

        <Tabs.Root bind:value={tab}>
          <Tabs.List class="mb-2 flex w-full justify-evenly">
            <Tabs.Trigger value="wallet">Connect Wallet</Tabs.Trigger>
            <Tabs.Trigger value="signer">Use CardanoSigner</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="wallet">
            <WalletConnect
              {signType}
              {preselectedWallet}
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
          <div class="mb-1 font-semibold">
            Outstanding signers ({multisigState.required} required)
          </div>
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
            {errorHeading}
          </div>
          <p class="text-xs">{errorMessage}</p>
          {#if errorQuestionId}
            <p class="mt-2 text-[11px] text-amber-800">
              Failing question ID:
              <code class="rounded bg-amber-100 px-1 py-0.5 font-mono">{errorQuestionId}</code>
            </p>
          {/if}
          {#if errorCode === ERROR_CODES.INVALID_VOTE}
            <p class="mt-2 text-[11px]">
              Close this dialog and revisit the highlighted question — typical causes are a partial
              ranking, an off-grid rating, or an allocation that doesn't sum to the budget.
            </p>
          {:else if errorCode === ERROR_CODES.INVALID_INPUT}
            <p class="mt-2 text-[11px]">
              This error comes from the ballot definition itself, not your selections. Contact the
              ballot author — it can't be resolved from the voter side.
            </p>
          {:else if errorCode === ERROR_CODES.PACKAGE_ALREADY_SIGNED}
            <p class="mt-2 text-[11px]">
              A cosigner has already signed the existing package for your original selections. Your
              updated selections can't overwrite what was already signed — cancel the signed package
              and draft a fresh one. The other cosigners will need to sign the new one.
            </p>
          {/if}
          {#if errorCode === ERROR_CODES.PACKAGE_ALREADY_SIGNED && errorPackageId}
            <Button
              variant="outline"
              size="sm"
              class="mt-3"
              onclick={cancelAndRedraft}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel package and redraft'}
            </Button>
          {:else if pkg && errorCode !== ERROR_CODES.INVALID_VOTE && errorCode !== ERROR_CODES.INVALID_INPUT}
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
      <Button variant="outline" onclick={cancel} disabled={cancelling}>
        {cancelling ? 'Cancelling…' : 'Cancel'}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<ConfirmationModal bind:open={confirmationOpen} {hydraTxId} {ipfsCid} {confirmedAt} />
