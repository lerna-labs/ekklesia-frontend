---
"ekklesia-frontend": patch
---

Fix Lace wallet rejecting CIP-95 `signData` calls when casting a vote. Lace requires the hex representation of the DRep ID (not bech32) with the credential prefix byte stripped; login already handled this, voting now does too.
