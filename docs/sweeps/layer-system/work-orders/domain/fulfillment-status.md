# Work Orders Domain — Fulfillment Status

Computed-only status model under `packages/domain/src/flooring/work-orders/fulfillment-status.ts`. Replaces the retired `allocationStatus` / `changeOrderStatus` columns with read-time derivation.

## Constants

```ts
export const FULFILLMENT_STATUS_VALUES = ["SHORTAGE", "SUFFICIENT"] as const
export type FulfillmentStatus = typeof FULFILLMENT_STATUS_VALUES[number]
```

Two values only. No middle ground (no "partially allocated"); overage allowed but not distinguished. A quantity is either covered by its cut logs or it isn't.

The Prisma-generated enum `FlooringChangeOrderStatus { SHORTAGE, SUFFICIENT }` is retained in the schema purely as a TS type source; no column stores it. Domain uses its own `FULFILLMENT_STATUS_VALUES` constant for wire format — both paths happen to align on the same two uppercase strings.

## `computeItemFulfillmentStatus({ quantityInSendUnit, cutLogsCutTotalInStockUnit, product, category }): FulfillmentStatus`

Per material item:

```
sendUnitCovered = cutLogsCutTotalInStockUnit × product.coveragePerUnit
return sendUnitCovered >= quantityInSendUnit ? "SUFFICIENT" : "SHORTAGE"
```

Delegates to inventory domain's `convertStockToSend` / `isItemFulfilled` for the math. Category-aware unit conversion is applied inside `convertStockToSend` (see `../../inventory/domain/unit-conversion.md`).

**Overage allowed**: `>` is still SUFFICIENT. A job that needs 100 sqft can have cut logs supplying 120 sqft — still SUFFICIENT.

**Cut-log status is irrelevant to this computation**: `cutLogsCutTotalInStockUnit` sums all cuts regardless of `PENDING` vs `FINAL`. Both count toward fulfillment. (A separate future rule may distinguish them — out of scope for this sweep.)

## `computeWorkOrderFulfillmentStatus(items: { fulfillmentStatus: FulfillmentStatus }[]): FulfillmentStatus`

Aggregate all-or-nothing:

- Every item SUFFICIENT → `"SUFFICIENT"`.
- Any item SHORTAGE → `"SHORTAGE"`.
- Zero items → `"SHORTAGE"` (an empty work order has nothing to fulfill, but labeling it SUFFICIENT would be misleading in the UI; the conservative choice is SHORTAGE).

## `formatFulfillmentStatus(s: FulfillmentStatus): string`

- `"SUFFICIENT"` → `"Assigned"`
- `"SHORTAGE"` → `"Short"`

Used on the WO list badge, WO detail header, and per-item row in the material-items section.

## Never stored — always recomputed on read

- Schema has no `fulfillmentStatus` column on `flooring_work_order` or `flooring_work_order_item`.
- Data-layer list reads compute via aggregate SQL over cut logs + item quantity + product coverage (see `../data/computed-fields.md`).
- Data-layer detail reads compute via the relation-loaded nested cut-log array.
- Writes never touch fulfillment — it is a pure read-side projection.

Consequence: **no drift possible**. A mutated cut log changes the next read's `fulfillmentStatus` automatically; there is no stored counter to update, no reconciliation job, no backfill migration if the formula changes.
