-- Drop the redundant `fifoReceivedAt` column from `flooring_inventory`.
-- It always held the same instant as `createdAt` on every write path, so the
-- FIFO (oldest-first) sort and its per-product composite index repoint onto
-- `createdAt`, which stays as the single canonical timestamp.

-- Repoint the per-product FIFO index off fifoReceivedAt onto createdAt.
DROP INDEX "flooring_inventory_productId_fifoReceivedAt_rollNumber_id_idx";

ALTER TABLE "flooring_inventory" DROP COLUMN "fifoReceivedAt";

CREATE INDEX "flooring_inventory_productId_createdAt_rollNumber_id_idx"
  ON "flooring_inventory" ("productId", "createdAt", "rollNumber", "id");
