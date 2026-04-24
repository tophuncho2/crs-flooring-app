# Alteration Sweep — Schema Changes Checklist

Per-model schema alterations for the imports / inventory / cut-logs / work-order-items sweep. Source-of-truth "before" state lives in [mocks.md](./mocks.md); this file captures the deltas to land.

---

## `FlooringImportEntry`

- [ ] Add `percent` column
- [ ] Remove `status` column
- [ ] Add `cost` column
- [ ] Add FK link to `FlooringManufacturer` — `manufacturerId String?` + `manufacturer FlooringManufacturer?` (nullable column, not required on save)

---

## `FlooringInventory`

- [ ] Rename `stockCount` → `startingStock`
- [ ] Add `totalCutSum` column
- [ ] Add `freightPerUnit` column
- [ ] Add `costPerUnit` column
- [ ] Do NOT link to `FlooringImportStagedInventoryRow` (no relation from inventory → staged)
- [ ] Remove `isImported` boolean

---

## `FlooringCutLog`

- [ ] Add `void` boolean column
- [ ] Add `coverageCut` column

---

## `FlooringWorkOrderItem`

- [ ] Add `assignedcost` column
- [ ] Add `assignedQuantity` column

---

## NEW: `FlooringImportStagedInventoryRow`

Based on the current `FlooringInventory` shape, with these specifics:

- [ ] Create new model (table name TBD — `flooring_import_staged_inventory_row` suggested)
- [ ] Columns:
  - [ ] `id` String @id @default(uuid())
  - [ ] `importEntryId` — FK to `FlooringImportEntry` (confirm required vs optional)
  - [ ] `importEntry` relation
  - [ ] `productId` String → FK to `FlooringProduct` (onDelete Restrict)
  - [ ] `itemNumber` String
  - [ ] `dyeLot` String?
  - [ ] `warehouseId` String? → FK to `FlooringWarehouse` (onDelete SetNull)
  - [ ] `locationId` String? → FK to `FlooringLocation` (onDelete SetNull)
  - [ ] `startingStock` Decimal @db.Decimal(12, 2) (same rename as on inventory)
  - [ ] `isImported` Boolean @default(false) — KEEP on staged (unlike inventory, where it's removed)
  - [ ] `cost` Decimal? @db.Decimal(10, 2)
  - [ ] `freight` Decimal? @db.Decimal(10, 2)
  - [ ] `costPerUnit` Decimal? @db.Decimal(10, 2)
  - [ ] `freightPerUnit` Decimal? @db.Decimal(10, 2)
  - [ ] `notes` String?
  - [ ] `createdAt`, `updatedAt`
- [ ] Omit `fifoReceivedAt` — not applicable to staged rows
- [ ] Omit `cutLogs` relation — staged rows are not linked to cut logs
