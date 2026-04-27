# Cut-Log Follow-Ups (Deferred from Sweep 7)

**Date opened:** 2026-04-27 (end of session-5)
**Origin:** Sweep 7 cut-log UI section migration + controllers — see `session-5/sweep-7-cut-log-ui-controllers-rebuild-report.md`.
**Cut-log alteration core (sweeps 1–7):** shippable end-to-end. These are post-MVP refinements — no architectural blocker.

## Items

### 1. Set-Links picker UI

**What:** The cut-log row's "Set Links" button currently renders as a disabled placeholder. Clicking should open a picker that lets the user select a work-order + a dependent work-order-item, then PATCH the existing `…/cut-logs/links` route with the chosen pair.

**Why deferred:** Picker requires a work-orders + items loader threaded page → panel → section → row widget, plus dependent-dropdown UX work. Substantial scaffolding for what the rest of sweep 7 didn't need.

**What's already in place:** API route + use case + domain validator handle non-null link writes today. Clear-Links works. The PATCH `…/cut-logs/links` endpoint is the same route — only the body shape (non-null `workOrderId` + `workOrderItemId`) changes.

**Scope:** small sweep.
- Add a `listWorkOrderOptionsForCutLogLinks()` reader in `packages/db/src/...` returning `{ workOrders: [{ id, label, items: [{ id, label }] }] }`.
- Extend `apps/web/modules/inventory/data/queries.ts`'s `getInventoryDetailPageData` to include `workOrderOptions`.
- Thread through `apps/web/app/dashboard/inventory/[id]/page.tsx` → `inventory-detail-client.tsx` → `inventory-record-panel.tsx` → `InventoryCutLogsSection` → row widget.
- Replace the disabled "Set Links" button in `apps/web/components/cut-log-row-actions/cut-log-links-editor.tsx` with a popover containing two `SelectDropdown` components; on Save fires the existing `updateCutLogLinksRequest` with the chosen pair.

### 2. Read-only rows merged back into a single canonical Grid

**What:** Sweep 7's section component renders the read-only rows (FINAL, VOID, QUEUED) as a separate inline `<ul>` below the editable `Grid`. Reason: the `Grid<TRow>` generics parametrize the layout on the row type, and the editable layout was typed for `GridDraftRow`; a second `Grid<GridReadOnlyRow>` couldn't share the same `GridLayout` instance.

**Why deferred:** Requires either (a) a generic-row Grid layout that's loose enough to accept either row shape, or (b) a "scoped read-only" pattern similar to staged-inv's `ScopedRow`. Both are bigger than the inline `<ul>` workaround.

**Scope:** UX-polish pass.
- Option A: define `GridLayout<{id: string}>` and cast both editable + read-only rows into the same shape with cell renderers branching on row identity.
- Option B: investigate the `ScopedRow` pattern from `apps/web/components/CLAUDE.md` (warehouse precedent — parent + child rows with distinct layouts interleaved via Fragment).

### 3. Panel-local `cutLogs` ↔ controller `record.cutLogs` sync via `useEffect`

**What:** The cut-logs panel (`inventory-record-panel.tsx`) keeps a local `useState<CutLogRow[]>(controller.record.cutLogs)` snapshot so the section's optimistic updates can splice fresh rows in. If the controller's `record.cutLogs` updates from another path (manual page reload, future polling), the local state doesn't auto-sync.

**Why deferred:** Edge case in practice — a manual refresh resolves the drift, and the cut-log alteration's sync model assumes optimistic updates are the dominant path.

**Scope:** UX-polish pass. Add a `useEffect` to the panel that syncs local `cutLogs` state from `controller.record.cutLogs` when the controller's record updates. Watch out for infinite loops between optimistic publish and the effect.

### 4. Browser smoke + UX polish pass

**What:** Couldn't manually click-test the section in this session. Recommended path:

