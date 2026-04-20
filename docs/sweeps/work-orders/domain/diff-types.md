# Work Orders Domain — Diff Types

Three independent diff types, one per atomic-save section. Material-items diff nests a cut-logs diff per item.

## `MaterialItemsDiff` (with nested cut-logs)

```ts
export type MaterialItemDraft = {
  tempId: string
  productId: string
  quantity: string
  unitPrice: string
  notes: string | null
  cutLogs?: CutLogsDiff              // nested — optional (an added item may have no cuts yet)
}

export type MaterialItemUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: Partial<Pick<MaterialItemDraft, "productId" | "quantity" | "unitPrice" | "notes">>
  cutLogs?: CutLogsDiff              // nested diff against this item's existing cut logs
}

export type MaterialItemDelete = {
  id: string
  expectedUpdatedAt: string
  // cutLogs on a deleted item cascade to workOrderItemId = null (schema SetNull); no explicit cut-log diff needed
}

export type MaterialItemsDiff = {
  added: MaterialItemDraft[]
  modified: MaterialItemUpdate[]
  deleted: MaterialItemDelete[]
}
```

### Validator: `validateMaterialItemsDiff(diff, existing): void`

- Item-level structural checks (`quantity >= 0`, `productId` exists, stranded mod/delete ids, per-row `expectedUpdatedAt`).
- For each entry carrying a `cutLogs` nested diff: delegates to `validateCutLogsDiff(cutLogs, existingChildren, { kind: "workOrderItem", id: itemId })` from the cut-logs domain. Nested arithmetic invariants + status enum + linking rules all validated there.

## `ServiceItemsDiff`

```ts
export type ServiceItemDraft = {
  tempId: string
  serviceId: string | null
  name: string
  unitId: string
  quantity: string
  unitPrice: string
  notes: string | null
}

export type ServiceItemUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: Partial<Pick<ServiceItemDraft, "serviceId" | "name" | "unitId" | "quantity" | "unitPrice" | "notes">>
}

export type ServiceItemDelete = { id: string; expectedUpdatedAt: string }

export type ServiceItemsDiff = {
  added: ServiceItemDraft[]
  modified: ServiceItemUpdate[]
  deleted: ServiceItemDelete[]
}
```

### Validator: `validateServiceItemsDiff(diff, existing): void`

Structural: referenced `serviceId` / `unitId` exist, numeric fields parse, stranded mod/delete ids, per-row `expectedUpdatedAt`.

## `SalesRepsDiff`

```ts
export type SalesRepDraft = {
  tempId: string
  contactId: string
  percent: string  // 0 – 100
}

export type SalesRepUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: Partial<Pick<SalesRepDraft, "percent">>  // contactId immutable on update
}

export type SalesRepDelete = { id: string; expectedUpdatedAt: string }

export type SalesRepsDiff = {
  added: SalesRepDraft[]
  modified: SalesRepUpdate[]
  deleted: SalesRepDelete[]
}
```

### Validator: `validateSalesRepsDiff(diff, existing): void`

- `contactId` exists and isn't already assigned to this WO (pre-check; DB `@@unique([workOrderId, contactId])` is the backstop).
- `percent` ∈ [0, 100].
- Stranded mod/delete ids, per-row `expectedUpdatedAt`.
- Optional post-diff sum-to-100 warning (UX-only; not a hard reject by default).

## Issue describers

Each diff type ships with a `describe{Section}Issue(issue): string` for the validation-error UI.
