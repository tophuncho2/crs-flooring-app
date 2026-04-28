# Branch Intent — `schema/work-orders-material-items`

## Scope

Two modules: **Work Orders** (`FlooringWorkOrder` + `FlooringWorkOrderItem`) and **Templates** (`FlooringTemplate` + `FlooringTemplateItem`). Cut logs are touched only as a downstream relation — they are already migrated.

This branch is **schema-first**. Prisma is updated before any layer above it. The ~50 outstanding TS errors are not fixed up-front; they heal as each subsequent layer is brought in line with the new schema.

## Layer order (strict)

1. **Schema (Prisma)** — add status enums + columns; do not delete `unitPrice` columns.
2. **Domain** — pure types, normalizers, form rules, error messages updated for status + sync.
3. **Data** — selects, read/write repositories, outbox repository helpers for the two new topics.
4. *(pause for a pass-through review before application starts)*
5. **Application** — use cases, including a brand-new `application/src/flooring/work-orders` (currently missing).
6. **Relay outbox + Worker handlers** — file-generation dispatchers + processors for both modules; queues wired in `apps/worker/src/queues` + `apps/relay/src/dispatch`.
7. **API** — sectional routes under `apps/web/app/api/work-orders/...` (currently missing entirely) and updates to `apps/web/app/api/templates/...`.
8. **Module dirs (`apps/web/modules/...`)** — UI components, controllers, hooks, transport, query policies. Conform to `apps/web/modules/CLAUDE.md` shape (components/list, components/record/{section}, controllers/, data/queries.ts + data/mutations.ts).

API and module-dir order may swap during step 7–8; dashboard SSR loaders pull from `modules/{module}/data/queries.ts`, so the modules dir is the import surface.

## Schema changes (this sweep)

### Work orders (`FlooringWorkOrder`)
- Add `status` enum column (new `FlooringWorkOrderStatus`).
- Status drives the worker. Two future jobs:
  - **(In scope, primary)** File generation — PDF of the WO row, its material items, and cut logs grouped per material item.
  - **(Out of scope, may seed status now)** Cut-log assignment to material items. Cuts are assigned **manually** from the WO record-view material-items section. The status field can already cover this even though the worker for it isn't built here.
- Status enum values (minimum): `QUEUED`, `WORKING`. Likely also `IDLE`/`READY` (default) and a terminal value (`COMPLETED` or `FAILED`) — final shape decided in audit follow-up.
- `unitPrice` on `FlooringWorkOrderItem` **stays in DB**; stripped from use cases + UI.
- `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash` are already on the WO model (currently unreferenced anywhere in code) — wired during the template-sync flow.

### Templates (`FlooringTemplate`)
- Add `status` enum column (new `FlooringTemplateStatus`, same shape as WO).
- Status drives the **template file generation** worker (PDF preview of the template).
- `unitPrice` on `FlooringTemplateItem` stays in DB; stripped from use cases + UI.

## File-generation worker

- Two topics, one per module: e.g. `flooring.work-order.file-generation.requested` and `flooring.template.file-generation.requested`.
- Same dispatcher pattern as cut-log/import: outbox row → relay → BullMQ → worker processor.
- Status transitions: default → `QUEUED` (on enqueue) → `WORKING` (on lock) → terminal.
- **Open question — file delivery:** two viable options:
  1. **Direct download** — worker generates the PDF, returns it as a stream/blob to the user device (no bucket).
  2. **Bucket** — write to the existing Railway-deployed bucket, return a signed URL.
  
  Bucket is more durable (lets the file be re-fetched after page reload, audited, retried), and the bucket already exists. Direct download is simpler but couples worker completion to an active client connection, which doesn't match the queued-job pattern. Recommendation: **bucket**, given it's already deployed. Confirm before schema lands so the WO/template rows can carry a `generatedFileUrl` / `generatedFileKey` column from the start.

## Template-sync flow (target)

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

## Deliverables in `a-branch/`

- `intent.md` — this file.
- `audit.md` — current state of WO + Template modules across all layers, including TS error baseline (or note on why baseline could not be captured).
- Subsequent files: per-layer execution reports, named to identify the layer (e.g. `01-schema.md`, `02-domain.md`).
