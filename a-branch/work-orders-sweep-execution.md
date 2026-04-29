# Execution Log — Work Orders Sweep

Plan: [work-orders-sweep-plan.md](work-orders-sweep-plan.md) — locked.

| Sub-sweep | Status | Commit |
|---|---|---|
| 7a — Schema (WOMI status enum) | ✅ DONE | `67045274` |
| 7b — Domain (primary + MI subdir + cut-log payloads) | ✅ DONE | `1aaa6bab` |
| 7c — Domain (file-gen) | ✅ DONE | (pending git commit) |
| 7d — Data | ⏳ next | — |
| 7e — Application (primary) | pending | — |
| 7f — Application (MI + cut-logs) | pending | — |
| 7g — Application (file-gen) | pending | — |
| 7h — Worker/Relay | pending | — |
| 7i — API | pending | — |
| 7j — Engine off-ramp | pending | — |
| 7k — Module dir UI | pending | — |
| 7l — Dashboard pages | pending | — |

---

## 7a — Schema (DONE, committed `67045274`)

| Step | Result |
|---|---|
| Edit `schema.prisma` — add `FlooringWorkOrderItemStatus` enum (IDLE / SAVING_CUTS / FINALIZING / FAILED) after existing `FlooringWorkOrderStatus` | ✅ |
| Edit `FlooringWorkOrderItem` — add `status FlooringWorkOrderItemStatus @default(IDLE)` field | ✅ |
| Author migration `packages/db/prisma/migrations/20260429160000_add_work_order_item_status/migration.sql` (CreateEnum + ALTER TABLE ADD COLUMN with default) | ✅ |
| `npm run db:deploy` (= `npx prisma migrate deploy`) → Railway staging via .env | ✅ exit 0 — applied to `shortline.proxy.rlwy.net:22153` |
| `npm run db:generate` (= `npx prisma generate`) | ✅ exit 0 |
| `npx prisma migrate status` | ✅ exit 0 — "Database schema is up to date!" |
| `npm run build --workspace @builders/db` | ✅ exit 0 |

**Working tree changes (commit 7a):**
- `packages/db/prisma/schema.prisma` — enum + field added
- `packages/db/prisma/migrations/20260429160000_add_work_order_item_status/migration.sql` — new
- Generated dist artifacts under `packages/db/dist/` (per repo convention from `21aea69`)

**Open issues:** none.

---

---

## 7b — Domain primary + material-items + cut-log payloads (DONE, committed `1aaa6bab`)

| Step | Result |
|---|---|
| Rewrite `types.ts` — surface `status`, sync snapshots, joined property fields on detail; drop `propertyInstructions` (live-derived); WorkOrderForm excludes status | ✅ |
| Rewrite `normalizers.ts` — map joined property fields + sync snapshots | ✅ |
| Rewrite `form-rules.ts` — require propertyId AND warehouseId | ✅ |
| Update `error-messages.ts` — add warehouse-locked + cut-log-write-failed + file-gen-failed | ✅ |
| New `errors.ts` — `WorkOrderDomainError` class + 4 error codes | ✅ |
| New `lock-rules.ts` — `assertWorkOrderWarehouseChangeAllowed` throws `WORK_ORDER_WAREHOUSE_LOCKED` | ✅ |
| New `material-items/{types,rules,normalizers,diff-rules,status-rules,index}.ts` (6 files) | ✅ |
| New queue payload `save-work-order-item-pending-cut-log-diff.ts` (per-WOMI; cost+freight absent) | ✅ |
| New queue payload `finalize-work-order-cut-log-batch.ts` (WO-scoped batch) | ✅ |
| Update `index.ts` (WO + queue re-exports) | ✅ |
| `npm run typecheck --workspace @builders/domain` | ✅ exit 0 |
| `npm run build --workspace @builders/domain` | ✅ exit 0 |

**Expected DB layer errors remaining (deferred to 7d rewrite):** 4 errors in `packages/db/src/flooring/work-orders/{read-repository,write-repository}.ts` — selects don't include the new fields the rewritten normalizers require. Will be cleared by 7d.

**Open issues:** none.

---

## 7c — Domain file generation (DONE, awaiting commit)

| Step | Result |
|---|---|
| New `flooring/work-orders/file-generation/types.ts` — `WorkOrderFileGenerationInput` joined input shape (WO row + property + WOMIs + cut logs grouped per WOMI) + `WorkOrderFileMaterialItemProjection` + `WorkOrderFileCutLogProjection` | ✅ |
| New `flooring/work-orders/file-generation/build-work-order-pdf-html.ts` — pure projection from input → printable HTML; no I/O; inline-styled so the rendered PDF doesn't depend on external CSS; every dynamic value escapes via `escapeHtml` | ✅ |
| New `flooring/work-orders/file-generation/index.ts` — re-exports | ✅ |
| New queue payload `queue/generate-work-order-file.ts` — topic `flooring.work-order.file-generation.requested`; payload `{ version, topic, workOrderId, fileId, requestedBy, requestedAt }`; mirrors `void-cut-log.ts` shape | ✅ |
| Update `flooring/work-orders/index.ts` — re-export `file-generation/` | ✅ |
| Update `domain/src/index.ts` — re-export `queue/generate-work-order-file.js` | ✅ |
| `npm run typecheck --workspace @builders/domain` | ✅ exit 0 |
| `npm run build --workspace @builders/domain` | ✅ exit 0 |

**Design notes:**

- `WorkOrderFileGenerationInput` carries `customAddress`, joined `property.streetAddress/city/state/postalCode`, joined `property.instructions`. Builder uses `customAddress` if present, else falls back to formatted property address.
- HTML body emits sections only when content exists (instructions, description, notes, cut-log sub-tables) so empty PDFs stay tight.
- Cut log row uses CSS class per status (`cut-log-pending` / `cut-log-final` / `cut-log-void`) — voids render struck-through and grey.
- Per locked decision #4: PDF is the snapshot. No JSONB or snapshot tables. Worker reads live joined data at render time via `getWorkOrderForFileGeneration` (to be authored in 7d).

**Open issues:** none.

---

## Notes

- Per CLAUDE.md: schema lands alone in its own commit; subsequent sub-sweeps may bundle related changes per layer.
- Plan + this execution file live at `a-branch/` per project convention.
- 7b's gate per the plan was domain typecheck only (data + application + web are deferred to their own sub-sweeps); the 4 DB errors above are the expected leftover surface.
