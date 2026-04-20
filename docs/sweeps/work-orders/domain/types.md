# Work Orders Domain — Types

Canonical types under `packages/domain/src/flooring/work-orders/`.

## `WorkOrderRow` / `WorkOrderForm`

Primary-section row shape.

- `id: string`
- `workOrderNumber: string` — DB-assigned (`WO-{5-digit}`), immutable
- `propertyId: string`
- `templateId: string | null`
- `warehouseId: string | null`
- `status: FlooringWorkOrderStatus`
- `isComplete: boolean`
- `vacancy: FlooringVacancyStatus | null`
- `scheduledFor: string | null` (date-only)
- `unitLabel: string | null` / `unitType: string | null` / `customAddress: string | null`
- `instructions: string | null` / `notes: string | null`
- `googleDriveSlip: string | null` / `googleDocUrl: string | null`
- `templateSyncedAt: string | null` / `templateSyncMode: string | null` / `templateSnapshotHash: string | null`
- `createdAt: string` / `updatedAt: string`

### Computed field on `WorkOrderRow` (not stored)
- `fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"` — aggregate; see `fulfillment-status.md`.

`WorkOrderDetailRow` extends with relation-loaded `items: WorkOrderMaterialItemRow[]` (each with its own nested `cutLogs: CutLogRow[]`), `serviceItems: WorkOrderServiceItemRow[]`, `salesReps: WorkOrderSalesRepRow[]`, `analytics: WorkOrderAnalyticsRow | null`.

## `WorkOrderMaterialItemRow` / `WorkOrderMaterialItemForm`

- `id: string`
- `workOrderId: string`
- `productId: string`
- `sourceTemplateItemId: string | null`
- `quantity: string` — decimal string, send-unit
- `unitPrice: string`
- `notes: string | null`
- `createdAt: string` / `updatedAt: string`

### Computed field (not stored)
- `fulfillmentStatus: "SHORTAGE" | "SUFFICIENT"` — computed per item from child cut-log `cut` totals via category-aware unit conversion.

**No `allocationStatus`, no `changeOrderStatus` columns** — both dropped in Phase A.

## `WorkOrderServiceItemRow` / `WorkOrderServiceItemForm`

- `id`, `workOrderId`, `sourceTemplateServiceItemId: string | null`
- `serviceId: string | null`, `name: string`, `unitId: string`
- `quantity: string`, `unitPrice: string`, `notes: string | null`
- `createdAt`, `updatedAt`

## `WorkOrderSalesRepRow` / `WorkOrderSalesRepForm`

- `id`, `workOrderId`, `sourceTemplateSalesRepId: string | null`
- `contactId: string`, `percent: string` (decimal 0–100)
- `createdAt`, `updatedAt`

## Constants

```ts
export const WORK_ORDER_STATUS_VALUES = [
  "BUILDING_ORDER",
  "PENDING_EXPORT",
  "CARPET_CLEANING",
  "SENT_OUT",
  "PENDING",
  "PULL_TEMPLATE",
  "MODIFY",
] as const
export type WorkOrderStatus = typeof WORK_ORDER_STATUS_VALUES[number]

export const VACANCY_STATUS_VALUES = ["VACANT", "OCCUPIED"] as const
export type VacancyStatus = typeof VACANCY_STATUS_VALUES[number]
```

`FlooringWorkOrderStatus` and `FlooringVacancyStatus` are the DB-generated enums (from Prisma); the domain mirrors them as closed-set string unions for TS ergonomics. Both paths are equivalent.

## Helpers

- `EMPTY_WORK_ORDER_FORM`, `EMPTY_WORK_ORDER_MATERIAL_ITEM_FORM`, `EMPTY_WORK_ORDER_SERVICE_ITEM_FORM`, `EMPTY_WORK_ORDER_SALES_REP_FORM`
- `toWorkOrderForm`, `toMaterialItemForm`, etc.
- `formatWorkOrderNumber` — identity pass-through (the `WO-` prefix is in the stored value).
- `formatWorkOrderStatus(s): string` — status → display label map.
- `formatVacancyStatus(v): string` — `"Vacant"` / `"Occupied"`.
