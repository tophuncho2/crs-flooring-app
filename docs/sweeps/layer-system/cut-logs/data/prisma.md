# Cut Logs — Current Prisma Schema

Snapshot as of the end of Phase A (post canonical-sweep migration `20260420160000_canonical_sweep_imports_inventory_cutlogs_workorders`).

## Owned models

### `FlooringCutLog`

A single cut against an inventory row. Always a child; never stands alone in the UI. Referenced by inventory directly (required) and by a work-order material item optionally.

```prisma
model FlooringCutLog {
  id              String                 @id @default(uuid())
  inventoryId     String
  inventory       FlooringInventory      @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
  workOrderId     String?
  workOrder       FlooringWorkOrder?     @relation(fields: [workOrderId], references: [id], onDelete: SetNull)
  workOrderItemId String?
  workOrderItem   FlooringWorkOrderItem? @relation(fields: [workOrderItemId], references: [id], onDelete: SetNull)
  before          Decimal                @db.Decimal(12, 2)
  cut             Decimal                @db.Decimal(12, 2)
  after           Decimal                @db.Decimal(12, 2)
  status          String                 @default("PENDING")
  notes           String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  @@index([inventoryId])
  @@index([workOrderId])
  @@index([workOrderItemId])
  @@map("flooring_cut_log")
}
```

## Column notes

- `inventoryId` — **required**. Every cut log references exactly one inventory row. `onDelete: Cascade` — deleting the inventory row deletes its cut logs (used rarely; inventory delete is normally blocked by the domain if cut logs exist).
- `workOrderId` + `workOrderItemId` — both optional. Present when the cut was made in service of a work-order material item; absent when the cut was a standalone note on an inventory row (from the inventory record view without a work-order context).
- `before`, `cut`, `after` — all in the product category's `stockUnit`. Domain invariant: `before − cut === after`. Domain invariant: `cut ≥ 0` and `sum(cuts on this inventory) ≤ inventory.stockCount`.
- `status` — closed-set string `"PENDING"` / `"FINAL"`, default `"PENDING"`. DB column is free-form `text` (no CHECK constraint); closed set enforced at the domain (`CUT_LOG_STATUS_VALUES` + `isCutLogStatus` guard) and route validator (`validateCutLogsDiff`) layers. UI presents as a single-select dropdown, not free text — labels `"Pending Cut"` / `"Final Cut"` via `formatCutLogStatus`.

## Relations in play

- `inventory` — required FK to `FlooringInventory`. Cascade on delete.
- `workOrder` — optional FK to `FlooringWorkOrder`. `onDelete: SetNull`.
- `workOrderItem` — optional FK to `FlooringWorkOrderItem`. `onDelete: SetNull`.

## Linking rules (domain-enforced, not DB)

- **Created from inventory record view**: `inventoryId` required; `workOrderId` + `workOrderItemId` optional. If the user links, they use the cascading dropdown (work-order picker enables a material-item picker filtered to items whose `productId === inventory.productId`).
- **Created from work-order record view**: all three of `{ inventoryId, workOrderId, workOrderItemId }` auto-linked by the use case from the work-order context — no manual picker.

See `docs/PLAN.md` "Invariants — Cut logs" for the full rule set.

## Indexes

| Index | Purpose |
|---|---|
| `@@index([inventoryId])` | Sum-cuts-by-inventory (powers `stockAvailable` / `awaitingCut` aggregate reads) |
| `@@index([workOrderId])` | Cut-logs-by-work-order rollups |
| `@@index([workOrderItemId])` | Sum-cuts-by-material-item (powers `fulfillmentStatus` aggregate reads) |

## Phase A deltas on this model

- **Added** `status String @default("PENDING")`.
- Nothing else changed. `inventoryId` / `workOrderId` / `workOrderItemId` / `before` / `cut` / `after` / `notes` / `createdAt` / `updatedAt` all preserved.
