# V1 Master Plan — Sweeps 4-6 (cut-log handover, files, Railway env)

**Branch:** `staging` · **Drafted:** 2026-04-30 · **Status:** Awaiting confirmation

---

## Context

Sweeps 1-3 + ad-hoc imports work shipped end-to-end. Archived at [`sessions/sweeps-1-3/plan.md`](sweeps-1-3/plan.md) + [`sessions/sweeps-1-3/execution.md`](sweeps-1-3/execution.md). This plan covers what's left for V1: the cut-log handover from inventory to WO, the WO files section, and Railway env-var hygiene.

### What ships at the end of these sweeps

- **Inventory record view** is a read-only window into cut logs. Mutations live exclusively under WO record view. Inventory-side cut-log routes + workers + dead use cases gone.
- **WO record view** is the canonical place to manage cut logs: distinct Save Pending, Finalize Batch (clean-slate gated), and per-row Void affordances. The shared `useGatedBatchSelect` hook + `SelectAllButton` component (shipped in Sweeps 1-3 ad-hoc) power the finalize flow.
- **WO Files section** is the third sibling section of the WO record view — generate, open, delete files via existing routes + use cases + worker. File-gen worker becomes user-reachable.
- **Worker tuning** is fully Railway-driven — every worker exposes `*_CONCURRENCY`, `*_LOCK_DURATION_MS`, `*_INTERVAL_MS`, `*_TTL_MS`, `*_MAX_ATTEMPTS` envs. No code changes for tuning.

### Reusable assets from Sweeps 1-3

| Asset | Where | Use in this plan |
|---|---|---|
| `useGatedBatchSelect` hook | `apps/web/controllers/record/use-gated-batch-select.ts` | Sweep 4c — replaces bespoke `use-work-order-cut-log-finalize.ts` |
| `SelectAllButton` primitive | `apps/web/components/features/select-batch/` | Sweep 4c — drops into WOMI section header via `extraActions` |
| `extraActions` slot on `ActionHeader` | `apps/web/components/headers/action-header.tsx` | Sweep 4c — same usage pattern as imports |
| Domain invariant: workers update parent inventory `totalCutSum` in same tx | `apps/web/.../apply-cut-log-pending-diff.ts:53-55` | Sweep 4d — verify WOMI workers honor it |

---

## Sweep ordering (TL;DR)

| # | Sweep | Why this position | Layers touched | Schema commit? |
|---|---|---|---|---|
| 4a | Decommission inventory-side cut-log routes + workers | Has to land before 4b (UI cleanup follows API removal) and 4c (WOMI handover) | API, Worker, Application, Outbox events, Module controller | No |
| 4b | Inventory cut-logs section → read-only viewer | Follows 4a; drops the now-dead UI surfaces | Module (UI strip) | No |
| 4c | WOMI cut-log UI redesign + adopt shared batch-select | Core V1 change; depends on 4a/4b for clean state | Module (controller + components) | No |
| 4d | Verify domain invariant + dev-server smoke | Always last | Verification only | No |
| 5 | WO Files section UI (Phase 2c) | Deferred until 4c proves WOMI cut-log flow is solid | Module, Pages | No |
| 6 | Service variables → Railway | End of sweep; settle defaults after observing real flow | Worker env audit + Railway dashboard | No |

No schema changes. Each sweep ships as its own commit (4a/4b/4c/4d may bundle if blast radius is small).

---

## Sweep 4 — Inventory cut-log decomp + WOMI cut-log redesign + worker hardening verification

Largest sweep. Suggest splitting into 4a / 4b / 4c / 4d as separate commits.

### Goal

1. **Decommission inventory-side cut-log mutation** — delete API routes, workers, outbox event types, dead use cases. Inventory cut-logs section becomes a read-only viewer.
2. **Redesign WOMI cut-log UI** so Save Pending, Finalize Batch, and Void are visually + behaviorally distinct. Adopt the shared `useGatedBatchSelect` hook for finalize selection (replaces bespoke `use-work-order-cut-log-finalize.ts`).
3. **Verify** the domain invariant "workers updating cut logs always update parent inventory's `totalCutSum` in the same transaction" holds in the WOMI workers.
4. **Smoke-test** the full WOMI cut-log flow end-to-end on the live dev server.

### 4a. Decommission inventory-side cut-log routes + workers

