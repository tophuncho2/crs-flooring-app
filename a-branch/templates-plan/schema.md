# Plan — Schema (pending)

Status: **PENDING — not applied.** When approved, executes via `npm run db:deploy` and the file gets a paired `*-execution.md` written by the staging Claude. This branch (A) does not run schema migrations directly — surfaces the change here for the staging Claude to apply.

## TL;DR

Snapshot the unit-of-measure trio (name + abbreviation × `sendUnit` / `stockUnit` / `itemCoverageUnit`) onto `FlooringProduct`. Six new nullable columns. Mirrors the existing `FlooringInventory` snapshot pattern. Eliminates the Product → Category → UoM × 3 join chain from every product read consumer (templates, work orders, inventory pickers, product list/record).

## Why now

| Reason | Detail |
|---|---|
| Domain Q1 already locked it for **send-unit** | `ProductRowCategory` is gaining `sendUnitAbbrev`. Doing the abbrev addition via Prisma snapshot rather than a join keeps reads cheap. |
| Inventory already does this | `FlooringInventory` carries `sendUnitName/Abbrev`, `stockUnitName/Abbrev`, `itemCoverageUnitName/Abbrev` as immutable post-import snapshots. Same pattern for products = consistent shape across modules. |
| Material item normalizers (this sweep) | Both template + WO MI normalizers project the send-unit pair from product. Without the snapshot, every read joins UoM. With it, project flat from `product.sendUnitName/Abbrev`. |
| Future-proofing | Stock + coverage units come along for free; later sweeps that surface those don't need another schema commit. |

## Schema delta

`packages/db/prisma/schema.prisma` — `FlooringProduct` model, six new nullable columns:

```prisma
sendUnitName             String?
sendUnitAbbrev           String?
stockUnitName            String?
stockUnitAbbrev          String?
itemCoverageUnitName     String?
itemCoverageUnitAbbrev   String?
```

No new indexes (snapshot fields are read-through, never queried by). Nullable so the migration lands without a backfill blocker.

## Migration SQL

`packages/db/prisma/migrations/{timestamp}_add_product_unit_snapshots/migration.sql`:

```sql
ALTER TABLE "flooring_product"
  ADD COLUMN "sendUnitName"           TEXT,
  ADD COLUMN "sendUnitAbbrev"         TEXT,
  ADD COLUMN "stockUnitName"          TEXT,
  ADD COLUMN "stockUnitAbbrev"        TEXT,
  ADD COLUMN "itemCoverageUnitName"   TEXT,
  ADD COLUMN "itemCoverageUnitAbbrev" TEXT;
```

## Population strategy

| Event | Behavior |
|---|---|
| Product **create** | Application use case reads chosen `categoryId` → joins `FlooringCategory` (with sendUnit/stockUnit/itemCoverageUnit relations) → stamps all six snapshot columns from the category's UoM trio. |
| Product **update** where `categoryId` is unchanged | No re-stamp. Snapshot stays as-is. |
| Product **update** where `categoryId` changes | Re-stamp all six from the new category. |
| `FlooringUnitOfMeasure` rename (rare) | Intentionally NOT propagated. Snapshot is immutable post-write — same contract as inventory. |
| Pre-existing rows post-migration | Columns null. Reads fall back to the join chain when null, OR run a backfill script (`db:backfill:product-units`) modeled on the existing `db:backfill:product-names`. **Recommendation:** ship a backfill script alongside the migration so the join-chain fallback can be removed in the same commit. |

## Downstream impact

| Layer | File / area | Change |
|---|---|---|
| Domain | `flooring/products/types.ts` → `ProductRow` | Add the six snapshot fields. **Open:** flatten on `ProductRow` (mirrors `InventoryRow`) and drop the names-on-Category nesting, OR keep `ProductRowCategory` shape and duplicate. Recommendation: flatten on `ProductRow`, then trim `ProductRowCategory` down to just IDs + slug. |
| Domain | `flooring/work-orders/material-items/normalizers.ts` (NEW) | Project `sendUnitName/Abbrev` directly from product (not via category). |
| Domain | `management/templates/material-items/normalizers.ts` | Same. |
| Data | `packages/db/src/flooring/products/{read,write}-repository.ts` | Read selects drop `category.sendUnit/stockUnit/itemCoverageUnit` joins. Write paths stamp snapshots from chosen category at create + categoryId-change. |
| Data | `packages/db/src/flooring/work-orders/shared.ts` + `templates/shared.ts` | Item selects pull `sendUnitName/Abbrev` from product directly (or rely on the snapshot already on the item row from migration 02). |
| Application | Product create / update use cases | Read category UoM trio → stamp snapshot fields on write. |
| Module dirs | Product UI | No change — UI already consumes the existing names; once `ProductRow` flattens, controllers swap field paths. |

## Backfill script (companion to the migration)

`packages/db/scripts/backfill-product-units.js`:

- Iterate `FlooringProduct` rows where any of the six snapshot columns is null.
- For each, join through `category.sendUnit / stockUnit / itemCoverageUnit` and write the snapshot.
- Idempotent: safe to re-run.
- Run once after migration apply.

## Rollback

`DROP COLUMN` on each of the six. No data loss matters (columns are pure denormalization). Down migration is one-line per column.

## Validation steps (for staging Claude when executing)

1. Apply migration via `npm run db:deploy`. Confirm exit code 0.
2. Run `npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --exit-code`. Confirm "No difference detected" + exit 0.
3. Run `npm run db:generate` to refresh Prisma client.
4. Run `node scripts/backfill-product-units.js`. Confirm row count matches expected pre-existing product rows.
5. Spot-check: `SELECT COUNT(*) FROM flooring_product WHERE "sendUnitName" IS NULL` should be 0 after backfill (or only count products whose category has no `sendUnitId` set — which is a category-data issue, not a backfill bug).

## Pending — blocked on

Domain Q4 (WO-MI cut-log payload shape) doesn't touch this schema delta. This schema change is **independently approvable** — green-light it on its own and it can land in staging while the rest of the domain plan is being formed.

## Related files

- `a-branch/02-schema-pricing-cleanup-execution.md` — the prior schema sweep that added send-unit snapshots to inventory + items. Use as the format template for the execution report.
- `a-branch/03-domain-audit.md` — Q1 (sendUnitAbbrev on `ProductRowCategory`) becomes redundant if we flatten on `ProductRow` per the recommendation above. Audit will need a small follow-up note once this lands.
