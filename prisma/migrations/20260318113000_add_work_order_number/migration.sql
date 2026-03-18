CREATE SEQUENCE IF NOT EXISTS flooring_work_order_number_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE "flooring_work_order"
ADD COLUMN "work_order_number" TEXT;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS row_number
  FROM "flooring_work_order"
)
UPDATE "flooring_work_order" AS work_order
SET "work_order_number" = 'WO-' || LPAD(ranked.row_number::text, 5, '0')
FROM ranked
WHERE ranked.id = work_order.id;

SELECT setval(
  'flooring_work_order_number_seq',
  GREATEST((SELECT COUNT(*) FROM "flooring_work_order") + 1, 1),
  false
);

ALTER TABLE "flooring_work_order"
ALTER COLUMN "work_order_number" SET DEFAULT ('WO-'::text || LPAD(nextval('flooring_work_order_number_seq')::text, 5, '0'::text));

ALTER TABLE "flooring_work_order"
ALTER COLUMN "work_order_number" SET NOT NULL;

CREATE UNIQUE INDEX "flooring_work_order_work_order_number_key"
ON "flooring_work_order"("work_order_number");

CREATE INDEX "flooring_work_order_work_order_number_idx"
ON "flooring_work_order"("work_order_number");
