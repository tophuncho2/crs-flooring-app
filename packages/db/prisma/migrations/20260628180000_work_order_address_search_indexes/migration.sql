-- WO-owned address list-view search bars.
-- streetAddress / city / postalCode: case-insensitive substring (ILIKE) search → GIN trigram.
-- state: exact 2-letter `IN` match → plain btree.
CREATE INDEX "flooring_work_order_streetAddress_trgm_idx" ON "flooring_work_order" USING GIN ("streetAddress" gin_trgm_ops);
CREATE INDEX "flooring_work_order_city_trgm_idx" ON "flooring_work_order" USING GIN ("city" gin_trgm_ops);
CREATE INDEX "flooring_work_order_postalCode_trgm_idx" ON "flooring_work_order" USING GIN ("postalCode" gin_trgm_ops);
CREATE INDEX "flooring_work_order_state_idx" ON "flooring_work_order" ("state");
