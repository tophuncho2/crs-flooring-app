CREATE UNIQUE INDEX "flooring_category_name_lower_key"
ON "flooring_category"(LOWER("name"));

CREATE UNIQUE INDEX "flooring_unit_of_measure_name_lower_key"
ON "flooring_unit_of_measure"(LOWER("name"));

CREATE UNIQUE INDEX "flooring_manufacturer_companyName_lower_key"
ON "flooring_manufacturer"(LOWER("companyName"));

CREATE INDEX "queue_outbox_event_topic_status_availableAt_lockedAt_createdAt_idx"
ON "queue_outbox_event"("topic", "status", "availableAt", "lockedAt", "createdAt");
