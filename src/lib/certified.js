import { api } from '$stores/sessionManager.js';

// Fetches the authority-certification payload for a ballot.
//
// Drives the three-state results display: provisional (Hydra-final,
// awaiting certification), narrative-only endorsement, or fully
// certified. Public endpoint, no auth. Returns null on 404 / network
// errors so callers can render sensibly even if the endpoint is absent
// (e.g. an old backend).
//
// Shape, when certified (active snapshot):
//   { certified: true, version, certifiedAt, snapshotUrl, snapshotHash,
//     snapshotEpoch, narrative: { url, label } | null,
//     perProposal: [{ proposalId, results, resultsByGroup }],
//     history: [{ version, submittedAt, submittedBy, source, chainTxHash,
//                 snapshotUrl, snapshotHash, narrativeOnly, narrative }] }
//
// When not yet certified:
//   { certified: false, narrative: null | { url, label }, history: [] }
export async function fetchCertification(fetch, ballotId) {
  try {
    const res = await api.v1.fetch(fetch, '/ballots/' + ballotId + '/certified');
    if (!res.ok) return null;
    const payload = await res.json();
    return payload?.data ?? null;
  } catch (err) {
    if (err?.status === 404) return null;
    return null;
  }
}

// Pulls the per-proposal entry for a given proposal out of the active
// certification payload. Returns null when the ballot isn't certified
// or the proposal isn't represented in the snapshot.
export function getCertifiedProposal(certification, proposalId) {
  if (!certification?.certified) return null;
  const list = Array.isArray(certification.perProposal) ? certification.perProposal : [];
  return list.find((p) => String(p.proposalId) === String(proposalId)) ?? null;
}

// Derives the display state for a ballot's results given the
// certification payload and an optional per-proposal Result. Returns
// one of:
//   'certified'          — authority-certified snapshot active
//   'narrative'          — no re-weighting, but authority published a
//                          narrative endorsement
//   'hydra-provisional'  — voting is closed and Hydra has finalized
//                          the tally, but no certification yet
//   'voting'             — ballot is still accepting votes (running tally)
//   null                 — no basis for any state (e.g. no result + no
//                          certification yet)
//
// The certification payload is the source of truth for certified +
// narrative. `hydra-provisional` vs `voting` is inferred from the
// ballot + result so the UI can distinguish "polls are still open" from
// "polls closed, waiting on the authority."
export function certificationState(certification, result, ballot) {
  if (certification?.certified) return 'certified';
  if (certification && !certification.certified && certification.narrative?.url) return 'narrative';

  const closed = ballot?.status === 'closed';
  const hydraFinal =
    result?.source === 'final' ||
    result?.source === 'certified' ||
    !!result?.hydraFinalizeTxHash ||
    !!result?.finalizedAt;

  if (closed && hydraFinal) return 'hydra-provisional';
  if (result) return 'voting';
  return null;
}
