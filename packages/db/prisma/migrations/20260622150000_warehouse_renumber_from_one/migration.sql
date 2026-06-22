-- FlooringWarehouse: renumber STORE-N to start at 1 (was 7).
--
-- The initial install seeded the sequence at START 7, so existing warehouses
-- landed on STORE-7, STORE-8 … The intended floor is STORE-1. This renumbers
-- existing rows to STORE-1..N by creation order (oldest = STORE-1) and resets
-- the sequence so the next NEW warehouse continues at N+1.
--
-- ⚠ warehouseNumberInt is GENERATED ALWAYS AS CAST(SUBSTRING(warehouse_number
-- FROM 7) AS INTEGER) STORED, so it recomputes on EVERY update to
-- warehouse_number — the parked temp value MUST keep the STORE- prefix + a
-- pure-integer tail (a non-numeric tail like a uuid fails the cast: 22P02).
-- warehouse_number is also UNIQUE and Postgres checks it per-row, and the old
-- {7..} and new {1..} sets overlap, so we two-phase: park on a disjoint HIGH
-- numeric range first, then settle to 1..N.
-- ============================================================================

-- Phase 1: park each row on STORE-(1000000 + rn) — numeric tail (cast-safe),
-- far above any real value, disjoint from both the old and the final ranges.
WITH ordered AS (
  SELECT "id", row_number() OVER (ORDER BY "createdAt" ASC, "id" ASC) AS rn
  FROM "flooring_warehouse"
)
UPDATE "flooring_warehouse" w
SET "warehouse_number" = 'STORE-' || (1000000 + o.rn)
FROM ordered o
WHERE w."id" = o."id";

-- Phase 2: settle to STORE-1..N by the same creation order.
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
