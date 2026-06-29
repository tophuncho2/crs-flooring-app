-- Hard-drop the retired `wasMerged` flag column. The merge flow was removed from
-- the UI long ago, all code references have been stripped (prior commit), the
-- backing index was dropped in 20260628210200, and the only `wasMerged = true`
-- rows have been deleted. Nothing reads this column anymore.
ALTER TABLE "flooring_inventory" DROP COLUMN "wasMerged";
