# Inventory — Current Prisma Schema

Snapshot as of the end of Phase A (post canonical-sweep migration `20260420160000_canonical_sweep_imports_inventory_cutlogs_workorders`).

## Owned models

### `FlooringInventory`

The single source of truth for a physical stock row. Starting balance stored, everything else derived.

```prisma
model FlooringInventory {
  id             String               @id @default(uuid())
  importEntryId  String?
  importEntry    FlooringImportEntry? @relation(fields: [importEntryId], references: [id], onDelete: Restrict)
  productId      String
  product        FlooringProduct      @relation(fields: [productId], references: [id], onDelete: Restrict)
  itemNumber     String
  dyeLot         String?
  warehouseId    String?
  warehouse      FlooringWarehouse?   @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  locationId     String?
  location       FlooringLocation?    @relation(fields: [locationId], references: [id], onDelete: SetNull)
  stockCount     Decimal              @db.Decimal(12, 2)
  isImported     Boolean              @default(false)
  cost           Decimal?             @db.Decimal(10, 2)
  freight        Decimal?             @db.Decimal(10, 2)
  notes          String?
  fifoReceivedAt DateTime
  cutLogs        FlooringCutLog[]
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  @@unique([locationId, itemNumber])
  @@index([importEntryId])
  @@index([productId])
  @@index([locationId])
  @@index([warehouseId])
  @@index([productId, fifoReceivedAt, itemNumber, id])
  @@map("flooring_inventory")
}
```

## Column notes

- `stockCount` — **starting balance only**, in the product category's `stockUnit` (e.g. boxes). Immutable after row creation for the purposes of balance math. Never mutated to reflect cuts.
- `isImported` — received-into-warehouse flag. Gates cut-log eligibility at the domain layer via `canAddCutLog(inventory)`. Default `false`. The action that flips this to `true` is deferred (see `docs/PLAN.md` Out of Scope: `isImported` flip trigger).
- `warehouseId` — **source of truth** for the inventory row's warehouse. Must match `location.warehouseId` when both are set (domain-enforced invariant); must match `importEntry.warehouseId` when both are set. `onDelete: SetNull` → warehouse delete does not cascade-delete inventory.
- `locationId` — optional. Location carries its own `warehouseId`; domain enforces consistency. `onDelete: SetNull`.
- `fifoReceivedAt` — for added-via-import rows, set to `importEntry.createdAt` at row creation. Drives FIFO assignment ordering.

## Computed fields (not stored, derived in `@builders/domain`)

These are **not Prisma columns**. They are computed at read time from `stockCount` + child `cutLogs` + related `product` / `category`:

- `stockAvailable = stockCount − sum(cutLogs.cut)` — physical stock remaining, in stock unit. Invariant: `≥ 0` (domain rejects any write that would violate).
- `awaitingCut = sum(cutLogs.cut where status === "PENDING")` — how much of the total cut is still awaiting `FINAL`. In stock unit.
- `coverageAvailable = stockAvailable × product.coveragePerUnit` — physical stock projected to category's coverage unit (e.g. sqft). Category-aware rounding via `packages/domain/src/flooring/inventory/unit-conversion.ts`.
- `locationCode = "W{warehouse.number}-S{section.number}-R{location.rafter}-L{location.level}"` — display-only composite from the warehouse → section → location chain.

See `docs/PLAN.md` "Inventory computed fields" and "Category-driven unit conversion" for the full contract.

## Relations in play

- `importEntry` — optional FK to `FlooringImportEntry`. `onDelete: Restrict` — can't delete an import while child inventory rows still reference it (domain surfaces this as `IMPORT_IN_USE`).
- `product` — required FK to `FlooringProduct`. `onDelete: Restrict`.
- `warehouse` — optional FK to `FlooringWarehouse`. `onDelete: SetNull`.
- `location` — optional FK to `FlooringLocation`. `onDelete: SetNull`.
- `cutLogs` — one-to-many child relation. See the cut-logs module snapshot for the child shape.

## Indexes

| Index | Purpose |
|---|---|
| `@@unique([locationId, itemNumber])` | Prevents duplicate item numbers within the same location |
| `@@index([importEntryId])` | List-rows-by-import |
| `@@index([productId])` | List-rows-by-product |
| `@@index([locationId])` | Location-scoped queries |
| `@@index([warehouseId])` | Warehouse-scoped queries (added in Phase A) |
| `@@index([productId, fifoReceivedAt, itemNumber, id])` | FIFO-ordered reads per product |

## Phase A deltas on this model

- **Added** `warehouseId String?` + `warehouse` relation with `onDelete: SetNull`.
- **Added** `isImported Boolean @default(false)`.
- **Added** `@@index([warehouseId])`.
- **Dropped** `reservedStockCount Decimal @default(0) @db.Decimal(12, 2)` — dead after allocation removal; replaced by computed `awaitingCut`.
- **Dropped** `allocations FlooringWorkOrderItemAllocation[]` back-relation — `FlooringWorkOrderItemAllocation` model deleted.
