-- =====================================================================
-- Work orders: drop the vestigial status lookup.
--
-- `flooring_work_order_status` (id/slug/name/sortOrder) and the
-- `status_id` FK on `flooring_work_order` were built as a full vertical
-- slice but never reached a live UI surface — no status field rendered,
-- no list column, no filter chip. Drop the FK + column, then the table.
-- Dropping the column also drops `flooring_work_order_status_id_idx`;
-- dropping the table drops its own unique/name indexes.
-- =====================================================================

-- DropForeignKey
ALTER TABLE "flooring_work_order" DROP CONSTRAINT IF EXISTS "flooring_work_order_status_id_fkey";

-- DropColumn
ALTER TABLE "flooring_work_order" DROP COLUMN "status_id";

-- DropTable
DROP TABLE "flooring_work_order_status";
