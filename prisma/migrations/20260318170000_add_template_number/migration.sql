CREATE SEQUENCE IF NOT EXISTS flooring_template_number_seq START WITH 1 INCREMENT BY 1;

ALTER TABLE "flooring_template"
ADD COLUMN "template_number" TEXT;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS row_number
  FROM "flooring_template"
)
UPDATE "flooring_template" AS template
SET "template_number" = 'TP-' || LPAD(ranked.row_number::text, 5, '0')
FROM ranked
WHERE ranked.id = template.id;

SELECT setval(
  'flooring_template_number_seq',
  GREATEST((SELECT COUNT(*) FROM "flooring_template") + 1, 1),
  false
);

ALTER TABLE "flooring_template"
ALTER COLUMN "template_number" SET DEFAULT ('TP-'::text || LPAD(nextval('flooring_template_number_seq')::text, 5, '0'::text));

ALTER TABLE "flooring_template"
ALTER COLUMN "template_number" SET NOT NULL;

CREATE UNIQUE INDEX "flooring_template_template_number_key"
ON "flooring_template"("template_number");

CREATE INDEX "flooring_template_template_number_idx"
ON "flooring_template"("template_number");
