---
question: 'How do I verify my vote was included in the final results?'
order: 70
---

Final ballot results are anchored on Cardano L1. Every counted vote is a leaf
in a merkle tree whose root is committed on-chain, so you can prove your vote
is in the final dataset without trusting anyone.

For a quick check, the ballot detail page includes an **Audit my vote** panel
once a ballot is Hydra-finalised — it surfaces the Cardanoscan-linked
transaction hashes, the off-chain Hydra Tx ID, and the IPFS proof package for
your submission.

For an end-to-end verification — including a portable JSON receipt that
re-proves your inclusion years from now against any future Cardano indexer —
download `audit_ballot.py` and follow the
[Verify My Vote](https://docs.ekklesia.vote/audit/verify-my-vote/) guide on
the documentation site.
