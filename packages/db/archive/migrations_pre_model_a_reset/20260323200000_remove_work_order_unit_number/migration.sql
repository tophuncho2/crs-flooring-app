UPDATE "flooring_work_order"
SET "unitLabel" = CASE
  WHEN "unitNumber" IS NULL THEN "unitLabel"
  WHEN COALESCE(NULLIF(BTRIM("unitLabel"), ''), '') = '' THEN "unitNumber"::text
  ELSE CONCAT(BTRIM("unitLabel"), ' ', "unitNumber"::text)
END
WHERE "unitNumber" IS NOT NULL;

ALTER TABLE "flooring_work_order"
DROP COLUMN IF EXISTS "unitNumber";
