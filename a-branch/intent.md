# Branch Intent — `schema/work-orders-material-items`

## Scope

Two modules: **Work Orders** (`FlooringWorkOrder` + `FlooringWorkOrderItem`) and **Templates** (`FlooringTemplate` + `FlooringTemplateItem`). Cut logs are touched only as a downstream relation — they are already migrated.

This branch is **schema-first**. Prisma is updated before any layer above it. The ~50 outstanding TS errors are not fixed up-front; they heal as each subsequent layer is brought in line with the new schema.

## Layer order (strict)

1. **Schema (Prisma)** — add status enum + column on WO; add `FlooringWorkOrderFile` child table; do not delete `unitPrice` columns.
2. **Domain** — pure types, normalizers, form rules, error messages updated for status + file rows + sync.
3. **Data** — selects, read/write repositories, outbox repository helpers for WO file generation.
4. *(pause for a pass-through review before application starts)*
5. **Application** — use cases including a brand-new `application/src/flooring/work-orders/`. Includes `createWorkOrderFile` + `deleteWorkOrderFile` (see below).
6. **Relay outbox + Worker handlers** — file-generation dispatcher + processor for WO; queue wired in `apps/worker/src/queues` + `apps/relay/src/dispatch`. Auto-assign worker out of scope this sweep.
7. **API** — sectional routes under `apps/web/app/api/work-orders/...` (currently missing entirely) and updates to `apps/web/app/api/templates/...`.
8. **Module dirs (`apps/web/modules/...`)** — UI components, controllers, hooks, transport, query policies. Conform to `apps/web/modules/CLAUDE.md` shape.

API and module-dir order may swap during step 7–8; dashboard SSR loaders pull from `modules/{module}/data/queries.ts`, so the modules dir is the import surface.

## Schema changes (this sweep)

### Work orders (`FlooringWorkOrder`)

- Add `status` enum column (new `FlooringWorkOrderStatus`), default `IDLE`.
- Single shared status field covers both worker jobs (file generation, auto-assign). They cannot run concurrently, so one field is sufficient.
- **Status enum values:** `IDLE`, `QUEUED`, `WORKING`, `COMPLETED`, `FAILED`.
- **Sticky terminal:** `COMPLETED` / `FAILED` persist on the WO until the next job runs. The WO `status` is the at-a-glance indicator for "what's the worker doing right now."
- `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash` are already on the WO model (unreferenced) — wired during the template-sync flow in a later sweep.
- `unitPrice` on `FlooringWorkOrderItem` **stays in DB**; stripped from use cases, UI, **and the data-layer selects**.

### `FlooringWorkOrderFile` — new child table

History of every file-generation attempt for a WO. Replaces "single PDF column on WO" — the record view will render a grid of all generated files.

```prisma
model FlooringWorkOrderFile {
  id             String   @id @default(cuid())
  workOrderId    String
  workOrder      FlooringWorkOrder @relation(fields: [workOrderId], references: [id])
  fileNumber     Int      // per-WO ordinal: max(fileNumber) + 1 on create, never reused
  status         FlooringWorkOrderStatus
  fileKey        String?  // Railway bucket key, set on COMPLETED
  errorMessage   String?  // set on FAILED
  createdAt      DateTime @default(now())
  completedAt    DateTime?

  @@unique([workOrderId, fileNumber])
  @@index([workOrderId, createdAt])
}
```

- `fileNumber` is computed as `MAX(fileNumber) + 1` for the WO at insert time. Deletes leave gaps; numbers are **never reused** (avoids two PDFs ever sharing a number across the WO's lifetime).
- The `@@unique([workOrderId, fileNumber])` constraint catches concurrent-insert collisions — second insert fails and retries with the new max.
- A row is inserted at **`QUEUED`** time so failed runs still appear in the grid.

### Templates (`FlooringTemplate`)

**No schema changes this sweep.** Template file generation is dropped (see worker section). `unitPrice` strip on `FlooringTemplateItem` happens above the data layer in later sweeps; the column stays.

## File-generation worker

- One topic: `flooring.work-order.file-generation.requested`. Templates do not get a worker this sweep.
- Same dispatcher pattern as cut-log/import: outbox row → relay → BullMQ → worker processor.
- **File delivery: Railway bucket** (already deployed, currently unused). Worker writes the PDF, sets `fileKey` on the child row. Client downloads via signed URL. Direct-download was the alternative — rejected because it couples worker completion to an active client connection.
- Status transitions on the child row: insert at `QUEUED` → `WORKING` (on lock) → `COMPLETED` (`fileKey` + `completedAt`) or `FAILED` (`errorMessage`). WO `status` mirrors the child row's transitions so the WO list can color-code "running" rows.
- **PDF contents:** the WO main row + its material items + cut logs grouped per material item. (Cut logs already migrated; read-only here.)

## Application use cases (this sweep)

Two use cases land in `packages/application/src/flooring/work-orders/`.

### `createWorkOrderFile({ workOrderId })`

1. Compute `fileNumber = MAX(fileNumber) + 1` for the WO.
2. Insert `FlooringWorkOrderFile` row with `status = QUEUED`, `fileNumber` set.
3. Set WO `status = QUEUED`.
4. Write outbox event `flooring.work-order.file-generation.requested` carrying `{ workOrderId, fileId }`.
5. Relay → worker pipeline updates child row + WO `status` as it progresses through `WORKING` → `COMPLETED`/`FAILED`.

### `deleteWorkOrderFile({ fileId })`

**Synchronous, no worker.**
1. Delete the bucket object at `fileKey`.
2. Delete the child row.

(If bucket deletes prove flaky in production, this can later be promoted to a worker job. Skipping for now to keep the surface small.)

## Template-sync flow (target — UI sweep, not this branch)

AppShell top-right button (`apps/web/modules/template-sync/components/template-sync-button.tsx`, currently shell-only) opens a side panel:

1. Pick property.
2. Pick template (filtered by property).
3. Template fields appear below — editable **locally only** (does not save to the source template).
4. "Sync" creates a new `FlooringWorkOrder`, copies template items into `FlooringWorkOrderItem` (with `sourceTemplateItemId` set), persists `templateSyncedAt` + `templateSyncMode` + `templateSnapshotHash` on the new WO, and opens the WO record view.

`sourceTemplateItemId` already exists on `FlooringWorkOrderItem` — no schema change needed for that linkage.

## What this branch does NOT do

- No merging into `staging`. No pushing. No touching the staging branch. The other Claude instance handles that.
- No work outside the WO + Template modules (cut logs already migrated; imports owned elsewhere).
- No bulk fix of TS errors out-of-layer — errors heal in the layer that owns them.
- **No template file-generation worker.** Dropped — only WO file gen lands this sweep.
- **No auto-assign worker.** Out of scope; the WO `status` enum accommodates it for a future sweep.

## Deliverables in `a-branch/`

- `intent.md` — this file.
- `audit.md` — current state of WO + Template modules across all layers.
- Subsequent files: per-layer execution reports, named to identify the layer (e.g. `01-schema.md`, `02-domain.md`).
