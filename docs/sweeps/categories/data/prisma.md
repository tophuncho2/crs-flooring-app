# Categories — Current Prisma Schema

## Owned models (seeded, read-only this sweep)

### `FlooringCategory`

```prisma
model FlooringCategory {
  id                      String   @id @default(uuid())
  slug                    String   @unique
  name                    String   @unique
  sendUnitId              String?
  stockUnitId             String?
  coverageAvailableUnitId String?
  itemCoverageUnitId      String?
  serviceUnitId           String?
  sendUnit                FlooringUnitOfMeasure? @relation("FlooringCategorySendUnit", ...)
  stockUnit               FlooringUnitOfMeasure? @relation("FlooringCategoryStockUnit", ...)
  coverageAvailableUnit   FlooringUnitOfMeasure? @relation("FlooringCategoryCoverageAvailableUnit", ...)
  itemCoverageUnit        FlooringUnitOfMeasure? @relation("FlooringCategoryItemCoverageUnit", ...)
  serviceUnit             FlooringUnitOfMeasure? @relation("FlooringCategoryServiceUnit", ...)
  products                FlooringProduct[]
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt

  @@map("flooring_category")
}
```

### `FlooringUnitOfMeasure`

```prisma
model FlooringUnitOfMeasure {
  id           String   @id @default(uuid())
  slug         String   @unique
  name         String   @unique
  abbreviation String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  // reverse relations for the five category UoM roles + services, template service items, work-order service items.
  @@map("flooring_unit_of_measure")
}
```

## Notes

- Seeded data — not edited by this sweep. No CRUD routes, no use cases, no module folder under `apps/web/modules/`.
- `FlooringCategory` declares five UoM roles: `stockUnit`, `sendUnit`, `coverageAvailableUnit`, `itemCoverageUnit`, `serviceUnit`. See `../domain/types.md` for role semantics.
- Products belong to exactly one category (`FlooringProduct.categoryId`) and inherit all five UoMs through that relation. The product-level `coveragePerUnit` decimal is the per-stock-unit→coverage-unit multiplier (e.g., `23.77` sqft per box).
- Inventory inherits its unit semantics transitively through `FlooringInventory.productId → FlooringProduct.categoryId → FlooringCategory.*Unit`.
- Canonical conversion helpers live in `../domain/unit-conversion.md` (not here). The data layer's read normalizers consume those helpers when shaping records — they do not re-implement arithmetic.
