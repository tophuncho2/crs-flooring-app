# Branch Intent — `schema/work-orders-material-items`

## Scope

Two modules: **Work Orders** (`FlooringWorkOrder` + `FlooringWorkOrderItem`) and **Templates** (`FlooringTemplate` + `FlooringTemplateItem`). Cut logs are touched only as a downstream relation — they are already migrated.

This branch is **schema-first**. Prisma is updated before any layer above it. The ~50 outstanding TS errors are not fixed up-front; they heal as each subsequent layer is brought in line with the new schema.

## Layer order (strict)

1. **Schema (Prisma)** — landed on staging (not this branch). Branch A merges staging in to pick up the schema baseline before starting layer 2.
2. **Domain** — pure business logic only. Types, predicates, normalizers, form rules, error messages, Zod payload schemas, message/HTML builders. No SDK imports, no `@builders/*` imports.
3. **Data** — read/write repositories, transaction wrappers, outbox helpers. May import `@builders/domain` for pure helpers (formatters/computations only — no rules that throw).
4. *(pause for a pass-through review before application starts)*
5. **Application** — use case orchestration. Each use case is the unit of "do X end-to-end." May import `@builders/domain`, `@builders/db`, `@builders/lib`, `@builders/pdf`. No HTTP, no BullMQ.
6. **Relay outbox + Worker handlers** — file-generation dispatcher (`apps/relay/src/dispatch/`) + processor (`apps/worker/src/processors/`). Worker handler is a thin shim: parse payload via domain Zod schema, call consumer use case, classify errors. Same shape as `void-cut-log.ts`.
7. **API** — sectional routes under `apps/web/app/api/work-orders/...` (currently missing entirely) and updates to `apps/web/app/api/templates/...`. Route parses request, calls a use case, returns response. No business logic.
8. **Module dirs (`apps/web/modules/...`)** — UI components, controllers, hooks, transport, query policies. Conform to `apps/web/modules/CLAUDE.md` shape.

API and module-dir order may swap during step 7–8; dashboard SSR loaders pull from `modules/{module}/data/queries.ts`, so the modules dir is the import surface.

## Layer responsibilities (locked)

| Layer | Owns | Imports |
|---|---|---|
| Domain | Types, predicates, normalizers, form rules, message + HTML builders, Zod payload schemas | Pure TS + Zod. No `@builders/*`. |
| Data | Read/write repositories, outbox repository, transaction wrappers | `@builders/domain` (pure helper carve-out), Prisma |
| Application | Use case orchestration (producer + consumer + sync use cases) | `@builders/domain`, `@builders/db`, `@builders/lib`, `@builders/pdf` |
| API (`apps/web`) | HTTP boundary — parse, auth, call use case, return response | Anything; no use case logic |
| Worker (`apps/worker`) | BullMQ payload parse + call consumer use case + classify errors | Anything; thin shim only |
| Relay (`apps/relay`) | Outbox poll → BullMQ dispatch by topic | Anything; no business logic |

**External-system access lives in `@builders/lib` and `@builders/pdf`:**
- `@builders/lib/storage.ts` (already exists) — `uploadBucketObject`, `getBucketObject`, `bucketObjectExists`, `createBucketObjectPresignedUrl`. S3-compatible (`forcePathStyle: true`) for Railway-style buckets. Caller passes a `StorageEnvironment` snapshot; no implicit globals.
- `@builders/pdf` (new this sweep) — `renderHtmlToPdf(html, options) → Uint8Array`. Thin puppeteer wrapper. Browser launch flags include `--no-sandbox` for Railway containers.

Use cases call these directly (no DI). Both packages stay dumb on purpose — their CLAUDE.md files forbid business logic.

## Schema changes — landed on staging

Already applied via migration `20260428205306_work_order_status_and_files`.

### `FlooringWorkOrder`

- New column `status FlooringWorkOrderStatus @default(IDLE)`.
- Single shared status field covers both worker jobs (file generation in scope, auto-assign deferred). Jobs cannot run concurrently, so one field is sufficient.
- **Status enum values:** `IDLE`, `QUEUED`, `WORKING`, `COMPLETED`, `FAILED`.
- **Sticky terminal:** `COMPLETED` / `FAILED` persist on the WO until the next job runs.
- New `files FlooringWorkOrderFile[]` relation. `@@index([status])` added.
- `templateSyncedAt`, `templateSyncMode`, `templateSnapshotHash` were already on the model (unreferenced) — wired during the template-sync UI flow in a later sweep.
- `unitPrice` on `FlooringWorkOrderItem` stays in DB; stripped from use cases, UI, and data-layer selects in later layers.

### `FlooringWorkOrderFile` (new)

```prisma
model FlooringWorkOrderFile {
  id           String                  @id @default(uuid())
  workOrderId  String
  workOrder    FlooringWorkOrder       @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  fileNumber   Int
  status       FlooringWorkOrderStatus @default(QUEUED)
  fileKey      String?
  errorMessage String?
  createdAt    DateTime                @default(now())
  completedAt  DateTime?

  @@unique([workOrderId, fileNumber])
  @@index([workOrderId, createdAt])
  @@map("flooring_work_order_file")
}
```

- `fileNumber` = `MAX(fileNumber) + 1` per WO at insert time. Never reused; deletes leave gaps.
- Unique constraint catches concurrent-insert collisions; second insert fails and retries.
- Row is inserted at `QUEUED` time so failed runs still appear in the grid.