**Critical files (delete or 410):**
- `apps/web/app/api/inventory/[id]/cut-logs/section/route.ts` — DELETE (was: pending diff save)
- `apps/web/app/api/inventory/[id]/cut-logs/finalize/route.ts` — DELETE
- `apps/web/app/api/inventory/[id]/cut-logs/void/route.ts` — DELETE
- `apps/web/app/api/inventory/[id]/cut-logs/links/route.ts` — DELETE (per resolved Open Q §4 from archive)
- `apps/web/app/api/inventory/[id]/cut-logs/_validators.ts` — DELETE (only consumed by the four routes above)
- `apps/worker/src/processors/pending-save-cut-log-batch.ts` — DELETE
- `apps/worker/src/processors/finalize-cut-log-batch.ts` — DELETE
- `apps/worker/src/processors/void-cut-log.ts` — DELETE (verify void is fully covered by WOMI synchronous path)
- `apps/worker/src/bootstrap.ts` — remove the three worker registrations + their env imports
- `apps/worker/src/env.ts` — remove the three corresponding concurrency / lock-duration env vars
- `packages/domain/src/queue/pending-save-cut-log-batch.ts`, `finalize-cut-log-batch.ts`, `void-cut-log.ts` — DELETE outbox event types
- `packages/application/src/flooring/inventory/cut-logs/` — audit each use case; delete those whose only consumers were the deleted routes. **Keep `apply-cut-log-pending-diff.ts` if WOMI workers still call into it** (it does — the parent inventory `totalCutSum` updater lives there).
- `apps/web/components/cut-log-row-actions/cut-log-links-editor.tsx` — DELETE (only consumed by the deleted links route surface)
- `apps/web/components/cut-log-row-actions/void-cut-log-button.tsx` — audit consumers. Currently used by the inventory section being made read-only in 4b. After 4b, check if WOMI uses it; if not, delete.

**modules/shared rule:** Per CLAUDE.md, do NOT delete from `modules/shared/` until 0 consumers remain. Audit `modules/shared/engines/record-view/contracts/cut-log-contracts.ts` consumers; if WOMI still uses these types, keep the file.

**Open question §A — dead-code aggressiveness (was Sweeps 1-3 Open Q §5, deferred):**
Delete the inventory-side use cases under `packages/application/src/flooring/inventory/cut-logs/` whose only consumers were the deleted routes? Or leave them as dead code in the application layer?
- **Recommendation:** delete. Typecheck guarantees correctness; dead code rots fastest.

### 4b. Inventory cut-logs section → read-only viewer

**Critical files:**
- `apps/web/modules/inventory/components/record/cut-logs/inventory-cut-logs-section.tsx` — strip add-row, edit-cell, finalize-button, void-button, save/discard. Keep grid display only. Becomes a "what cut logs exist on this inventory" viewer.
- `apps/web/modules/inventory/components/record/sections/inventory-historical-cut-logs-section.tsx` — already read-only by design; verify no controls.
- `apps/web/modules/inventory/controllers/use-inventory-cut-logs-section.ts` — strip mutation methods (`addRow`, `removeRow`, `setRowField`, `finalizeSelected`, `toggleSelection`, `discard`, `save`). Keep only data fetching + display state. Or delete entirely if it's pure display now (a server-row pass-through component doesn't need a controller).
- `apps/web/modules/inventory/controllers/drafts.ts` — `CutLogDraft` type + `validateCutLogDrafts` function become dead. Drop them.
- `apps/web/modules/inventory/components/record/inventory-record-panel.tsx` — adjust prop wiring; section now takes `cutLogs: CutLogRow[]` instead of drafts/controller.

### 4c. WOMI cut-log UI redesign — adopt shared batch-select

**Goal layout (refined):**

| Surface | Behavior |
|---|---|
| WOMI section header — `Save Pending Cut Logs` button | Visible always; **enabled only when section is dirty** (any pending cut log edits across expanded WOMI rows). Click → triggers `save-work-order-item-pending-cut-log-diff` worker for every dirty WOMI in scope. |
| WOMI section header — Finalize affordance via `SelectAllButton` + descriptor button | `SelectAllButton` (Select All Eligible / Clear Selection) gated by `canToggleSelection` (clean-slate). Once any cut log is checked → `Finalize Selected (N)` action button enables. Click → triggers `finalize-work-order-cut-log-batch` worker. |
| Per-row inline `Void` button | Each cut-log row gets a Void button. Click → opens `ConfirmDialog`: "Void cut log #CUT-NNNNNN? This cannot be undone." → confirm triggers the synchronous void API. |
| Section-wide edit-lock when finalize selection is active | Per the shared hook's `isSelectionActive` — material-item edits + cut-log edits + Add Row / Discard / Save Pending all disable. User clears selection or fires the batch to exit. |

**Key architectural decision (resolved) — always-visible-when-clean checkboxes:**

The original master plan called for a "Start Finalizing Batch" toggle that revealed checkboxes only after click. **Resolved 2026-04-30: drop the toggle.** Checkboxes always render on PENDING cut-log rows whenever the section is on a clean slate, gated by `canToggleSelection`. When the section is dirty (any pending cut log edits across expanded WOMIs), checkboxes are disabled. Matches the imports pattern shipped in Sweeps 1-3.

