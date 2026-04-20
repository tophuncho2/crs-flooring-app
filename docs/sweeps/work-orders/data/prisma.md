# Work Orders — Current Prisma Schema

Snapshot as of the end of Phase A (post canonical-sweep migration `20260420160000_canonical_sweep_imports_inventory_cutlogs_workorders`).

## Owned enums

### `FlooringWorkOrderStatus`

Primary-section status.

```prisma
enum FlooringWorkOrderStatus {
  BUILDING_ORDER
  PENDING_EXPORT
  CARPET_CLEANING
  SENT_OUT
  PENDING
  PULL_TEMPLATE
  MODIFY
}
```

### `FlooringVacancyStatus`

Property-occupancy state at the time the work order is scheduled.

```prisma
enum FlooringVacancyStatus {
  VACANT
  OCCUPIED
}
```

### `FlooringChangeOrderStatus` — *kept, not stored*

Retained **only as a Prisma-generated TypeScript enum** so the read-repo normalizer has a stable type for the computed `fulfillmentStatus` field. No column stores this value anywhere after Phase A. Phase B writes the TS type `FulfillmentStatus = "SHORTAGE" | "SUFFICIENT"` as a discriminated union that lines up with these two enum values.

```prisma
enum FlooringChangeOrderStatus {
  SHORTAGE
  SUFFICIENT
}
```

## Owned models

### `FlooringWorkOrder`

The primary-section row. Template sync, property link, warehouse, status, scheduling.

```prisma
model FlooringWorkOrder {
  id                   String                        @id @default(uuid())
  workOrderNumber      String                        @unique @default(dbgenerated("('WO-'::text || lpad((nextval('flooring_work_order_number_seq'::regclass))::text, 5, '0'::text))")) @map("work_order_number")
  propertyId           String
  property             Property                      @relation(fields: [propertyId], references: [id], onDelete: Restrict)
  templateId           String?
  template             FlooringTemplate?             @relation(fields: [templateId], references: [id], onDelete: SetNull)
  warehouseId          String?
  warehouse            FlooringWarehouse?            @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  status               FlooringWorkOrderStatus
  isComplete           Boolean                       @default(false) @map("is_complete")
  vacancy              FlooringVacancyStatus?
  scheduledFor         DateTime?                     @db.Date
  unitLabel            String?
  unitType             String?
  customAddress        String?
  instructions         String?
  notes                String?
  googleDriveSlip      String?
  googleDocUrl         String?
  templateSyncedAt     DateTime?
  templateSyncMode     String?
  templateSnapshotHash String?
  createdAt            DateTime                      @default(now())
  updatedAt            DateTime                      @updatedAt
  items                FlooringWorkOrderItem[]
  serviceItems         FlooringWorkOrderServiceItem[]
  salesReps            FlooringWorkOrderSalesRep[]
  analytics            FlooringAnalytics?
  cutLogs              FlooringCutLog[]

  @@index([workOrderNumber])
  @@index([isComplete])
  @@index([propertyId, status])
  @@index([status, scheduledFor])
  @@index([scheduledFor])
  @@index([createdAt])
  @@index([updatedAt])
  @@index([templateId])
  @@index([warehouseId])
  @@map("flooring_work_order")
}
```

### `FlooringWorkOrderItem`

Material-item row. One row per product being ordered under a work order. Cut logs attach here for fulfillment tracking.

```prisma
model FlooringWorkOrderItem {
  id                   String            @id @default(uuid())
  workOrderId          String
  workOrder            FlooringWorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  productId            String
  product              FlooringProduct   @relation(fields: [productId], references: [id], onDelete: Restrict)
  sourceTemplateItemId String?
  quantity             Decimal           @db.Decimal(10, 2)
  unitPrice            Decimal           @db.Decimal(10, 2)
  notes                String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  cutLogs              FlooringCutLog[]

  @@index([workOrderId])
  @@index([workOrderId, createdAt])
  @@index([productId])
  @@index([sourceTemplateItemId])
  @@map("flooring_work_order_item")
}
```

### `FlooringWorkOrderServiceItem`

Service-item row. Labor-style line items (install, tear-out, haul-away) distinct from material.

```prisma
model FlooringWorkOrderServiceItem {
  id                          String                @id @default(uuid())
  workOrderId                 String
  workOrder                   FlooringWorkOrder     @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  sourceTemplateServiceItemId String?
  serviceId                   String?
  service                     FlooringService?      @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  name                        String
  unitId                      String
  unit                        FlooringUnitOfMeasure @relation(fields: [unitId], references: [id], onDelete: Restrict)
  quantity                    Decimal               @db.Decimal(10, 2)
  unitPrice                   Decimal               @db.Decimal(10, 2)
  notes                       String?
  createdAt                   DateTime              @default(now())
  updatedAt                   DateTime              @updatedAt

  @@index([workOrderId])
  @@index([workOrderId, createdAt])
  @@index([serviceId])
  @@index([unitId])
  @@index([sourceTemplateServiceItemId])
  @@map("flooring_work_order_service_item")
}
```

