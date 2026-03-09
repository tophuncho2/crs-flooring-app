-- Ensure each property can only be linked to one flooring management company.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'flooring_property_management'
      AND indexname = 'flooring_property_management_propertyId_key'
  ) THEN
    CREATE UNIQUE INDEX "flooring_property_management_propertyId_key" ON "flooring_property_management" ("propertyId");
  END IF;
END
$$;
