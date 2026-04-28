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
- ~~`unitPrice` on `FlooringWorkOrderItem` stays in DB; stripped from use cases, UI, and data-layer selects in later layers.~~ Superseded — see "Pricing cleanup + send-unit snapshots" below.

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

Template file gen dropped from this sweep. See "Pricing cleanup + send-unit snapshots" below for the schema deltas that did land on `FlooringTemplateItem`.

## Pricing cleanup + send-unit snapshots — landed on staging

Applied via migration `20260428220000_drop_item_pricing_analytics_add_send_unit_snapshots`. Execution report: `a-branch/02-schema-pricing-cleanup-execution.md`.

### `FlooringTemplateItem`
- DROP `unitPrice`.
- ADD `sendUnitName String?`, `sendUnitAbbrev String?` (snapshot fields, mirror `FlooringInventory`).

### `FlooringWorkOrderItem`
- DROP `unitPrice`, `assignedQuantity`, `assignedCost`.
- ADD `sendUnitName String?`, `sendUnitAbbrev String?` (snapshot fields).

### `FlooringAnalytics`
- DROPPED — model + table + FK gone. No code references existed. Aggregates, if needed, will be derived on read in a later sweep.

### Send-unit snapshot population

`sendUnitName` / `sendUnitAbbrev` are **populated on each row when a product is saved** to the item table (template-item or work-order-item write). The values are read from the chosen `FlooringProduct` → category → send-unit chain at write time and snapshot onto the row, exactly the same pattern `FlooringInventory` uses today. Read paths consume the snapshot directly; they do not re-resolve the product on every read. Columns are nullable to permit pre-existing rows and edge cases where a product has no send unit configured.

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

## Domain layer — locked rules for this sweep

Audit: `a-branch/03-domain-audit.md`. Layer 2 of the sweep. The domain
layer's job here is to (a) absorb the schema deltas (drop pricing, surface
status + send-unit snapshots), (b) carve out a `material-items/` subdir under
work-orders mirroring templates, and (c) own every business rule the
application use cases will call.

### Module boundaries

```
packages/domain/src/
├── management/
│   ├── properties/
│   │   └── instructions-autofill.ts        ← NEW (shared by templates + WO)
│   └── templates/
│       ├── (existing files — pricing stripped, send-unit added)
│       └── material-items/
│           └── diff-rules.ts                ← promoted to a real diff validator
└── flooring/
    └── work-orders/
        ├── (existing files — status + warehouse-required + sync snapshots added)
        ├── lock-rules.ts                    ← NEW
        ├── inventory-eligibility.ts         ← NEW
        ├── material-items/                  ← NEW (mirrors templates/material-items)
        │   ├── index.ts
        │   ├── types.ts
        │   ├── rules.ts
        │   ├── normalizers.ts
        │   └── diff-rules.ts
        └── file-generation/                 ← NEW
            ├── types.ts
            └── build-work-order-pdf-html.ts
```

Plus one new outbox payload schema in `queue/`:

```
queue/generate-work-order-file.ts            ← NEW (topic + Zod payload)
```

### Required fields (locked)

- **Templates** keep `propertyId` + `unitType` (no change — `unitType` is `String NOT NULL` in schema).
- **Work orders** require `propertyId` + `warehouseId` only. Vacancy / job-type / management-company / template / unit-number / scheduled-for stay optional.
- **Template material items** require `productId` + `quantity > 0`. Notes optional.
- **Work-order material items** require `productId` + `quantity > 0`. Notes optional. `sourceTemplateItemId` is nullable and never user-edited.

### Status (work orders only)

`FlooringWorkOrderStatus = "IDLE" | "QUEUED" | "WORKING" | "COMPLETED" | "FAILED"` — exact mirror of the Prisma enum, defined as a string-literal union per the cut-logs precedent (no DB import). Surfaced on `WorkOrderListRow` + `WorkOrderDetail`. **Not** on `WorkOrderForm` — worker-controlled, never user-set. No status field on templates this sweep.

### Send-unit snapshots

Schema now has `sendUnitName?` + `sendUnitAbbrev?` on both `FlooringTemplateItem` and `FlooringWorkOrderItem`. Domain rules:

- Stamped on every item write (create + update) via `buildSendUnitSnapshotFromProduct(product) → { sendUnitName, sendUnitAbbrev }` — pure projection from the product's category.
- Read shape (`TemplateMaterialItemRow` / `WorkOrderMaterialItemRow`) carries them as `string` (defaulted to `""`).
- Read in the UI as the unit label adjacent to `quantity` — no row-level computation.
- Mirrors the existing `FlooringInventory` snapshot pattern; data layer never re-resolves the product on read.

### Lock rules (work orders)

Two predicates in `lock-rules.ts`:

1. **Warehouse change blocked when cut logs exist.** Application primary-section save use case calls `assertWorkOrderWarehouseChangeAllowed({ currentWarehouseId, nextWarehouseId, hasLinkedCutLogs })`. If `currentWarehouseId !== nextWarehouseId && hasLinkedCutLogs`, throw with the warehouse-locked message. The data layer hands `hasLinkedCutLogs` after a `COUNT(*)` over `FlooringCutLog WHERE workOrderId = ? AND void = false`.
2. **Delete blocked when cut logs exist.** `assertWorkOrderDeleteAllowed({ hasLinkedCutLogs })` — throws if any non-void cut log links the WO.

Note: a WO's warehouse can flip freely **before** any cut log is created. Once the first cut log is saved, the warehouse field becomes effectively immutable. Surface this in UI copy via the message constants in `error-messages.ts`.

### Property-instructions autofill

