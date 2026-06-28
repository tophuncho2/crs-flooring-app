-- User-owned free-text area label on adjustments (VarChar 30, nullable).
-- Mirrors `location` but typed by the user (not seeded from the parent
-- inventory). No index: search/sort wiring is deferred to a later migration.
ALTER TABLE "flooring_inventory_adjustment" ADD COLUMN "area" VARCHAR(30);