State diagram (drives all UI gating in 4c):

| Section state | Checkboxes on PENDING rows | Cell editability | Save Pending | SelectAll button | Finalize Selected |
|---|---|---|---|---|---|
| Clean, no selection | visible + interactive | editable | disabled (nothing dirty) | "Select All Eligible (N)" | disabled (no selection) |
| Clean, ≥1 selected | visible (locked at current state) | locked across all rows | disabled (nothing dirty) | "Clear Selection (M)" | enabled |
| Dirty (pending edits) | visible but disabled | editable | enabled | disabled | disabled |
| Saving / firing | visible but disabled | locked | disabled | disabled | "Finalizing..." (in flight) |

No mode toggle. The user's intent is inferred from state — they're either editing or selecting, never both at once.

**Critical files:**
- `apps/web/modules/work-orders/components/record/material-items/work-order-material-items-section.tsx` — section header gets the new buttons. Wire `useGatedBatchSelect` into the controller; pass `isSelectionActive`, `canToggleSelection`, `eligibleCount`, `toggleAllEligible` down to the children. Add Row / Discard / Save material items disable when `isSelectionActive`.
- `apps/web/modules/work-orders/components/record/material-items/work-order-cut-log-row.tsx` — each PENDING cut-log row gets a checkbox (gated by `canToggleSelection`) + a per-row Void button (with confirm dialog). Cells in the row lock when `isSelectionActive`.
- `apps/web/modules/work-orders/controllers/use-work-order-material-items-section.ts` — adopt `useGatedBatchSelect` for finalize. Expose dirty flags (material-items dirty + pending-cut-logs dirty across all expanded WOMIs) — combined dirty drives `Save Pending` enable + `canToggleSelection`.
- `apps/web/modules/work-orders/controllers/use-work-order-item-pending-cut-logs.ts` — expose section-level dirty flag for the new Save Pending button.
- `apps/web/modules/work-orders/controllers/use-work-order-cut-log-finalize.ts` — **DELETE** after migration. The shared `useGatedBatchSelect` replaces it. Confirmed via Sweep 1-3 explore: only consumed within WOMI flow.
- `apps/web/modules/work-orders/controllers/use-work-order-cut-log-void.ts` — wire confirm dialog handoff.

### 4d. Verify + smoke

- Confirm `apply-cut-log-pending-diff.ts:53-55` (the parent-inventory `totalCutSum` updater) is called by **both** the WOMI pending-diff worker AND the WOMI finalize-batch worker.
- Smoke test from live dev server (per CLAUDE.md "For UI or frontend changes, start the dev server and use the feature in a browser before reporting"):
  1. Open a WO record view with at least 2 WOMI rows linked to inventory
  2. Expand a WOMI row → add 2 pending cut logs → click `Save Pending Cut Logs` → confirm worker fires + cut logs persist in QUEUED state
  3. Click `Select All Eligible (N)` → all PENDING cut logs across expanded WOMIs check; Finalize Selected button enables; cells lock; Add Row / Discard / Save Pending disable
  4. Click `Finalize Selected` → worker fires + cut logs move to FINAL + parent inventory `totalCutSum` updates
  5. Click Void on a remaining cut log → confirm dialog → confirm → cut log moves to VOID + parent inventory `totalCutSum` updates
  6. Open the inventory record view → confirm cut logs section is read-only and displays the cut logs from the WO

### Verification

- `npm run typecheck` — full chain green
- All 6 smoke steps pass
- `grep -r "/api/inventory/.*cut-logs" apps/web/modules/` — no consumers (the inventory-side routes are gone and nothing tries to call them)
- `grep -rn "useWorkOrderCutLogFinalize" apps/web/` — no callers (bespoke hook is deleted)

---

## Sweep 5 — WO Files section UI (Phase 2c)

### Goal
Wire up the third sibling section of the WO record view: a Files section where users can open and delete generated files. File-generation worker (`apps/worker/src/processors/generate-work-order-file.ts`) already exists and triggers the `@builders/pdf` package. Once Sweep 4 proves WOMI cut-log management is solid AND the Railway build chain includes `@builders/pdf` (already a one-line fix the user has applied), file generation goes live.

### Critical files
- `apps/web/modules/work-orders/components/record/files/` — components already exist
- `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx` — add the third section after material-items
- `apps/web/app/api/work-orders/[id]/files/route.ts` — exists
- `apps/web/app/api/work-orders/[id]/files/[fileId]/route.ts` — exists
- `packages/application/src/flooring/work-orders/files/generate-work-order-file.ts` — exists (imports `@builders/pdf`)
- `packages/application/src/flooring/work-orders/files/request-work-order-file.ts` — exists
- `packages/application/src/flooring/work-orders/files/delete-work-order-file.ts` — exists