### `FlooringWorkOrderSalesRep`

Sales-rep assignment. Multiple reps per WO, with percent splits that domain validates to sum to 100.

```prisma
model FlooringWorkOrderSalesRep {
  id                       String            @id @default(uuid())
  workOrderId              String
  workOrder                FlooringWorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  sourceTemplateSalesRepId String?
  contactId                String
  contact                  FlooringContact   @relation(fields: [contactId], references: [id], onDelete: Restrict)
  percent                  Decimal           @db.Decimal(5, 2)
  createdAt                DateTime          @default(now())
  updatedAt                DateTime          @updatedAt

  @@unique([workOrderId, contactId])
  @@index([workOrderId])
  @@index([contactId])
  @@index([workOrderId, createdAt])
  @@index([sourceTemplateSalesRepId])
  @@map("flooring_work_order_sales_rep")
}
```

### `FlooringAnalytics`

One-to-one sidecar on a work order holding aggregated cost rollups. Written by the use case after item / service-item saves.

```prisma
model FlooringAnalytics {
  id                String            @id @default(uuid())
  workOrderId       String            @unique
  workOrder         FlooringWorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  totalMaterialCost Decimal           @db.Decimal(12, 2)
  totalServiceCost  Decimal           @db.Decimal(12, 2)
  totalCost         Decimal           @db.Decimal(12, 2)
  createdAt         DateTime          @default(now())

  @@index([workOrderId])
  @@map("flooring_analytics")
}
```

## Computed fields on work-order reads (not stored, derived in `@builders/domain`)

These are **not Prisma columns**. They're applied by db read-repo normalizers:

- `WorkOrderMaterialItemRecord.fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"` — computed via `computeItemFulfillmentStatus({ quantityInSendUnit, cutLogsCutTotalInStockUnit, product, category })`. Uses category-aware unit conversion. Overage allowed.
- `WorkOrderRecord.fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"` — aggregate all-or-nothing via `computeWorkOrderFulfillmentStatus(items)`. Every item SUFFICIENT → SUFFICIENT; any SHORTAGE (or zero items) → SHORTAGE.

UI labels: `"Short"` / `"Assigned"` via `formatFulfillmentStatus`.

See `docs/PLAN.md` Phase B.4 `fulfillment-status.ts` for signatures.

## Relations in play

- `property` — required FK to `Property`. `onDelete: Restrict`.
- `template` — optional FK to `FlooringTemplate`. `onDelete: SetNull`. Template deletion doesn't destroy existing work orders.
- `warehouse` — optional FK to `FlooringWarehouse`. `onDelete: SetNull`.
- `items` / `serviceItems` / `salesReps` — one-to-many children. Cascade on WO delete.
- `cutLogs` — one-to-many via `FlooringCutLog.workOrderId`. `onDelete: SetNull` (on the cut-log side), so deleting a WO nulls the cut logs' `workOrderId` + `workOrderItemId` but preserves the cut-log rows (physical inventory history is immutable).
- `analytics` — optional one-to-one sidecar. Cascade on WO delete.

## Phase A deltas on this module

- **Dropped** `FlooringWorkOrderItem.allocationStatus FlooringWorkOrderItemAllocationStatus` column. Fulfillment now computed on read, never stored.
- **Dropped** `FlooringWorkOrderItem.changeOrderStatus FlooringChangeOrderStatus?` column. "Change order" vocabulary retired.
- **Dropped** `FlooringWorkOrderItem.allocations FlooringWorkOrderItemAllocation[]` relation.
- **Dropped** `FlooringWorkOrderItem.@@index([workOrderId, allocationStatus])` index.
- **Dropped** `FlooringWorkOrder.allocationRuns FlooringWorkOrderAllocationRun[]` relation.
- **Dropped** `FlooringWorkOrderItemAllocation` model entirely.
- **Dropped** `FlooringWorkOrderAllocationRun` model entirely.
- **Dropped** enums: `FlooringWorkOrderItemAllocationStatus`, `FlooringWorkOrderAllocationRunStatus`, `FlooringAllocationMethod`.
- **Preserved** enum `FlooringChangeOrderStatus` — TS type only; nothing stores it.

All other columns, relations, and indexes on `FlooringWorkOrder`, `FlooringWorkOrderServiceItem`, `FlooringWorkOrderSalesRep`, and `FlooringAnalytics` are unchanged.
