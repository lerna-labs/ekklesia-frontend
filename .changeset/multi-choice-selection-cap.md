---
"ekklesia-frontend": patch
---

Fix multi-choice (approval) ballots incorrectly capping voters at a single selection, and fix submission being blocked once more than one option was picked. The selection cap now reads the schema's `maxSelections`/`minSelections` instead of the unrelated `voterBudget` field the backend also emits on multi-choice proposals.
