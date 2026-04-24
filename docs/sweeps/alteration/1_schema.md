# Alteration Sweep — Schema Changes Checklist

Split in two sections. **Migrating now** (top) lists the deltas that ship in the `imports_staged_inventory_alteration` migration. **Deferred** (bottom) lists changes intentionally held back for a later sweep. "Before" shapes live in [mocks.md](./mocks.md) (Migrating-now section shows the post-migration state; Deferred section shows the pre-alteration state).

---

# Migrating now

## `FlooringImportEntry`

- [x] Add `percent` column (Decimal(5,2) default 0 — worker updates atomically)
- [x] Drop `status` column
- [x] Drop `transportType` column
- [x] Add nullable `manufacturerId` FK (optional on save) + `manufacturer FlooringManufacturer?` relation, `onDelete: SetNull`
- [x] Change `warehouseId` from nullable to required `String` + `onDelete: Restrict`
- [x] Add `stagedInventoryRows FlooringImportStagedInventoryRow[]` inverse relation
- [x] Add `@@index([manufacturerId])`
- [ ] No `cost` column on this model (per spec — excluded)

## `FlooringInventory`

- [x] Rename `stockCount` → `startingStock`
- [x] Add `totalCutSum` Decimal(12,2) default 0 (maintained in cut-log transactions — deferred sweep wires that)
- [x] Add `costPerUnit` Decimal(10,2)? column
- [x] Add `freightPerUnit` Decimal(10,2)? column
- [x] Add `isArchived` Boolean default false + `@@index([isArchived])`
- [x] Drop `isImported` boolean
- [x] Change `warehouseId` from nullable to required `String` + `onDelete: Restrict`
- [x] Keep `fifoReceivedAt` as-is (business-side "received date")
- [ ] No relation to `FlooringImportStagedInventoryRow` — staged → real is a one-way worker handoff

## `FlooringImportStagedInventoryRow` — NEW

- [x] Create the model with:
  - [x] `id` String @id @default(uuid())
  - [x] `importEntryId` String (required) + `importEntry` relation with `onDelete: Cascade`
  - [x] `productId` String + `product` relation with `onDelete: Restrict`
  - [x] `itemNumber` String
  - [x] `dyeLot` String?
  - [x] `warehouseId` String (required) + `warehouse` relation with `onDelete: Restrict`
  - [x] `locationId` String? + `location` relation with `onDelete: SetNull`
  - [x] `startingStock` Decimal @db.Decimal(12, 2)
  - [x] `isImported` Boolean default false (worker flips this)
  - [x] `cost` Decimal? @db.Decimal(10, 2)
  - [x] `freight` Decimal? @db.Decimal(10, 2)
  - [x] `notes` String?
  - [x] `createdAt` / `updatedAt`
  - [x] Indexes: `importEntryId`, `productId`, `warehouseId`, `locationId`, composite `(importEntryId, isImported)`
  - [x] `@@map("flooring_import_staged_inventory_row")`
- [ ] No `costPerUnit` / `freightPerUnit` (worker computes those at import time when writing the real inventory row)
- [ ] No `fifoReceivedAt` (staged rows have no FIFO position)
- [ ] No cut-log relation

## `FlooringWarehouse`

- [x] Add `stagedInventoryRows FlooringImportStagedInventoryRow[]` inverse relation

## `FlooringLocation`

- [x] Add `stagedInventoryRows FlooringImportStagedInventoryRow[]` inverse relation

## `FlooringManufacturer`

- [x] Add `imports FlooringImportEntry[]` inverse relation (required back-relation now that `FlooringImportEntry.manufacturerId` exists)

---

# Deferred

Captured here for continuity; executed in a follow-on migration, not this one.

## `FlooringCutLog`

- [ ] Add `void` boolean column
- [ ] Add `coverageCut` column

## `FlooringWorkOrderItem`

- [ ] Add `assignedCost` column
- [ ] Add `assignedQuantity` column
