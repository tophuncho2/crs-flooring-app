# Cut Logs Domain — Diff Types

Shapes + validator for the cut-logs child-section atomic save. Parent-scoped: same types used by both parent paths (inventory record view and work-order record view), with the parent context discriminator selecting the right linking rule set.

Under `packages/domain/src/flooring/cut-logs/diff-types.ts`.

## Shape

```ts
export type CutLogDraft = {
  tempId: string
  inventoryId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string
  cut: string
  after: string
  status: CutLogStatus
  notes: string | null
}

export type CutLogUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: Partial<Pick<CutLogDraft,
    "before" | "cut" | "after" | "status" | "notes" | "workOrderId" | "workOrderItemId"
  >>
  // inventoryId is never patchable — reassigning a cut to a different inventory row is a delete + add, not an update
}

export type CutLogDelete = {
  id: string
  expectedUpdatedAt: string
}

export type CutLogsDiff = {
  added: CutLogDraft[]
  modified: CutLogUpdate[]
  deleted: CutLogDelete[]
}

export type CutLogsDiffParent =
  | { kind: "inventory"; id: string }
  | { kind: "workOrderItem"; id: string }
```

## Validator

### `validateCutLogsDiff(diff, existing, parent): void`

Throws `CutLogExecutionError({ code: "CUT_LOG_VALIDATION_FAILED", status: 400, issues })` with the full issue list on any failure. Checks:

- **Arithmetic invariant** `before − cut === after` on every added and modified row.
- **Status enum** via `isCutLogStatus` on every added / modified `status` value.
- **Linking rules** (context-dependent — see `rules.md`):
  - `parent.kind === "inventory"` → every entry's `inventoryId` must equal `parent.id`. `workOrderId` / `workOrderItemId` optional but consistent when both set.
  - `parent.kind === "workOrderItem"` → `workOrderItemId` must equal `parent.id`; `workOrderId` must equal the parent item's owning work order; `inventoryId` required.
- **Stranded modifications / deletes**: every `modified[].id` and `deleted[].id` must be in `existing`.
- **Per-row `expectedUpdatedAt`** on modifies / deletes.
- **Structural shape**: decimals parse, `notes` string-or-null, etc.

**Does not** run `canAddCutLog(inventory)` — that's the parent use case's responsibility, because the inventory row being referenced may not be in the validator's scope when it's called purely structurally. The parent use case loads the target inventory (already locked) and runs the gate per added entry before calling the diff primitive.

## Issue describer

### `describeCutLogsDiffIssue(issue): string`
Maps an issue code (`CUT_LOG_ARITHMETIC_INVALID`, `CUT_LOG_STATUS_INVALID`, `CUT_LOG_PARENT_MISMATCH`, `CUT_LOG_NOT_FOUND`, `CUT_LOG_UPDATE_CONFLICT`) to a human-readable message.

## Validator signature

```ts
export function validateCutLogsDiff(
  diff: CutLogsDiff,
  existing: CutLogRow[],
  parent: CutLogsDiffParent,
): void
```
