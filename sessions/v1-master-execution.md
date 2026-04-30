# V1 Master Execution Log — Sweeps 4-6

**Branch:** `staging` · **Plan:** [`sessions/v1-master-plan.md`](v1-master-plan.md) · **Started:** 2026-04-30

This file is updated after each sweep (and per sub-step within Sweep 4) ships. Sweeps 1-3 + ad-hoc imports work archived at [`sessions/sweeps-1-3/`](sweeps-1-3/).

---

## Status

| # | Sweep | Status | Date | Commit(s) |
|---|---|---|---|---|
| 4a | Decommission inventory-side cut-log routes + workers | ⬜ Not started | — | — |
| 4b | Inventory cut-logs section → read-only viewer | ⬜ Not started | — | — |
| 4c | WOMI cut-log UI redesign + adopt shared batch-select | ⬜ Not started | — | — |
| 4d | Verify domain invariant + dev-server smoke | ⬜ Not started | — | — |
| 5 | WO Files section UI (Phase 2c) | ⬜ Not started | — | — |
| 6 | Service variables → Railway | ⬜ Not started | — | — |

Legend: ⬜ Not started · 🟡 In progress · ✅ Shipped · ❌ Blocked

---

## Pre-flight: open questions

All resolved 2026-04-30. Plan locked.

| # | Question | Resolution |
|---|---|---|
| §A | Sweep 4a — dead-code aggressiveness | ✅ Delete inventory-side use cases whose only consumers were the deleted routes. Keep `apply-cut-log-pending-diff.ts` (WOMI workers still call it for parent-inventory `totalCutSum`). |
| §B | Sweep 4c — selection-mode UX (drop the toggle?) | ✅ Drop the toggle. Checkboxes always-visible-when-clean, disabled-when-dirty. Matches imports. |
| §C | Sweep 5 — PDF content gaps | ✅ Ship `generate-work-order-file.ts` untouched. Sweep 5 only wires UI; no PDF content changes. Iterate post-V1 if real gaps surface. |
| §D | Sweep 4c — `use-work-order-cut-log-finalize.ts` disposition | ✅ Delete after WOMI adopts shared `useGatedBatchSelect`. Only consumer is the WOMI flow being migrated. |
| §E | Sweep 4a — `void-cut-log.ts` worker disposition | ✅ Delete the worker + outbox event type + processor. Confirmed by reading `void-work-order-cut-log.ts`: synchronous use case handles row lock (`FOR UPDATE`), patch (clears fields + sets VOID), `recomputeAndPersistTotalCutSums`, invariant check — all in one tx. |

---

## Sweep 4a — Decommission inventory-side cut-log routes + workers

_Not started._

### Files to touch (anticipated)
_(populate at execution)_

### Commit
_(populate at completion)_

### Verification results
_(populate at completion)_

### Follow-ups surfaced
_(populate at completion)_

---

## Sweep 4b — Inventory cut-logs section → read-only viewer

_Not started._

---

## Sweep 4c — WOMI cut-log UI redesign + adopt shared batch-select

_Not started._

### Adoption plan (pre-execution sketch)
- Replace `useWorkOrderCutLogFinalize` with `useGatedBatchSelect` (consumed in `use-work-order-material-items-section.ts`)
- Section header: `Save Pending Cut Logs` (descriptor action) + `SelectAllButton` (`extraActions` slot) + `Finalize Selected (N)` (descriptor action, gated on `eligibleSelectedIds.length > 0`)
- Per-row Void button on cut-log rows + `ConfirmDialog`
- Cell editability: `!locked && !isSelectionActive` (mirrors imports section pattern)
- Action button gating mirrors imports: `disabled || isSelectionActive` on Save Pending / Discard / Add Row

---

## Sweep 4d — Verify domain invariant + dev-server smoke

_Not started._

---

## Sweep 5 — WO Files section UI (Phase 2c)

_Not started._

---

## Sweep 6 — Service variables → Railway

_Not started._
