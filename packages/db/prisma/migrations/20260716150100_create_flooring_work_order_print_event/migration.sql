-- =====================================================================
-- Work-Order Print Events: append-only print/export event log.
--
-- Adds `flooring_work_order_print_event` — one row per Print click on the WO
-- print/export configurator, keyed by the doc type printed. Per-doc-type print
-- counts are aggregates (GROUP BY "documentTypeId"). Mirrors the WO-child
-- convention (Cascade off the work order + a createdBy actor column + createdAt).
--   • `workOrderId`      — FK → flooring_work_order, ON DELETE CASCADE.
--   • `documentTypeId`   — FK → flooring_work_order_document_type, ON DELETE SET
--     NULL (a doc type may later be deleted).
--   • `documentTypeName` — snapshot of the doc type's name at print time, so
--     historical counts survive a doc-type deletion.
--   • `createdBy`        — actor-email column (nullable, no FK).
-- Append-only ⇒ no updatedAt, no optimistic-concurrency token.
-- =====================================================================

-- CreateTable
CREATE TABLE "flooring_work_order_print_event" (
    "id" TEXT NOT NULL,
    "workOrderId" TEXT NOT NULL,
    "documentTypeId" TEXT,
    "documentTypeName" VARCHAR(40) NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flooring_work_order_print_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "flooring_work_order_print_event_workOrderId_idx" ON "flooring_work_order_print_event"("workOrderId");

-- CreateIndex
CREATE INDEX "flooring_work_order_print_event_workOrderId_documentTypeId_idx" ON "flooring_work_order_print_event"("workOrderId", "documentTypeId");

-- CreateIndex
CREATE INDEX "flooring_work_order_print_event_documentTypeId_idx" ON "flooring_work_order_print_event"("documentTypeId");

-- AddForeignKey
ALTER TABLE "flooring_work_order_print_event" ADD CONSTRAINT "flooring_work_order_print_event_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "flooring_work_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flooring_work_order_print_event" ADD CONSTRAINT "flooring_work_order_print_event_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "flooring_work_order_document_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
