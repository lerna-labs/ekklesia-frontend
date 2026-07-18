---
"ekklesia-frontend": patch
---

Revert a hard-coded "Voting is currently suspended for Hydra maintenance" notice that had no toggle and would have shipped permanently on. The notice banner mechanism itself is unchanged and still available for a real, gated maintenance notice when one is actually needed.