### Templates

**No schema changes this sweep.** Template file gen dropped. `unitPrice` strip on `FlooringTemplateItem` happens above data layer later; column stays.

## File-generation pipeline

```
API POST /api/work-orders/[id]/files
  → requestWorkOrderFileUseCase (producer)
  → outbox event: flooring.work-order.file-generation.requested
  → relay polls topic, dispatches to BullMQ
  → worker processor: parse payload, call generateWorkOrderFileUseCase (consumer)
  → consumer: read data, build HTML, render PDF, upload to bucket, mark COMPLETED
```

- Single topic: `flooring.work-order.file-generation.requested`. Topic constant + Zod schema live in `@builders/domain`.
- File delivery: Railway bucket via `@builders/lib`. Direct-download rejected — couples worker completion to an active client connection.
- PDF contents: WO main row + material items + cut logs grouped per material item.

## Application use cases (this sweep)

All three live in `packages/application/src/flooring/work-orders/`. Naming + shape mirrors cut-log (`mark-cut-log-for-void.ts` / `void-cut-log.ts`).

### `requestWorkOrderFileUseCase` (producer, called by API POST)

In a single transaction:
1. Compute `fileNumber = MAX(fileNumber) + 1` for the WO.
2. Insert `FlooringWorkOrderFile` row with `status = QUEUED`, `fileNumber` set.
3. Set WO `status = QUEUED`.
4. Write outbox event `flooring.work-order.file-generation.requested` carrying `{ workOrderId, fileId }` via `createQueueOutboxEvent`.

Idempotency key: `work-order-file-gen:${workOrderId}:${fileId}`.

### `generateWorkOrderFileUseCase` (consumer, called by worker processor)

Not wrapped in a single transaction (bucket upload doesn't roll back). Uses short transactions for state transitions:
1. **TX1**: lock the file row, mark `WORKING`, mark WO `WORKING`.
2. Read full WO data (`getWorkOrderForFileGeneration` — joins WO + items + cut logs).
3. Build HTML via domain helper `buildWorkOrderPdfHtml(data)`.
4. Render PDF via `@builders/pdf`'s `renderHtmlToPdf(html)`.
5. Upload PDF via `@builders/lib`'s `uploadBucketObject` → returns the bucket URL; we persist the key.
6. **TX2**: write `fileKey` + `completedAt` to file row, mark `COMPLETED`, mark WO `COMPLETED`.
7. On any error: **TX-fail**: write `errorMessage` to file row, mark `FAILED`, mark WO `FAILED`. Throw `WorkOrderFileGenerationError` → handler classifies as recoverable / `UnrecoverableError`.

### `deleteWorkOrderFileUseCase` (sync, called by API DELETE)

Synchronous, no worker:
1. Read file row (need `fileKey`); 404 if missing.
2. Delete bucket object via `@builders/lib`'s storage.
3. Delete file row.

(If bucket deletes prove flaky, this can later become a worker job. Skipping for now.)

## Worker bootstrap deltas (this sweep)

- New BullMQ queue: `flooring-work-order-file-generation`.
- New dispatcher: `apps/relay/src/dispatch/build-work-order-file-generation-dispatcher.ts`.
- New processor: `apps/worker/src/processors/work-order-file-generation.ts` (mirrors `void-cut-log.ts` shape — parse payload, call use case, classify errors).
- Worker service env on Railway needs bucket credentials (currently only set on apps service): `BUCKET_ACCESS_KEY_ID`, `BUCKET_SECRET_ACCESS_KEY`, `BUCKET_NAME`, `BUCKET_ENDPOINT_URL`, `BUCKET_REGION` (or whatever the existing apps env names are — match exactly).

## Template-sync flow (target — UI sweep, not this branch)

AppShell top-right button (`apps/web/modules/template-sync/components/template-sync-button.tsx`, currently shell-only) opens a side panel:

1. Pick property.
2. Pick template (filtered by property).
3. Template fields appear below — editable **locally only** (does not save to the source template).
4. "Sync" creates a new `FlooringWorkOrder`, copies template items into `FlooringWorkOrderItem` (with `sourceTemplateItemId` set), persists `templateSyncedAt` + `templateSyncMode` + `templateSnapshotHash` on the new WO, and opens the WO record view.

`sourceTemplateItemId` already exists on `FlooringWorkOrderItem` — no schema change needed for that linkage.

## What this branch does NOT do

- No merging into `staging`. No pushing. No touching the staging branch. The staging Claude handles schema + merging.
- No work outside the WO + Template modules (cut logs already migrated; imports owned elsewhere).
- No bulk fix of TS errors out-of-layer — errors heal in the layer that owns them.
- **No template file-generation worker.** Dropped — only WO file gen lands this sweep.
- **No auto-assign worker.** Out of scope; the WO `status` enum accommodates it for a future sweep.
- **No schema work.** Layer 1 is done; if a missed schema delta surfaces during domain/data work, surface it back to the staging Claude — do not edit `packages/db/prisma/schema.prisma` from this branch.

## Deliverables in `a-branch/`

- `intent.md` — this file.
- `audit.md` — current state of WO + Template modules across all layers.
- Subsequent files: per-layer execution reports, named to identify the layer (e.g. `02-domain.md`, `03-data.md`).