Single shared helper in `management/properties/instructions-autofill.ts`:

```ts
applyPropertyInstructionsAutofill<T extends { propertyInstructions: string }>(
  form: T,
  property: { instructions: string | null },
): T
```

- Called by both the template primary-section save use case and the WO primary-section save use case.
- Overwrites `form.propertyInstructions` with `property.instructions ?? ""` whenever the property is being **linked or relinked** (the application use case decides when by comparing prior `propertyId` to the patch's `propertyId`).
- Free-text edits to `propertyInstructions` while the property is unchanged are NOT overwritten — the application use case skips the helper on a same-property save.
- Template-sync use case calls the same helper after copying the template into the WO (the autofill happens once, against the WO's chosen property).

### Material items — diff-save (both modules)

Both `templates/material-items/diff-rules.ts` and `work-orders/material-items/diff-rules.ts` expose:

- `Draft` / `Update` / `Delete` / `Diff` types (mirror existing template shapes).
- `*_USER_EDITABLE_FIELDS` const (e.g. `["productId", "quantity", "notes"]`).
- `validate*MaterialItemsDiff(diff, resolution, parent?)` — pure validator returning typed issues; mirrors `validateCutLogsDiff`.
  - Optimistic-lock per-row via `expectedUpdatedAt`.
  - Per-row form validation (rejects unknown patch keys via the editable-fields list).
  - **WO-side cross-row check:** if a row would be deleted but it still has linked cut logs, the diff fails — same lock principle as the WO-level delete rule, but per-line.

The application save use cases shrink to: read existing rows under tx → call the diff validator → apply the writes via the data layer's bulk write repo → stamp send-unit snapshots on creates/updates.

### Cut-log edits from the WO record view (separate from material-items diff)

Per intent: the material-items section uses diff-save; the expandable cut-logs row uses **separate use cases** that mirror what the inventory record view already has.

Locked decisions for this sweep:

- The WO record view's cut-log section reuses the existing cut-log domain — `validateCutLogsDiff`, `validateCutLogFinalizeBatch`, `buildVoidedCutLogPatch`, `assertCutLogLinkageSymmetry`, all editability predicates. **No new cut-log rules needed.**
- The cut-log link-edit use case (`updateLinks`) is **dropped from the inventory side** per the user's directive — the WO MI section is the only writer of `workOrderId` + `workOrderItemId` going forward. Whenever a cut log is saved against a WOMI from the WO record view, the application use case sets BOTH link fields atomically (symmetry already enforced by `assertCutLogLinkageSymmetry`).
- The cut-log diff payload (`pending-save-cut-log-batch.ts`) is **per inventory**. The WO-MI save fans out one outbox event per inventory row touched in the diff — no new payload schema, no new worker. (Open Q4 in the audit; locked here.)
- Finalize + void from the WO record view also reuse the existing per-inventory workers. Same fan-out for finalize batches.

### Inventory eligibility for the WO-MI cut-log picker

`isInventoryEligibleForWorkOrderItem(inventory, workOrder, workOrderItem) → boolean` — true iff:

- `inventory.warehouseId === workOrder.warehouseId`
- `inventory.productId === workOrderItem.productId`
- `Number(inventory.startingStock) - Number(inventory.totalCutSum) > 0`

Drives the "pick inventory" link in the expandable cut-logs row. Pure predicate; data layer pre-filters via the same conditions for the option list query.

### File-generation HTML builder

Lives at `flooring/work-orders/file-generation/build-work-order-pdf-html.ts`. Pure projection from a `WorkOrderFileGenerationInput` shape (defined alongside) — joined WO + items + cut logs grouped per WOMI. The data layer's `getWorkOrderForFileGeneration` returns this exact shape; the consumer use case (`generateWorkOrderFileUseCase`) calls the builder, then `@builders/pdf` renders HTML→PDF, then `@builders/lib` uploads.

The builder owns layout, ordering, and any human formatting. No decimal math (the read shape already has formatted strings).

### Outbox payload — `queue/generate-work-order-file.ts`

```ts
GENERATE_WORK_ORDER_FILE_TOPIC = "flooring.work-order.file-generation.requested"
GENERATE_WORK_ORDER_FILE_QUEUE = "flooring-work-order-file-generation"
GENERATE_WORK_ORDER_FILE_JOB_NAME = "generate-file"

GenerateWorkOrderFilePayloadSchema = z.object({
  version: z.literal("v1"),
  topic: z.literal(GENERATE_WORK_ORDER_FILE_TOPIC),
  workOrderId: z.string().uuid(),
  fileId: z.string().uuid(),
  requestedBy: z.object({ userId: z.string().uuid(), userEmail: z.string().email() }),
  requestedAt: z.string().datetime(),
})
```

Producer use case writes this; worker parses via `parseGenerateWorkOrderFilePayload`. Mirrors `void-cut-log.ts` shape exactly. Re-exported from the domain root barrel (`packages/domain/src/index.ts`).

### Out of scope at the domain layer

- `shared/line-totals.ts` (still references `unitPrice`) — only consumed by `record-summary.ts` / `record-expense-summary.ts`, neither of which is wired into templates/WO. Cleanup belongs to the sweep that owns those summary builders.
- `templateSyncedAt` / `templateSyncMode` / `templateSnapshotHash` business meaning — surfaced as read-only snapshots on `WorkOrderDetail` this sweep; the sync **flow** that writes them (with hash computation, mode semantics) belongs to the template-sync UI sweep, not domain.
- Status field on templates — file gen is dropped from templates this sweep, so no template status enum.
- Auto-assign worker — out of scope; WO `status` enum already accommodates it for a future sweep.

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
