-- =====================================================================
-- Drop the dead UserTablePreference model and two orphaned User columns.
--
-- UserTablePreference stored per-user/per-table view config but was never
-- wired up — list-view state lives entirely in URL query params. The
-- table's only FK (userId → "User") is owned by this table; DROP TABLE
-- removes it along with both indexes. No other table references it.
--
-- User.hiddenFlooringNavSlugs and User.flooringNavOrderSlugs are likewise
-- unreferenced anywhere in the app and are dropped here.
-- =====================================================================

ALTER TABLE "User" DROP COLUMN "hiddenFlooringNavSlugs";
ALTER TABLE "User" DROP COLUMN "flooringNavOrderSlugs";

DROP TABLE "UserTablePreference";
