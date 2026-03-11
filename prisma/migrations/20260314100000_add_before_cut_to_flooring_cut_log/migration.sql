ALTER TABLE "flooring_cut_log"
ADD COLUMN "beforeCut" DECIMAL(12, 2);

WITH ordered AS (
  SELECT
    current_log.id,
    inventory."stockCount" - COALESCE(SUM(previous_log."quantityTaken"), 0) AS before_cut
  FROM "flooring_cut_log" AS current_log
  INNER JOIN "flooring_inventory" AS inventory
    ON inventory.id = current_log."inventoryId"
  LEFT JOIN "flooring_cut_log" AS previous_log
    ON previous_log."inventoryId" = current_log."inventoryId"
   AND (
     previous_log."createdAt" < current_log."createdAt"
     OR (previous_log."createdAt" = current_log."createdAt" AND previous_log.id < current_log.id)
   )
  GROUP BY current_log.id, inventory."stockCount"
)
UPDATE "flooring_cut_log" AS cut_log
SET "beforeCut" = ordered.before_cut
FROM ordered
WHERE ordered.id = cut_log.id;

ALTER TABLE "flooring_cut_log"
ALTER COLUMN "beforeCut" SET NOT NULL;
