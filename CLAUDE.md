Paste response in a new file in the root of docs/

Paste headlines in the change.


Inventory is downstream of imports, never user-created. createInventoryUseCase is gone. The only path into FlooringInventory is a worker materializing staged rows.

Transactional outbox + deterministic idempotency around "send to import." mark-staged-rows-for-import flips DRAFT→QUEUED and writes the outbox event in one transaction. Idempotency key import-materialize:{importId}:{sortedRowIds} makes double-clicks a no-op via wasDuplicate: true.

nventory rows are frozen snapshots. At materialize time the worker stamps costPerUnit, freightPerUnit, all six unit name/abbrev fields, coveragePerUnit, categorySlug, and a shared batch fifoReceivedAt. Future product edits can't retroactively rewrite inventory history.