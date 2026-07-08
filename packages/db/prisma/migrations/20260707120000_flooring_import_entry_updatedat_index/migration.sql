-- Back the imports list-view sort on `updatedAt` with a btree index. The Sort
-- menu now offers Created + Updated; `createdAt` was already indexed, but
-- `updatedAt` was not, so an ORDER BY updatedAt LIMIT was a full-table sort.
CREATE INDEX "flooring_import_entry_updatedAt_idx" ON "flooring_import_entry"("updatedAt");
