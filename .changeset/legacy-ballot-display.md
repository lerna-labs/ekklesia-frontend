---
"ekklesia-frontend": patch
---

The Votes popover on proposal cards and the proposal table no longer shows "n/0 (0.00%)", a negative Inactive count or a zero total power when a closed ballot from the earlier off-chain voting flow has no voter count or total voting power. It shows the vote count and omits the percentage and the donut for the missing total. On such a ballot, the Abstain option, which uses the numeric id 0, is now shown in the expressed-versus-abstained bar in every result component and, in the Discrete result component, sorted last in the results.
