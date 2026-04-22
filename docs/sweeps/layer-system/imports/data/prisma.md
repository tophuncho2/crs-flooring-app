# Imports — Current Prisma Schema

Snapshot as of the end of Phase A (post canonical-sweep migration `20260420160000_canonical_sweep_imports_inventory_cutlogs_workorders`).

## Owned models

### `FlooringImportEntry`

The record itself. Represents a single shipment / receiving event that pulls inventory rows into a warehouse.

```prisma
model FlooringImportEntry {
  id            String              @id @default(uuid())
  importNumber  Int                 @unique @default(autoincrement())
  orderNumber   String?
  tag           String?
  transportType String
  status        String
  warehouseId   String?
  warehouse     FlooringWarehouse?  @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  notes         String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  inventories   FlooringInventory[]

  @@index([createdAt])
  @@index([warehouseId])
  @@map("flooring_import_entry")
}
```

## Column notes

- `importNumber` — auto-incrementing integer, DB-assigned, unique. Surfaced in the UI as `IMP-{zero-padded}`.
- `transportType` — closed-set string. Domain enforces membership in `IMPORT_TRANSPORT_TYPE_VALUES`; DB itself is free-form `text` (consistent with the `status` and cut-log `status` pattern).
- `status` — closed-set string `"PENDING"` / `"FINAL"`. Domain-enforced. UI display only this sweep — no status-gated behavior wired yet.
- `warehouseId` — optional FK. When set, every child `FlooringInventory` row inherits this warehouse (the import UI does not surface a per-row warehouse selector; it's the inventory record view's responsibility to edit the warehouse for an existing inventory row).

## Relations in play

- `warehouse` — optional FK to `FlooringWarehouse`. `onDelete: SetNull` → warehouse delete does not cascade-delete imports; imports orphan gracefully.
- `inventories` — one-to-many child relation. See the inventory module's snapshot for the child shape.

## Indexes

| Index | Purpose |
|---|---|
| `@@index([createdAt])` | List view sort |
| `@@index([warehouseId])` | Filter imports by warehouse |
| `@@unique` on `importNumber` | Human-readable identifier |

## No changes in Phase A

Imports schema was left unchanged by the canonical-sweep migration. All Phase A deltas landed on inventory, cut-logs, and work-orders.
