import { api } from '$stores/sessionManager.js';
import { normalizeBallots } from '$lib/utils.js';

export async function load({ fetch }) {
  const [upcomingRes, liveRes, closedRes] = await Promise.all([
    api.v1.fetch(fetch, '/ballots?status=upcoming'),
    api.v1.fetch(fetch, '/ballots?status=live'),
    api.v1.fetch(fetch, '/ballots?status=closed'),
  ]);

  const [upcomingBallots, liveBallots, closedBallots] = await Promise.all([
    upcomingRes.json(),
    liveRes.json(),
    closedRes.json(),
  ]);

  normalizeBallots(upcomingBallots.data);
  normalizeBallots(liveBallots.data);
  normalizeBallots(closedBallots.data);

  return {
    liveBallots,
    closedBallots,
    upcomingBallots,
  };
}