1. Start `npm run dev:web`, `npm run dev:relay`, `npm run dev:worker` (three terminals).
2. Navigate to an inventory detail page with at least one existing cut log.
3. Click through: Add Row → Save → Finalize Selected → Void → Clear Links.
4. Verify Bull Board (`localhost:3011/admin/queues`) shows queue activity.
5. Inspect outbox: `cd packages/db && DOTENV_CONFIG_PATH=../../.env node -r dotenv/config scripts/inspect-outbox.mjs`.

**Why deferred:** The cut-log pipeline was smoke-tested end-to-end via the script-based smoke during sweep 5 (see `session-5/smoke-test-cut-log-pipeline-report.md`). The browser layer added in sweep 7 needs a manual click-through to surface any UI-only regressions.

### 5. Pre-existing 57 typecheck errors in unrelated modules

**What:** `apps/web` typecheck shows 57 errors. Stash-test confirmed: 57 with sweep-7 changes vs 57 without. **Zero are sweep-7-attributable.** They live in:

- `apps/web/app/api/admin/users/` — `Role` vs `GovernableRole` type mismatch (3 errors).
- `apps/web/modules/admin/` — `ManagedUserWithPermissions` missing `updatedAt` (1 error).
- `apps/web/modules/work-orders/record/panel/` — missing modules (`./sections/material-allocations-editor`, `./controllers/use-work-order-sales-reps-section`, `@/modules/work-orders/types`, etc.) and implicit-`any` parameters (~13 errors total).
- `apps/web/modules/shared/engines/record-view/panel/` — engine-internal path errors (~5 errors).

**Why deferred:** Out of scope for the cut-log alteration. The work-orders module has been mid-rewrite on the `staging` branch since sweep 1 — likely the next big initiative after cut logs ship.

**Scope:** separate cleanup sweep, owner TBD.

### 6. Staged-inv `types.ts` Prisma import cleanup

**What:** `packages/domain/src/flooring/imports/staged-inventory-rows/types.ts` directly imports `FlooringStagedRowStatus` from `@prisma/client`, which violates `packages/domain/CLAUDE.md` rule 1 and `npm run guard:prisma`. The cut-log half of the same violation was fixed in sweep 2 by replacing the import with a pure string-literal union.

**Why deferred:** Out of scope for the cut-log alteration. Same fix shape as sweep 2 — replace the import with a string-literal union mirroring the Postgres enum's value set.

**Scope:** trivial. One file edit + a build to refresh dist.

### 7. Work-order-link DB CHECK constraint (deferred indefinitely)

**What:** The intent doc considered a Postgres `CHECK` constraint to enforce "both `workOrderId` + `workOrderItemId` are set together OR both are null" at the DB level. Currently enforced at the domain level by `assertCutLogLinkageSymmetry`.

**Why deferred indefinitely:** The domain rule is sufficient for any code path that goes through the application layer. Adding a DB-level CHECK is belt-and-suspenders against direct DB writes that bypass the application. Worth considering only if direct DB writes ever become a real concern.

**Scope:** small migration if ever pursued.

## What's NOT a follow-up — already shipped end-to-end

- Schema (sweep 1) — `cutLogNumber`, `finalCutSequence`, `isFinal`, `QUEUED` enum.
- Domain (sweep 2) — predicates, validators, payload schemas, pure helpers.
- Data (sweep 3) — repository primitives, locked-tx helpers, `MAX(finalCutSequence)` lookup.
- Application (sweep 4) — 7 use cases (3 producer/consumer pairs + sync link).
- Worker plumbing (sweep 5) — relay dispatchers + worker handlers + outbox topic registration. Smoke-tested end-to-end.
- API routes (sweep 6) — 4 cut-log routes through the canonical mutation gauntlet.
- UI section + controllers (sweep 7) — section component, batch-finalize, void widget, link clear, optimistic updates.
- `useBatchSelectAction` extracted (sweep 7) — reused by staged-inv mark-for-import.
- Worker `autorun: false` cosmetic fix (post-sweep-5) — eliminates cold-start log gap.

The cut-log alteration's core architecture is shippable. The follow-ups above are refinements on top.
