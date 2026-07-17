import { api } from '$stores/sessionManager.js';
import { normalizeBallot } from '$lib/utils.js';
import { loadMyBallotVotes, mineToProposalAnnotations } from '$lib/broker.js';
import { error } from '@sveltejs/kit';

export async function load({ fetch, params, url }) {
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '25';
  const sort = url.searchParams.get('sort');
  const dir = url.searchParams.get('dir') || 'desc';
  const search = url.searchParams.get('search') || '';

  // Build the v1 facet query string. The endpoint accepts:
  //   ?page, ?limit, ?sort, ?dir
  //   ?filter[<facetKey>]=<csv>
  //   ?search=<text> (free-text across title + summary + authors.name)
  const qp = new URLSearchParams();
  qp.set('page', page);
  qp.set('limit', limit);
  if (sort) {
    qp.set('sort', sort);
    qp.set('dir', dir);
  }
  if (search.trim()) {
    qp.set('search', search.trim());
  }
  for (const [key, val] of url.searchParams.entries()) {
    if (key.startsWith('filter[') && val) {
      qp.set(key, val);
    }
  }

  // Fetch ballot + proposals via v1 in parallel. Also fetch v0 ballot
  // detail for the auth-dependent voterValidated field until the backend
  // surfaces it on v1, and the voter's /mine packages so we can seed the
  // vote forms with their previously-submitted selections. /mine is a
  // best-effort call — returns null when not authenticated or when the
  // ballot is legacy — so the public proposals endpoint stays voter-
  // agnostic and cacheable for third-party consumers.
  const [ballotV1, ballotV0, proposalsResponse, mine] = await Promise.all([
    api.v1.fetch(fetch, '/ballots/' + params.ballotId),
    api.fetch(fetch, '/ballots/' + params.ballotId),
    api.v1.fetch(fetch, '/proposals/ballot/' + params.ballotId + '?' + qp.toString()),
    loadMyBallotVotes(fetch, params.ballotId),
  ]);

  if (ballotV1.status !== 200) {
    throw error(ballotV1.status, 'Ballot not found');
  }
  if (proposalsResponse.status !== 200) {
    throw error(proposalsResponse.status, 'Proposals not found');
  }

  const ballotV1Payload = await ballotV1.json();
  const ballotV0Payload = ballotV0.ok ? await ballotV0.json() : {};
  const ballot = normalizeBallot(ballotV1Payload?.data ?? ballotV1Payload);

  // Merge auth-dependent + aggregate fields from v0 until v1 carries them.
  if (ballotV0Payload?.voterValidated != null)
    ballot.voterValidated = ballotV0Payload.voterValidated;
  if (ballotV0Payload?.totalAllowedVoterCount != null)
    ballot.totalAllowedVoterCount = ballotV0Payload.totalAllowedVoterCount;
  if (ballotV0Payload?.totalVotingPower != null)
    ballot.totalVotingPower = ballotV0Payload.totalVotingPower;

  const proposalsData = await proposalsResponse.json();

  // Normalize _id on each proposal for downstream components, and
  // splice in the voter's submitted selection (if any) from /mine.
  // The ProposalVote* components fall back to `voterVote` when there
  // is no local draft — so this is what rehydrates a returning voter's
  // answers on page load. `voterVoteStatus` drives the three-state
  // ProposalCard indicator (empty / amber / green).
  const annotations = mineToProposalAnnotations(mine);
  for (const p of proposalsData.data || []) {
    if (p._id == null && p.id != null) p._id = p.id;
    const ann = annotations[String(p._id)];
    if (ann) {
      p.voterVote = ann.voterVote;
      p.voterVoteStatus = ann.voterVoteStatus;
    }
  }

  return {
    ballot,
    proposals: proposalsData.data || [],
    pagination: proposalsData.pagination || {
      total: 0,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    },
    // Echo back the applied filters/sort so the UI can reflect active state.
    applied: proposalsData.applied || { filters: {}, sort: null },
    currentPage: parseInt(page, 10),
    perPage: parseInt(limit, 10),
    // Raw /mine payload — the page seeds the drafts + submitted-baseline
    // stores from this so editing one of N previously-submitted votes
    // doesn't drop the other N-1 from the broker package.
    mine,
  };
}
