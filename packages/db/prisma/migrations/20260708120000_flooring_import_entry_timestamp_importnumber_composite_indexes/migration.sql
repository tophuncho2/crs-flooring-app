-- Replace the plain (createdAt) / (updatedAt) sort indexes with composite
-- (timestamp, importNumber) indexes that match the imports list ORDER BY
-- (createdAt/updatedAt, importNumber, id). importNumber is @unique, so the
-- (timestamp, importNumber) prefix is already a total order — the trailing
-- id in the ORDER BY is redundant and needs no index column.
DROP INDEX IF EXISTS "flooring_import_entry_createdAt_idx";
DROP INDEX IF EXISTS "flooring_import_entry_updatedAt_idx";
CREATE INDEX "flooring_import_entry_createdAt_importNumber_idx" ON "flooring_import_entry"("createdAt", "importNumber");
CREATE INDEX "flooring_import_entry_updatedAt_importNumber_idx" ON "flooring_import_entry"("updatedAt", "importNumber");
