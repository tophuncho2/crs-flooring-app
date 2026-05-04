# Lock down cut log edits in Work Orders record view — execution

Plan: `~/.claude/plans/in-the-work-orders-federated-firefly.md`
Branch: `staging`
Layer: **Module** (UI only — no schema, domain, application, or API changes)

## Goal

Prevent the cut-log edit panel from accepting input on rows the server already rejects. The server is authoritative — `assertCutLogPendingMutationAllowed` inside the PATCH/DELETE use-case transactions returns 409 for any non-PENDING row — so this change is UX hygiene, not a security fix.

## What changed

| File | Change |
|---|---|
| [cut-log-edit-form-fields.tsx](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-form-fields.tsx) | Added `isCutLogPendingEditable` import; computed `isReadOnly` + `fieldsEditable`; flipped `editable={!isSaving}` → `editable={fieldsEditable}` on the three actually-editable cells (`cut`, `isWaste`, `notes`). |
| [cut-log-edit-action-buttons.tsx](apps/web/modules/work-orders/components/record/material-items/cut-log-edit-panel/cut-log-edit-action-buttons.tsx) | Added `isCutLogPendingEditable` import; added `isLocked` check; `saveDisabled` now includes `isLocked`; Save button gets a tooltip explaining why it's locked (FINAL vs VOID). Updated the disabled-rules header comment. |

## Discoveries / divergence from plan

- The plan listed five editable fields (`cut`, `cost`, `freight`, `isWaste`, `notes`); the panel actually only renders three (`cut`, `isWaste`, `notes`). User confirmed mid-implementation: keep `cost`/`freight` out.
- The plan called for locking the inventory/link selector. In the actual code, in **edit** mode the inventory is already a static read-only `TextCell` (line 188-192), and in **create** mode the `isLocked` check doesn't apply. So no link-picker change was needed.
- No banner; tooltip-only on the disabled Save button (per user direction during planning).

## Server-side rejection — confirmed

| Path | Use case | Predicate (in TX) | Status |
|---|---|---|---|
| PATCH `…/cut-logs/[id]` | `updatePendingCutLogUseCase` ([update-pending-cut-log.ts:98](packages/application/src/flooring/work-orders/cut-logs/update-pending-cut-log.ts:98)) | `assertCutLogPendingMutationAllowed` | 409 `WORK_ORDER_CUT_LOG_NOT_PENDING` |
| DELETE `…/cut-logs/[id]` | `deletePendingCutLogUseCase` ([delete-pending-cut-log.ts:91](packages/application/src/flooring/work-orders/cut-logs/delete-pending-cut-log.ts:91)) | `assertCutLogPendingMutationAllowed` | 409 `WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED` |
| POST `…/void` | `voidWorkOrderCutLogUseCase` | `canVoidCutLog` | 409 (rejects already-void) |

Predicate body ([editability.ts:102](packages/domain/src/flooring/inventory/cut-logs/editability.ts:102)):

```ts
isCutLogPendingEditable(row) = row.status === "PENDING" && !row.isFinal && !row.void
```

Both UPDATE and DELETE call the guard inside `withDatabaseTransaction` after a fresh row read. There is no code path that lets an UPDATE or DELETE land on a FINAL or VOID row.

## Verification

- `npm run typecheck --workspace @builders/web` → passes.
- Manual UI smoke test pending — open a work order with a FINAL cut log, confirm:
  1. Cut / Waste / Notes inputs are not editable.
  2. Save button is disabled with the "finalized" tooltip.
  3. Void button is enabled. Clicking flips the row to VOID.
- Then on a VOID row: all three inputs disabled, Save tooltip reads "voided", every action button disabled.

## Commit message (DO NOT COMMIT — per CLAUDE.md)

```
work-orders: lock cut log edit panel on FINAL/VOID rows

The server already rejects PATCH/DELETE against non-PENDING cut logs via
assertCutLogPendingMutationAllowed (409). The edit panel now mirrors that
guard in the UI: cut/isWaste/notes inputs become read-only and Save is
disabled (with a tooltip explaining why) once a row is finalized or
voided. Void/Delete disable rules already gated correctly and are
unchanged. Pure UI fix — no schema, domain, application, or API edits.
```
