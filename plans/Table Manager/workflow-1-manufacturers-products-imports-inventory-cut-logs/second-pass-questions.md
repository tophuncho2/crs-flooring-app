# Workflow 1 Second-Pass Questions

1. Should pending inventory rows be allowed to transition to `FINAL` only by editing the parent import, or should inventory get a dedicated finalize action later?
2. Once an inventory row is `FINAL`, should users ever be able to move it back to `PENDING`?
3. Should cut-log delete remain available to all warehouse-capable users for repair work, or should it become more restricted than cut-log create?
4. Do product photos need private/signed delivery later, or are app-bucket public URLs acceptable for this app long term?
5. Should child-table filters stay local to the record view, or should we eventually persist those filters in the URL the same way page tables do?