### Steps
1. Add the Files section as a sibling of primary + material-items in the WO record panel.
2. Wire a "Generate File" button that calls `request-work-order-file` use case → enqueues the file-gen worker.
3. List existing files with `Open` (signed URL to bucket) + `Delete` actions.
4. Confirm `generate-work-order-file` snapshots the WO data (including all final cut-logs) so the rendered PDF reflects the state at generation time.

### Open question §C — PDF content gaps (was Sweeps 1-3 Open Q §6, deferred)
Does the rendered PDF need any data shape we don't have today (specific layout of cut logs, photos of installed product, custom branding)? Or is current `generate-work-order-file.ts` sufficient as scaffolded?
- **Recommendation:** ship as scaffolded; iterate post-V1 if user surfaces gaps.

### Verification
- Open a WO with finalized cut logs → click Generate File → confirm worker fires + file appears in the section after generation completes
- Open the file → confirm PDF renders with WO data + material items + cut logs
- Delete a file → confirm record + bucket object both gone

---

## Sweep 6 — Service variables → Railway

### Goal
Audit which worker tuning vars are environment-driven, fill any gaps (TTL, interval, retry-count, dead-letter), and document the Railway dashboard config per service so the user can tune concurrency without touching the repo.

### Critical files
- `apps/worker/src/env.ts` — Zod schema for all worker env vars. Audit: every worker should expose `*_CONCURRENCY`, `*_LOCK_DURATION_MS`, `*_INTERVAL_MS` (if polling), `*_TTL_MS` (if applicable), `*_MAX_ATTEMPTS`.
- `apps/worker/src/bootstrap.ts` — verify each `Worker` constructor consumes the env-derived config.
- `sessions/sessions-1-through-11/session-5-cut-logs/staging-railway-service-variables-audit.md` — exists; use as starting point.
- Railway dashboard — per-service env vars for `tsx-flooring-app`, `tsx-flooring-worker`, `tsx-flooring-relay`. No code change to the dashboard, but document required vars.

### Steps
1. Audit current `env.ts` schema — list every worker, every var, every default.
2. Identify gaps: workers without TTL, workers without max-attempts, workers without interval (where applicable). Add to schema with sane defaults.
3. Document the full env-var list per service in a markdown that can be pasted into Railway. Suggested location: `sessions/sweep-6-railway-env-vars.md` (lives next to this plan since it's a deliverable, not a sub-folder artifact).
4. After the doc, the user sets values in Railway dashboard. No deploy needed for env-only changes (Railway redeploys on var change).

### Verification
- Set an unrealistically low concurrency (e.g. 1) for the WOMI finalize worker in Railway → trigger 5 finalize batches simultaneously → confirm only 1 runs at a time
- Reset to production value
- `grep -rn "concurrency\|lockDuration\|interval\|ttl\|attempts" apps/worker/src/processors/` — no hardcoded values; everything pulls from env

---

## Resolved decisions

- **§B — Sweep 4c selection-mode UX (2026-04-30):** Drop the explicit "Enter Selection Mode" toggle. Checkboxes always visible on PENDING rows when section is clean, disabled when section is dirty. Matches imports' pattern. State diagram in Sweep 4c above.

## Open questions (need answers before execution)

1. **§A — Sweep 4a dead-code aggressiveness:** delete the inventory-side use cases under `packages/application/src/flooring/inventory/cut-logs/` whose only consumers were deleted routes? **Recommendation: delete.**
2. **§C — Sweep 5 PDF content gaps:** ship `generate-work-order-file.ts` as scaffolded? **Recommendation: yes; iterate post-V1.**
3. **§D — Sweep 4c bespoke `use-work-order-cut-log-finalize.ts`:** delete after WOMI adopts the shared hook? **Recommendation: delete; only consumer is WOMI flow which is being migrated.**
4. **§E — Sweep 4a `void-cut-log.ts` worker disposition:** the WOMI void path is synchronous (no worker). The dedicated `void-cut-log.ts` worker was inventory-side only. **Recommendation: delete the worker. Confirm WOMI flow is purely synchronous before deleting the outbox event type + processor.**

---

## After approval

Per CLAUDE.md:
1. This plan is **locked** once approved.
2. `sessions/v1-master-execution.md` is updated after each sweep (and per sub-step within Sweep 4) ships.
3. Mid-sweep plan changes are recorded in this plan file.
4. A 4th file (`sessions/v1-master-cleanup.md`) may be created if execution surfaces follow-ups.
5. Schema commits stay isolated (no schema changes planned).
6. Commit messages provided per sweep; **DO NOT commit changes** without explicit user instruction.
