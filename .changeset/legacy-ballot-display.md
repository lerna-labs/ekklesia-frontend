---
"ekklesia-frontend": patch
---

The Votes popover on proposal cards and the proposal table no longer shows "n/0 (0.00%)" or a zero Total Voting Power when a ballot's total voter count or total voting power is not a positive number (0 or absent). For a missing total it omits that total, its percentage and its donut, and still shows the vote count or the active voting power.
