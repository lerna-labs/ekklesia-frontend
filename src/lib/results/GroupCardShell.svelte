<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import { formatPercent, lovelaceToAda, lovelaceToAdaCompact } from '$lib/utils.js';
  import { GROUP_ACCENTS, groupIdentity } from './groupResults.js';

  /**
   * Shared card shell that every per-voter-group result visualization sits
   * inside. Owns the identity language (accent stripe, icon chip, role
   * label), the turnout ring, and the voters / voting-power stat column.
   * Type-specific content plugs in via two snippet slots:
   *
   *   - `visualization` — the right half of the top stats band; typically
   *     holds the donut / histogram / rank chart that is specific to this
   *     vote type. Receives no args.
   *   - `details`       — full-width block under the stats band; typically
   *     the numeric breakdown table.
   *
   * The shell never renders "No votes yet" placeholders on behalf of the
   * child — each type handles its own empty states inside the
   * `visualization` snippet so the empty copy can be written in the
   * vocabulary of that vote type.
   */
  let { group, ballot, visualization, details } = $props();

  const identity = $derived(groupIdentity(group.key, group.label));
  const palette = $derived(GROUP_ACCENTS[identity.accent]);

  const hasVotes = $derived(group.activeVoters > 0);
  const hasWeight = $derived(!!ballot?.voteWeighted);
  const hasTurnoutDenom = $derived(
    group.totalAllowedVoterCount != null && group.totalAllowedVoterCount > 0,
  );
  const hasPowerDenom = $derived(group.totalVotingPower != null && group.totalVotingPower > 0);
  const turnoutPct = $derived(
    hasTurnoutDenom ? (group.activeVoters / group.totalAllowedVoterCount) * 100 : 0,
  );
  const powerPct = $derived(hasPowerDenom ? (group.activePower / group.totalVotingPower) * 100 : 0);

  // SVG ring geometry
  const RING = { size: 120, stroke: 10, radius: 50 };
  const circumference = 2 * Math.PI * RING.radius;
  const ringDashoffset = $derived(
    hasTurnoutDenom ? circumference * (1 - Math.min(1, turnoutPct / 100)) : circumference,
  );
</script>

<Card.Root class="relative overflow-hidden">
  <div class="absolute inset-y-0 left-0 w-1 {palette.bar}" aria-hidden="true"></div>

  <div class="pl-4">
    <Card.Header class="pb-3">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <div
            class="flex h-9 w-9 items-center justify-center rounded-md ring-1 ring-inset {palette.chip} {palette.icon}"
          >
            {#if identity.Icon}
              {@const Icon = identity.Icon}
              <Icon class="h-5 w-5" aria-hidden="true" />
            {/if}
          </div>
          <div>
            <div
              class="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground"
            >
              {identity.role}
            </div>
            <div class="text-lg font-semibold leading-tight">{group.label}</div>
          </div>
        </div>

        {#if !hasVotes}
          <span
            class="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-600"
          >
            No votes yet
          </span>
        {/if}
      </div>
    </Card.Header>

    <Card.Content class="pt-0">
      <div class="grid gap-6 pb-5 md:grid-cols-[auto_1fr] md:items-center">
        <!-- Participation ring + stats -->
        <div class="flex min-w-0 items-center gap-4">
          <div class="relative shrink-0" style="width: {RING.size}px; height: {RING.size}px;">
            <svg viewBox="0 0 {RING.size} {RING.size}" class="block">
              <circle
                cx={RING.size / 2}
                cy={RING.size / 2}
                r={RING.radius}
                fill="none"
                stroke="#e5e7eb"
                stroke-width={RING.stroke}
              />
              {#if hasTurnoutDenom && turnoutPct > 0}
                <circle
                  cx={RING.size / 2}
                  cy={RING.size / 2}
                  r={RING.radius}
                  fill="none"
                  stroke={palette.stroke}
                  stroke-width={RING.stroke}
                  stroke-linecap="round"
                  stroke-dasharray={circumference}
                  stroke-dashoffset={ringDashoffset}
                  transform="rotate(-90 {RING.size / 2} {RING.size / 2})"
                  style="transition: stroke-dashoffset 700ms cubic-bezier(0.2, 0.8, 0.2, 1);"
                />
              {/if}
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              {#if hasTurnoutDenom}
                <div class="font-mono text-lg font-semibold tabular-nums tracking-tight">
                  {formatPercent(turnoutPct, 1)}
                </div>
                <div class="text-[9px] uppercase tracking-widest text-muted-foreground">
                  Turnout
                </div>
              {:else}
                <div class="font-mono text-xl font-semibold tabular-nums">
                  {group.activeVoters}
                </div>
                <div class="text-[9px] uppercase tracking-widest text-muted-foreground">Voted</div>
              {/if}
            </div>
          </div>

          <div class="space-y-2">
            <div>
              <div
                class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Voters
              </div>
              <div class="whitespace-nowrap font-mono text-sm tabular-nums">
                {group.activeVoters}{#if hasTurnoutDenom}<span class="text-muted-foreground"
                    >{' / '}{group.totalAllowedVoterCount}</span
                  >{/if}
              </div>
            </div>

            {#if hasWeight}
              <div>
                <div
                  class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                >
                  Voting power
                </div>
                <div class="whitespace-nowrap font-mono text-sm tabular-nums">
                  {lovelaceToAdaCompact(group.activePower)}{#if hasPowerDenom}<span
                      class="text-muted-foreground"
                      >{' / '}{lovelaceToAdaCompact(group.totalVotingPower)}</span
                    >{/if}
                </div>
                {#if hasPowerDenom}
                  <div class="font-mono text-[10px] tabular-nums text-muted-foreground">
                    {formatPercent(powerPct, 2)} of participating stake
                  </div>
                {/if}
              </div>
            {/if}

            {#if !hasTurnoutDenom || (hasWeight && !hasPowerDenom)}
              <div class="text-[10px] uppercase italic tracking-wider text-muted-foreground">
                Participation data pending
              </div>
            {/if}
          </div>
        </div>

        <!-- Type-specific visualization slot -->
        {@render visualization?.()}
      </div>

      <!-- Type-specific details slot (table, stats panel, round-by-round, etc.) -->
      {@render details?.()}
    </Card.Content>
  </div>
</Card.Root>
