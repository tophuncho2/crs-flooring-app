-- Add a stored display name for flooring products and keep it in sync.
ALTER TABLE "flooring_product"
  ADD COLUMN IF NOT EXISTS "name" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "flooring_product_name_idx"
  ON "flooring_product" ("name");

CREATE OR REPLACE FUNCTION flooring_product_build_name(
  category_name TEXT,
  style_value TEXT,
  color_value TEXT,
  width_value TEXT,
  sheet_size_value TEXT,
  thickness_value TEXT,
  unit_weight_value TEXT,
  manufacturer_value TEXT
) RETURNS TEXT AS $$
DECLARE
  base_value TEXT;
BEGIN
  base_value := CASE
    WHEN COALESCE(category_name, '') = 'Metals' THEN COALESCE(NULLIF(style_value, ''), NULLIF(category_name, ''), '')
    ELSE COALESCE(NULLIF(category_name, ''), '')
  END;

  RETURN array_to_string(
    array_remove(
      ARRAY[
        NULLIF(BTRIM(base_value), ''),
        CASE
          WHEN COALESCE(style_value, '') <> '' AND COALESCE(category_name, '') <> 'Metals'
            THEN BTRIM(style_value)
          ELSE NULL
        END,
        NULLIF(BTRIM(color_value), ''),
        CASE
          WHEN COALESCE(width_value, '') <> '' THEN BTRIM(width_value) || '/w'
          ELSE NULL
        END,
        NULLIF(BTRIM(sheet_size_value), ''),
        NULLIF(BTRIM(thickness_value), ''),
        NULLIF(BTRIM(unit_weight_value), ''),
        NULLIF(BTRIM(manufacturer_value), '')
      ],
      NULL
    ),
    ' - '
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_flooring_product_name()
RETURNS TRIGGER AS $$
DECLARE
  category_name TEXT;
  manufacturer_value TEXT;
BEGIN
  SELECT name INTO category_name
  FROM "flooring_category"
  WHERE id = NEW."categoryId";

  SELECT COALESCE(NEW."manufacturer", m.name) INTO manufacturer_value
  FROM "flooring_manufacturer" m
  WHERE m.id = NEW."manufacturerId";

  IF manufacturer_value IS NULL THEN
    manufacturer_value := NEW."manufacturer";
  END IF;

  NEW."name" := flooring_product_build_name(
    category_name,
    NEW."style",
    NEW."color",
    NEW."width",
    NEW."sheetSize",
    NEW."thickness",
    NEW."unitWeight",
    manufacturer_value
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS flooring_product_set_name ON "flooring_product";

CREATE TRIGGER flooring_product_set_name
BEFORE INSERT OR UPDATE OF "categoryId", "manufacturerId", "manufacturer", "style", "color", "width", "sheetSize", "thickness", "unitWeight"
ON "flooring_product"
FOR EACH ROW
EXECUTE FUNCTION set_flooring_product_name();

UPDATE "flooring_product" fp
SET "name" = flooring_product_build_name(
  (SELECT fc.name FROM "flooring_category" fc WHERE fc.id = fp."categoryId"),
  fp."style",
  fp."color",
  fp."width",
  fp."sheetSize",
  fp."thickness",
  fp."unitWeight",
  COALESCE(
    fp."manufacturer",
    (SELECT fm.name FROM "flooring_manufacturer" fm WHERE fm.id = fp."manufacturerId")
  )
);

UPDATE "flooring_product"
SET "name" = flooring_product_build_name(
  NULL,
  "style",
  "color",
  "width",
  "sheetSize",
  "thickness",
  "unitWeight",
  "manufacturer"
)
WHERE "categoryId" IS NULL;
