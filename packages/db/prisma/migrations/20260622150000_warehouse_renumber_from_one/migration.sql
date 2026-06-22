-- FlooringWarehouse: renumber STORE-N to start at 1 (was 7).
--
-- The initial install seeded the sequence at START 7, so existing warehouses
-- landed on STORE-7, STORE-8 … The intended floor is STORE-1. This renumbers
-- existing rows to STORE-1..N by creation order (oldest = STORE-1) and resets
-- the sequence so the next NEW warehouse continues at N+1. `warehouseNumberInt`
-- is GENERATED ALWAYS from `warehouse_number`, so it recomputes automatically.
--
-- Two-phase update: park every row on a collision-proof temp token first, since
-- `warehouse_number` is UNIQUE and Postgres checks it per-row — the old {7..N+6}
-- and new {1..N} value sets overlap, so a single UPDATE could trip the
-- constraint mid-statement.
-- ============================================================================

-- Phase 1: park each row on a unique temporary value.
UPDATE "flooring_warehouse" SET "warehouse_number" = 'TMP-' || "id";

-- Phase 2: assign STORE-1..N by creation order.
WITH ordered AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "flooring_warehouse"
)
UPDATE "flooring_warehouse" w
SET "warehouse_number" = 'STORE-' || o.rn
FROM ordered o
WHERE w."id" = o."id";

-- Reset the sequence: next NEW warehouse = count + 1 (or STORE-1 when empty).
SELECT setval(
  'flooring_warehouse_number_seq',
  GREATEST((SELECT COUNT(*) FROM "flooring_warehouse"), 1),
  (SELECT COUNT(*) FROM "flooring_warehouse") > 0
);
