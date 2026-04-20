# Cut Logs Domain — Rules

Pure predicate / invariant functions under `packages/domain/src/flooring/cut-logs/cut-log-rules.ts`.

## `isCutLogStatus(value: unknown): value is CutLogStatus`
Enum guard — returns `true` iff value is in `CUT_LOG_STATUS_VALUES`.

## Arithmetic invariant: `before − cut === after`
Per-row invariant enforced by the diff validator on every added and modified cut log. Applied via exact decimal comparison (not float math). Rejected with `CutLogExecutionError({ code: "CUT_LOG_ARITHMETIC_INVALID", status: 400 })` on violation.

No standalone function — the check is a line inside `validateCutLogsDiff`. Exposed as `assertCutLogArithmetic(row)` for testability and for callers that want to check a single cut-log shape outside the diff context.

## Linking rules

The rule set is **context-dependent** on the parent:

### When parent is `{ kind: "inventory", id }`
- `inventoryId` must equal `parent.id`.
- `workOrderId` optional; when set, must reference an existing work order.
- `workOrderItemId` optional; when set, must reference an existing material item that belongs to `workOrderId` AND whose `productId` equals the inventory row's `productId` (the cascading-dropdown contract).

### When parent is `{ kind: "workOrderItem", id }`
- `inventoryId` required and must reference an existing inventory row.
- `workOrderItemId` must equal `parent.id`.
- `workOrderId` must equal the parent item's `workOrderId` (auto-linked by the use case — validator confirms).

Enforced inside `validateCutLogsDiff(diff, parent)`.

## `canAddCutLog` gate
Not defined here — lives in the inventory domain (it's a property of the inventory row). Both parent paths invoke it before allowing any `added[]` cut-log entry. Throws the inventory domain's `CUT_LOG_INVENTORY_NOT_IMPORTED` error code on violation.

## `isCutLogDeleteBlocked(cutLog, parent)` — deferred placeholder
Currently returns `{ blocked: false }` unconditionally. Reserved for future rules like "FINAL cuts can't be deleted without supervisor override". Status-driven behavior beyond `awaitingCut` is out of scope for this sweep — the plan's Out of Scope section calls it out.

## Starting-balance invariant
Not defined here — lives in the inventory domain as `computeStockAvailable`'s assertion. Called by both parent paths with the post-diff cut-log projection; throws inventory's `CUT_LOG_EXCEEDS_STARTING_BALANCE` code on violation.

The cut-logs domain explicitly does not own this rule because the invariant is about `inventory.stockCount`, not about the cut-log row itself. Cross-module rule placement follows "owns the invariant target" — the target is `inventory.stockAvailable`, therefore the inventory module owns the rule.
