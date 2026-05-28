---
question: "Final results deviate slightly from the last preliminary results — why?"
order: 60
---

Ekklesia tabulates the cryptographic record of *who voted* and *how they
voted*. Voting power, eligibility thresholds, and any post-vote weighting are
applied by the **voting authority** — the organisation running the ballot —
not by Ekklesia itself.

That means results pass through up to three states:

- **Provisional** — rolled up roughly every 10 minutes while the ballot is
  live, as a convenience. Strictly informational.
- **Hydra-final** — the on-chain record once the ballot closes. The cast votes
  are locked and cannot be altered.
- **Certified** — published by the voting authority after they apply their
  eligibility snapshot and voting-power rules.

Certified results may differ slightly from the Hydra-final numbers, and those
may differ from the last provisional readout. The badge on each ballot tells
you which state you're looking at.
