<script>
  import { loggedIn, user } from '$stores/sessionManager.js';
  import { acceptedCredentialsOf, credentialLabel, voterCredentialFromId } from '$lib/utils.js';
  import { UserX, TriangleAlert } from 'lucide-svelte';

  /**
   * Page-level ineligibility banner. Replaces the per-proposal-card
   * banner that previously rendered inside each `ProposalVote`, which
   * duplicated the same amber block N times on a long ballot. Rendered
   * once at the top of the proposals list and the proposal detail
   * pages, and only when the signed-in voter actually fails the
   * eligibility check — logged-out and eligible voters see nothing.
   */
  let { ballot } = $props();

  const acceptedCredentials = $derived(acceptedCredentialsOf(ballot));
  const voterCredential = $derived(voterCredentialFromId($user?.voterId));
  const hasTypeMismatch = $derived(
    $loggedIn &&
      !!acceptedCredentials &&
      voterCredential != null &&
      !acceptedCredentials.includes(voterCredential),
  );
  const notValidated = $derived($loggedIn && ballot?.voterValidated === false);
  const show = $derived(hasTypeMismatch || notValidated);
</script>

{#if show}
  <div
    class="mt-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    role="status"
  >
    <div class="mt-0.5 shrink-0">
      {#if hasTypeMismatch}
        <UserX class="h-5 w-5" aria-hidden="true" />
      {:else}
        <TriangleAlert class="h-5 w-5" aria-hidden="true" />
      {/if}
    </div>
    <div class="flex-1">
      <div class="font-semibold">
        {hasTypeMismatch ? 'Wrong credential type' : 'Not eligible to vote'}
      </div>
      <p class="mt-1">
        {#if hasTypeMismatch}
          This ballot accepts
          {#each acceptedCredentials as k, i}
            <span class="font-semibold">{credentialLabel(k)}</span
            >{#if i < acceptedCredentials.length - 2},
            {:else if i === acceptedCredentials.length - 2}
              &nbsp;and
            {/if}
          {/each}
          credentials only. You're logged in as
          <span class="font-semibold">{credentialLabel(voterCredential)}</span>, so vote options on
          each proposal are read-only — reconnect with an eligible wallet identity to cast a vote.
        {:else}
          You're logged in, but your
          <span class="font-semibold">{credentialLabel(voterCredential)}</span>
          identity does not meet this ballot's eligibility requirements. Vote options on each proposal
          are read-only; contact support if you believe this is wrong.
        {/if}
      </p>
    </div>
  </div>
{/if}
