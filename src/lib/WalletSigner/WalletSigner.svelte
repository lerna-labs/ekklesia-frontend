<script>
  import { Label } from '$lib/components/ui/label/index.js';
  import { Switch } from '$lib/components/ui/switch/index.js';
  import { loggedIn, user, setJWT, showLogin, redirectAfterLogin } from '$stores/sessionManager.js';
  import { refreshUserSession } from '$lib/config.js';
  import { saveSignerPreference } from '$lib/signerPreferences.js';
  import { saveCalidusID } from '$lib/calidusCache.js';
  import { get } from 'svelte/store';
  import Wallet from '$lib/WalletSigner/SignerWallet.svelte';
  import CardanoSigner from '$lib/WalletSigner/SignerCS.svelte';
  import SelectSignType from '$lib/WalletSigner/SignerSignType.svelte';
  import { Input } from '$lib/components/ui/input/index.js';
  import { Button } from '$lib/components/ui/button';
  import WalletMinimalIcon from '@lucide/svelte/icons/wallet-minimal';
  import { toast } from 'svelte-sonner';
  import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import { goto, invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import { log } from '$lib/WalletSigner/logger.js';

  let { ballot = false, mode, dark, tx, buttonText = 'Submit Votes' } = $props();
  let open = $state(false);
  let selected = $state('wallet');
  let noWallets = $state(false);
  let walletLoading = $state(false);

  // Sign-type source of truth is env-gated + localStorage-persisted so returning
  // voters don't have to re-pick each time.
  const SIGNTYPE_STORAGE_KEY = 'walletSigner_signType';
  const allowedTypes = (import.meta.env.VITE_WALLETSIGNER_USER_TYPES || 'stake').split(',');
  const defaultFromEnv = import.meta.env.VITE_WALLETSIGNER_USER_DEFAULT || 'stake';
  const storedSignType =
    typeof window !== 'undefined' ? localStorage.getItem(SIGNTYPE_STORAGE_KEY) : null;
  const initialSignType =
    storedSignType && allowedTypes.includes(storedSignType)
      ? storedSignType
      : allowedTypes.includes(defaultFromEnv)
        ? defaultFromEnv
        : allowedTypes[0] || 'stake';

  let signType = $state(initialSignType);
  const multisigEnabledByEnv = import.meta.env.VITE_WALLETSIGNER_MULTISIG === 'true';
  let multiSig = $state($user?.multiSig || '');
  let poolId = $state($user?.voterId || '');
  let scriptAddress = $derived.by(() => {
    if (multiSig && $loggedIn) {
      return $user.voterId;
    }
    return '';
  });

  // Force multisig off when the deployment hasn't enabled it.
  $effect(() => {
    if (!multisigEnabledByEnv) multiSig = false;
  });

  $effect(() => {
    if ($user?.voterId?.startsWith('stake')) signType = 'stake';
    else if ($user?.voterId?.startsWith('pool')) signType = 'pool';
    else if ($user?.voterId?.startsWith('drep')) signType = 'drep';
    else if ($user?.voterId?.startsWith('addr')) signType = 'addr';
  });

  // Programmatic-open / deep-link-after-login hook-up. Clicks on anchors
  // marked `data-walletsigner-action="navigateAfterLogin"` open the login
  // dialog and remember the target URL for post-login goto().
  onMount(() => {
    const handleClick = (e) => {
      const el = e.target.closest?.('[data-walletsigner-action]');
      if (!el || el.dataset.walletsignerAction !== 'navigateAfterLogin') return;
      if (get(loggedIn)) return;
      e.preventDefault();
      e.stopPropagation();
      // Refuse foreign-origin targets so a stray injected/authored anchor
      // can't turn login completion into an off-site redirect.
      try {
        const target = new URL(el.href, window.location.origin);
        if (target.origin !== window.location.origin) return;
        redirectAfterLogin.set(target.pathname + target.search + target.hash);
      } catch {
        return;
      }
      showLogin.set(true);
    };
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  });

  // Two-way sync with the showLogin store so other components can trigger login.
  $effect(() => {
    if ($showLogin) open = true;
  });
  $effect(() => {
    if (open) showLogin.set(true);
  });

  // success
  async function submitSuccess(event) {
    toast.success(event.detail.message);
    $user.pendingVoteCount = -1;
    $user.lastTransaction = event.detail.transaction;
    await invalidateAll();
    open = false;
    showLogin.set(false);
  }

  // store token
  async function storeToken(event) {
    const { token, expiresIn, walletName, calidusID } = event.detail;
    setJWT(token, expiresIn);
    loggedIn.set(true);
    toast.success('Login successful');
    // Merged /dashboard/ + /session/ read so the store picks up
    // nativeScript, pendingPackages, and isAdmin in one go.
    const userData = await refreshUserSession(fetch);
    // GET /v0/session/ doesn't carry calidusID today (see
    // .claude/trds/BACKEND_GET_SESSION_CALIDUS.md). Capture the bech32
    // from the login response, persist it for future SPA boots, and
    // merge it onto $user so the broker sign path has a signer
    // address for pool voters.
    if (calidusID && userData?.userId) {
      saveCalidusID(userData.userId, calidusID);
      userData.calidusID = calidusID;
    }
    user.set(userData);

    // Capture the signer path chosen at login so the voter's first
    // broker submission auto-selects the same tool — no need to
    // re-pick the wallet they just used to authenticate. `selected`
    // is the currently-active tab on this dialog (wallet / signer).
    if (selected === 'wallet' && walletName) {
      saveSignerPreference({ kind: 'wallet', walletName });
    } else if (selected === 'signer') {
      saveSignerPreference({ kind: 'signer' });
    }

    open = false;
    showLogin.set(false);
    // Redirect target is picked up from the click interceptor (if any).
    // When no explicit target was captured, stay on the current page and
    // just re-run loads so protected content populates.
    const path = get(redirectAfterLogin);
    redirectAfterLogin.set(null);
    // Defense-in-depth: only follow same-origin absolute paths. `//host/...`
    // is protocol-relative and would escape the origin, so reject it.
    if (path && path.startsWith('/') && !path.startsWith('//')) {
      await goto(path);
    } else {
      await invalidateAll();
    }
  }

  function close() {
    noWallets = false;
    open = false;
    showLogin.set(false);
  }

  function onSignTypeChange(e) {
    signType = e.detail;
    if (typeof window !== 'undefined') {
      localStorage.setItem(SIGNTYPE_STORAGE_KEY, e.detail);
    }
    log('Sign type selected', e.detail);
  }
</script>

<AlertDialog.Root bind:open on:openChange={close}>
  <AlertDialog.Trigger>
    <Button size="sm" class={dark ? 'bg-white text-black hover:bg-gray-200' : ''}>
      <WalletMinimalIcon class="size-4 shrink-0" aria-hidden="true" />
      {mode == 'login' ? 'Connect Wallet' : buttonText}
    </Button>
  </AlertDialog.Trigger>
  <AlertDialog.Content
    class="flex max-h-[85vh] max-w-[320px] flex-col overflow-hidden p-4"
    interactOutsideBehavior="close"
  >
    <AlertDialog.Header class="mb-1 shrink-0">
      <AlertDialog.Title class="flex justify-between">
        {mode == 'login' ? 'Login' : 'Submit Votes'}
        {#if multisigEnabledByEnv}
          <div class="flex items-center gap-2">
            <Label
              for="multisigsupport"
              class="ml-2 text-sm {multiSig ? 'text-black' : 'text-slate-500'}">MultiSig</Label
            >
            <Switch id="multisigsupport" bind:checked={multiSig} />
          </div>
        {/if}
      </AlertDialog.Title>
      <AlertDialog.Description>
        Use your CIP-95 compatible wallet or the
        <a href="https://github.com/gitmachtl/cardano-signer" target="_blank" class="link"
          >CardanoSigner</a
        > to sign.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <Tabs.Root class="w-full" bind:value={selected}>
        <Tabs.List class="mb-2 flex w-full justify-evenly">
          <Tabs.Trigger value="wallet" disabled={noWallets}>Connect Wallet</Tabs.Trigger>
          <Tabs.Trigger value="signer">Use CardanoSigner</Tabs.Trigger>
        </Tabs.List>

        {#if multiSig}
          {#if !$loggedIn}
            <Input
              type="text"
              bind:value={scriptAddress}
              class="mb-2"
              placeholder="Enter MultiSig DRep-ID"
            />
            <SelectSignType
              value={signType}
              mode={selected}
              disabled={walletLoading}
              on:change={onSignTypeChange}
            />
          {:else}
            <Input type="text" value={$user.voterId} disabled class="mb-2" />
            <SelectSignType
              value={signType}
              mode={selected}
              disabled={walletLoading}
              on:change={onSignTypeChange}
            />
          {/if}
        {/if}

        {#if !multiSig}
          {#if !$loggedIn}
            <SelectSignType
              value={signType}
              mode={selected}
              disabled={walletLoading}
              on:change={onSignTypeChange}
            />
            {#if signType === 'pool' && selected === 'wallet'}
              <Input
                type="text"
                placeholder="Please enter your Pool ID"
                class="mb-2"
                bind:value={poolId}
              />
            {/if}
          {:else if selected === 'wallet'}
            <Input type="text" value={$user.voterId} disabled />
          {/if}
        {/if}

        <Tabs.Content value="wallet">
          <Wallet
            bind:loading={walletLoading}
            {signType}
            {mode}
            {ballot}
            {multiSig}
            {scriptAddress}
            {tx}
            {poolId}
            on:success={submitSuccess}
            on:login={storeToken}
            on:nowallets={() => {
              noWallets = true;
              selected = 'signer';
            }}
            on:cancel={close}
          />
        </Tabs.Content>

        <Tabs.Content value="signer">
          <CardanoSigner
            {signType}
            {mode}
            {ballot}
            {multiSig}
            {scriptAddress}
            {tx}
            on:login={storeToken}
            on:success={submitSuccess}
            on:cancel={close}
          />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  </AlertDialog.Content>
</AlertDialog.Root>
