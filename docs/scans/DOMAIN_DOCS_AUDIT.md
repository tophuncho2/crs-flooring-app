# Domain Docs + layers/PATTERN.md Audit

> **Status:** Doc edits applied (C1, C2, C3, M1–M5, L1–L2). Outstanding items are warehouse sweep tasks tracked in `docs/module-anatomy/multi-section/warehouse/sweep-plan/VIOLATIONS.md`. This audit remains active until the warehouse sweep completes and Section 1 gap rows flip.

Read-only scan. Every claim cites a file path + line.

**Reference-module scope (swept or mid-sweep):**
- `packages/domain/src/admin/`
- `packages/domain/src/shared/`
- `packages/domain/src/queue/`
- `packages/domain/src/flooring/services/`
- `packages/domain/src/flooring/manufacturers/`
- `packages/domain/src/flooring/contacts/`
- `packages/domain/src/flooring/warehouses/` (mid-sweep, first multi-section)

**Absent from domain entirely** (listed in scope but have no directory under `packages/domain/src/flooring/`):
- `categories` and `unit-of-measures` — exist as web modules (`apps/web/modules/categories/`, `apps/web/modules/unit-of-measures/`) but ship no domain code. Both modules consume only `formatStableDateTime` from `@builders/domain/shared/date-format.ts` (`apps/web/modules/unit-of-measures/components/list/unit-of-measures-table.tsx:10`). Noted, not audited further.

**Out of scope** (ignored as evidence): `work-orders`, `products`, `templates`, `properties`, `inventory`, `imports`, `management-companies`, `cut-logs`, `property-management`.

---

## Section 1 — Domain block in `layers/PATTERN.md`

### Imports

| Claim | Verdict | Evidence |
|---|---|---|
| `zod` (queue message schemas only) | ACCURATE | Only `zod` import in domain: `packages/domain/src/queue/auto-allocate-work-order.ts:1`. No `zod` import elsewhere in reference modules. |
| Relative paths within `packages/domain/src/` | ACCURATE | All inter-domain imports are relative `./` or `../` paths. No cross-package imports found. |

### Exports to `packages/application/`

Claim: predicates, message builders, normalizers, `validateDiff` + `DiffValidationIssue[]`, `assignDiffIds`, queue schemas, shared utilities.

| Shape | Verdict | Evidence |
|---|---|---|
| Predicates | ACCURATE | `packages/application/src/flooring/services/delete-service.ts:1` imports `isServiceDeleteBlocked`; `packages/application/src/admin/update-managed-user.ts` imports `canChangeUserRole`, `canDeleteUser`. |
| Message builders | ACCURATE | Same files import `getServiceDeleteBlockedMessage`, `getRoleChangeBlockedMessage`. |
| Normalizers | ACCURATE | `packages/application/src/flooring/manufacturers/create-manufacturer.ts:1` imports `normalizeManufacturerCompanyNameForUniqueness`. |
| `validateDiff` + `DiffValidationIssue[]` | ACCURATE | `packages/application/src/flooring/warehouses/save-sections-with-locations.ts:12-14,44` imports and calls `validateDiff`. |
| `assignDiffIds` | ACCURATE | Same file lines 12, 62, 63 — two `assignDiffIds(…, randomUUID)` call sites. |
| Queue schemas | ACCURATE | Worker imports `WORK_ORDER_AUTO_ALLOCATION_QUEUE` etc.; application consumes via the same domain module. |
| Shared utilities | ACCURATE | `packages/domain/src/flooring/work-orders/allocations.ts:3` is a domain-internal consumer; application layer consumes transitively via domain-internal use, plus direct imports through `@builders/domain` entry point. |

### Exports to `apps/web/modules/` (controllers and UI)

Claim: `EMPTY_*_FORM` / `to*Form` converters (`EMPTY_SERVICE_FORM`/`toServiceForm`, `EMPTY_CONTACT_FORM`/`toContactForm`, `EMPTY_MANUFACTURER_FORM`/`toManufacturerForm`, `EMPTY_WAREHOUSE_FORM`/`EMPTY_LOCATION_FORM`/`toWarehouseForm`/`toLocationForm`), plus shared utilities for display.

| Symbol | Verdict | Evidence |
|---|---|---|
| `EMPTY_SERVICE_FORM` | ACCURATE | Export: `packages/domain/src/flooring/services/types.ts:25`. Consumer: `apps/web/modules/services/components/record/service-create-client.tsx:11`. |
| `toServiceForm` | ACCURATE | Export: `packages/domain/src/flooring/services/types.ts:39`. Consumer imports it via barrel re-export from `@builders/domain` in `apps/web/modules/services/controller/use-service-primary-section.ts:14`. |
| `EMPTY_CONTACT_FORM` | ACCURATE | Export: `packages/domain/src/flooring/contacts/types.ts:28`. Consumer: `apps/web/modules/contacts/components/record/contact-create-client.tsx:11`. |
| `toContactForm` | ACCURATE | Export: `packages/domain/src/flooring/contacts/types.ts:44`. Consumer: `apps/web/modules/contacts/controller/use-contact-primary-section.ts:14` (via barrel). |
| `EMPTY_MANUFACTURER_FORM` | ACCURATE | Export: `packages/domain/src/flooring/manufacturers/types.ts:21`. Consumer: barrel import in `apps/web/modules/manufacturers/controller/use-manufacturer-primary-section.ts:5`. |
| `toManufacturerForm` | ACCURATE | Export: `packages/domain/src/flooring/manufacturers/types.ts:29`. Consumer: `apps/web/modules/manufacturers/controller/use-manufacturer-primary-section.ts:5`. |
| `EMPTY_WAREHOUSE_FORM` | **INACCURATE (mid-sweep gap)** | Export exists at `packages/domain/src/flooring/warehouses/types.ts:52`. **Zero consumers** in `apps/web/modules/warehouse/` — `grep -rn "@builders/domain" apps/web/modules/warehouse` returns nothing. `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:16` defines its own `EMPTY_WAREHOUSE_DETAIL`. See Section 8 for sweep task. |
| `EMPTY_LOCATION_FORM` | **INACCURATE (mid-sweep gap)** | Export at `packages/domain/src/flooring/warehouses/types.ts:58`. No consumer in web. |
| `toWarehouseForm` | **INACCURATE (mid-sweep gap)** | Export at `packages/domain/src/flooring/warehouses/types.ts:64`. No consumer in web. |
| `toLocationForm` | **INACCURATE (mid-sweep gap)** | Export at `packages/domain/src/flooring/warehouses/types.ts:72`. No consumer in web. |
| `formatCurrencyValue` | ACCURATE | Export: `packages/domain/src/shared/line-totals.ts:19`. Consumer: `apps/web/modules/shared/engines/record-view/sections/metrics/record-line-summary.tsx:3`. |
| `sumLineTotals` | ACCURATE | Export: `packages/domain/src/shared/line-totals.ts:23`. Consumer: same file as above. |
| `calculateRecordSalesRepExpense` | ACCURATE | Export: `packages/domain/src/shared/record-expense-summary.ts:22`. Consumer: `apps/web/modules/shared/engines/record-view/contracts/record-sales-reps.ts:1`. |
| `normalizeTableFilterValues` | ACCURATE | Export: `packages/domain/src/shared/table-preferences.ts:47`. Consumer: `apps/web/modules/shared/engines/list-view/controllers/table-filter-state.ts:1,55`. |

### Exports to `apps/worker/`

Claim: queue message schemas for job validation, plus any predicates/rules the use cases depend on.

| Symbol | Verdict | Evidence |
|---|---|---|
| `WORK_ORDER_AUTO_ALLOCATION_QUEUE` | ACCURATE | Import: `apps/worker/src/bootstrap.ts:3`. |
| `parseAutoAllocateWorkOrderJob` | ACCURATE | Import: `apps/worker/src/bootstrap.ts:4`. |
| `isWorkflowProcessingError` | ACCURATE | Import: `apps/worker/src/bootstrap.ts:5`. This confirms the "plus any predicates/rules" caveat. |
| `AutoAllocateWorkOrderJobV1` | ACCURATE | Import: `apps/worker/src/bootstrap.ts:6`, `apps/worker/src/application/process-work-order-auto-allocation.ts:5`. |

---

## Section 2 — `docs/layers/domain/PATTERN.md`

### Pattern shapes (≥1 reference-module example each)

| Shape | Reference example | Evidence |
|---|---|---|
| Predicate | `canCreateUser(actorRole)` | `packages/domain/src/admin/governance-rules.ts:30` |
| Predicate (alt) | `isServiceDeleteBlocked(state)` | `packages/domain/src/flooring/services/delete-rules.ts:6` |
| Message builder | `buildWarehouseDeleteBlockedMessage(counts)` | `packages/domain/src/flooring/warehouses/warehouse-rules.ts:19` |
| Message builder (alt) | `getServiceDeleteBlockedMessage(state)` | `packages/domain/src/flooring/services/delete-rules.ts:10` |
| Normalizer | `normalizeWarehouseName(name)` | `packages/domain/src/flooring/warehouses/warehouse-rules.ts:7` |
| Normalizer (alt) | `normalizeManufacturerCompanyNameForUniqueness(value)` | `packages/domain/src/flooring/manufacturers/manufacturer-rules.ts:1` |
| Diff validator | `validateDiff(diff, existing)` | `packages/domain/src/flooring/warehouses/diff-rules.ts:190` |
| Diff validator type | `DiffValidationIssue` | `packages/domain/src/flooring/warehouses/diff-rules.ts:50` |
| Identity helper | `assignDiffIds(entries, generateId)` | `packages/domain/src/flooring/warehouses/diff-identity.ts:11` |
| Queue schema | `WORK_ORDER_AUTO_ALLOCATION_QUEUE`, retry policy, Zod payload schema | `packages/domain/src/queue/auto-allocate-work-order.ts:3-18` |
| Types | `GovernableRole`, `GovernanceActor` | `packages/domain/src/admin/types.ts:2,5` |
| Types (form) | `ServiceForm`, `EMPTY_SERVICE_FORM` | `packages/domain/src/flooring/services/types.ts:18,25` |
| Utilities | `formatCurrencyValue`, `sumLineTotals` | `packages/domain/src/shared/line-totals.ts:19,23` |

All shapes verified.

### "Domain does not throw"

- **Zero `throw` statements** in any reference-module file (grep result: no matches across `admin`, `shared`, `queue`, `flooring/services`, `flooring/manufacturers`, `flooring/contacts`, `flooring/warehouses`).
- **One caveat:** `packages/domain/src/queue/workflow-processing.ts:3` exports `class WorkflowProcessingError extends Error` with factory functions (`createRetryableWorkflowProcessingError:22`, `createTerminalWorkflowProcessingError:31`). Domain **constructs** the error but never throws it — workers throw it. This is consistent with "domain does not throw" but the doc does not explicitly say "domain may export Error types for consumers to throw." Minor gap, not a contradiction.

### Multi-section claims vs warehouse reality

Warehouse is the only multi-section reference module. The doc's description (diff validator + identity helper pattern) matches the code: `diff-rules.ts` and `diff-identity.ts` both present. However, see Section 8 for web-module gaps.

---

## Section 3 — `RULES.md`

| Rule | Verdict | Evidence |
|---|---|---|
| 1. No `@builders/db` / Prisma imports | PASS | Grep `@builders/(db\|application)\|Prisma` in `packages/domain/src/` returns zero matches. |
| 2. No throws | PASS in reference modules | Zero `throw` statements. Error class export in `queue/workflow-processing.ts:3` is construction, not throwing. |
| 3. No orchestration / data-layer calls | PASS | No `await` or cross-package imports in reference modules. All functions are synchronous and pure. |
| 4. No Next.js / React / UI framework imports | PASS | Grep `from ["']next\|from ["']react` in `packages/domain/src/` returns zero matches. |
| 5. No HTTP status codes or response shaping | PASS | No `status:` numeric codes, no `Response` / `NextResponse` references in reference modules. |

---

## Section 4 — `IMPORTS.md`

### Allowed imports

| Claim | Verdict | Evidence |
|---|---|---|
| `zod` only | ACCURATE | Single zod import in domain: `packages/domain/src/queue/auto-allocate-work-order.ts:1`. |
| `zod` confined to queue | PASS | Grep `from ["']zod` in `packages/domain/src/` returns only the queue file. |
| Relative intra-domain imports | PASS | All non-zod imports are relative `./` / `../` paths (see full import list output). |

### Forbidden imports

| Item | Hits | Verdict |
|---|---|---|
| `@builders/db` | 0 | PASS |
| `@builders/application` | 0 | PASS |
| `apps/` | 0 | PASS |
| `next`, `next/*` | 0 | PASS |
| `react`, `react/*` | 0 | PASS |
| Node `fs` | 0 | PASS |
| Node `http` | 0 | PASS |
| Node `crypto` | 0 | PASS (intentional — `generateId` is injected into `assignDiffIds`) |
| `Date.now()`, `Math.random()`, `process.env` | 0 | PASS |

---

## Section 5 — `EXPORTS.md`

### Export shape list

All shapes listed in `EXPORTS.md` are present in reference modules (see Section 2 evidence table).

### Consumers

**`packages/application/` imports from domain — 5 sampled use cases**

| Use case | Evidence |
|---|---|
| `delete-service` | `packages/application/src/flooring/services/delete-service.ts:1` imports `isServiceDeleteBlocked`, `getServiceDeleteBlockedMessage`. |
| `create-manufacturer` | `packages/application/src/flooring/manufacturers/create-manufacturer.ts:1` imports `isManufacturerCompanyNameConflict`, `normalizeManufacturerCompanyNameForUniqueness`. |
| `delete-contact` | `packages/application/src/flooring/contacts/delete-contact.ts:1` imports `isContactDeleteBlocked`, `getContactDeleteBlockedMessage`. |
| `save-sections-with-locations` | `packages/application/src/flooring/warehouses/save-sections-with-locations.ts:12-14` imports `assignDiffIds`, `validateDiff`. |
| `update-managed-user` | `packages/application/src/admin/update-managed-user.ts:1-?` imports `GovernableRole`, `canChangeUserRole`, `getRoleChangeBlockedMessage`. |

Total application-layer files importing `@builders/domain`: ≥21 (grep count, first 20 shown).

**`apps/web/modules/` imports from domain — 5 sampled**

| Module consumer | Evidence |
|---|---|
| Services form | `apps/web/modules/services/components/record/service-create-client.tsx:11` — `EMPTY_SERVICE_FORM`, `ServiceForm`, `ServiceRow`, `UnitOption`. |
| Contacts form | `apps/web/modules/contacts/components/record/contact-create-client.tsx:11` — `EMPTY_CONTACT_FORM`, `ContactDetail`, `ContactForm`. |
| Manufacturers controller | `apps/web/modules/manufacturers/controller/use-manufacturer-primary-section.ts:5` — `toManufacturerForm`, `ManufacturerForm`, `ManufacturerRow`. |
| Shared engine (record metrics) | `apps/web/modules/shared/engines/record-view/sections/metrics/record-line-summary.tsx:3` — `formatCurrencyValue`, `sumLineTotals`, `LineTotalInput`. |
| Shared engine (list filters) | `apps/web/modules/shared/engines/list-view/controllers/table-filter-state.ts:1` — `normalizeTableFilterValues`. |

**`apps/worker/` imports**

Not queue-schemas-only. Grep of `apps/worker/src`:
- `apps/worker/src/bootstrap.ts:3-7` imports `WORK_ORDER_AUTO_ALLOCATION_QUEUE`, `parseAutoAllocateWorkOrderJob`, `isWorkflowProcessingError`, `AutoAllocateWorkOrderJobV1`.
- `apps/worker/src/application/process-work-order-auto-allocation.ts:5` imports `AutoAllocateWorkOrderJobV1`.

`EXPORTS.md` correctly states "queue schemas for job payload validation, plus any domain rules the use cases it delegates to depend on." Verified.

**`packages/db/` does NOT import from domain**

`grep -rn "@builders/domain" packages/db/src` → **zero matches**. PASS.

---

## Section 6 — Module-specific docs

### `module-specific/PREDICATES.md`

| Claim | Verdict | Evidence |
|---|---|---|
| Path: per-concern `*-rules.ts` | ACCURATE | All predicates in reference modules live in `*-rules.ts` files (e.g. `delete-rules.ts`, `manufacturer-rules.ts`, `governance-rules.ts`, `warehouse-rules.ts`). |
| Signature `(input) => boolean` | ACCURATE | `canCreateUser(actorRole): boolean` at `admin/governance-rules.ts:30`. |
| Example: `canChangeUserRole(actor, target)` | ACCURATE | `packages/domain/src/admin/governance-rules.ts:70`. |
| **Gap** | Low | Predicates also appear in `types.ts` files: `validateContactType` at `contacts/types.ts:33`, `validateContactForm` at `contacts/types.ts:37`, `validateServiceForm` at `services/types.ts:32`. Doc says `*-rules.ts` only. |

### `module-specific/MESSAGE_BUILDERS.md`

| Claim | Verdict | Evidence |
|---|---|---|
| Path alongside predicates in `*-rules.ts` | ACCURATE | `getServiceDeleteBlockedMessage` in `services/delete-rules.ts:10`; `buildWarehouseDeleteBlockedMessage` in `warehouses/warehouse-rules.ts:19`. |
| Signature `(input) => string` | ACCURATE | All verified message builders return string. |
| Example: `buildWarehouseDeleteBlockedMessage(counts)` | ACCURATE | `packages/domain/src/flooring/warehouses/warehouse-rules.ts:19`. |

### `module-specific/NORMALIZERS.md`

| Claim | Verdict | Evidence |
|---|---|---|
| Path: alongside rules in `*-rules.ts` | PARTIAL | `normalizeWarehouseName` in `warehouses/warehouse-rules.ts:7` ✓. But `normalizeAddressState` lives in `shared/address-helpers.ts:1` (shared utility file, not `*-rules.ts`). |
| Signature `(raw) => canonical` | ACCURATE | Verified. |
| Example: `normalizeWarehouseName(name)` | ACCURATE | `packages/domain/src/flooring/warehouses/warehouse-rules.ts:7`. |

### `module-specific/DIFF_RULES.md`

| Claim | Verdict | Evidence |
|---|---|---|
| Path: `flooring/{entity}/diff-rules.ts` | ACCURATE for warehouse | `packages/domain/src/flooring/warehouses/diff-rules.ts` exists. No other reference module currently has `diff-rules.ts`. |
| Draft/update/delete types | ACCURATE | `SectionDraft:1`, `LocationDraft:14`, `LocationUpdate:21`, `LocationDelete:29`, `SectionDelete:5` — all in `warehouses/diff-rules.ts`. |
| `DiffValidationIssue` union | ACCURATE | `warehouses/diff-rules.ts:50` defines the union. Codes: `DUPLICATE_LOCATION_COORD_IN_ADDED:51`, `DUPLICATE_LOCATION_COORD:52`, `UNRESOLVED_TEMPID:53`, `DELETED_SECTION_HAS_REMAINING_LOCATIONS:54`. |
| Per-rule finders | ACCURATE | `findDuplicateLocationCoordsInDiff:98`, `findUnresolvedTempIds:141`, `findStrandedLocations:158`. |
| `validateDiff` orchestrator | ACCURATE | `warehouses/diff-rules.ts:190`. Returns `DiffValidationIssue[]`, never throws. |
| Application consumer | ACCURATE | `packages/application/src/flooring/warehouses/save-sections-with-locations.ts:44` calls `validateDiff`. |

### `module-specific/TYPES.md`

| Claim | Verdict | Evidence |
|---|---|---|
| Path: per-concern `types.ts` | ACCURATE | `admin/types.ts`, `services/types.ts`, `manufacturers/types.ts`, `contacts/types.ts`, `warehouses/types.ts` all exist. |
| `EMPTY_*_FORM` constants | ACCURATE | `services/types.ts:25`, `manufacturers/types.ts:21`, `contacts/types.ts:28`, `warehouses/types.ts:52,58`. |
| `to*Form` converters | ACCURATE | `services/types.ts:39`, `manufacturers/types.ts:29`, `contacts/types.ts:44`, `warehouses/types.ts:64,72`. |
| Example: `GovernableRole`, `GovernanceActor`, `GovernanceTarget` | ACCURATE | `admin/types.ts:2,5,11`. |
| Zod parsers for external input | PARTIAL | Doc says Zod schemas "belong here too." In reference modules the only Zod usage is in `queue/auto-allocate-work-order.ts`, not in any `types.ts`. No Zod parsers currently in reference-module `types.ts` files. |

---

## Section 7 — Shared docs

### `shared/DIFF_IDENTITY.md`

| Claim | Verdict | Evidence |
|---|---|---|
| Path `flooring/{entity}/diff-identity.ts` | ACCURATE for warehouse | `packages/domain/src/flooring/warehouses/diff-identity.ts` exists. Only reference module with this file. |
| Exports `assignDiffIds(entries, generateId)` | ACCURATE | `warehouses/diff-identity.ts:11`. |
| `generateId` injected | ACCURATE | Signature takes `generateId: () => string`; application supplies `randomUUID` at `save-sections-with-locations.ts:62,63`. |

### `shared/QUEUE_SCHEMAS.md`

| Claim | Verdict | Evidence |
|---|---|---|
| Path `packages/domain/src/queue/` (singular) | ACCURATE | Directory is `queue/` (singular). |
| Exports: queue name, job name, Zod schema, retry policy, status enums | ACCURATE | `queue/auto-allocate-work-order.ts:3` (`WORK_ORDER_AUTO_ALLOCATION_QUEUE`), `:4` (job), `:8` (`WORK_ORDER_AUTO_ALLOCATION_RETRY_POLICY`), `:18` (`WORK_ORDER_AUTO_ALLOCATION_STATUS_VALUES`), plus a Zod schema later in the file. |
| Example: auto-allocation constants | ACCURATE | Names match code exactly. |

### `shared/UTILITIES.md`

**Checklist presence** (all files under `packages/domain/src/shared/`):

| File | Present? |
|---|---|
| `address-helpers.ts` | ✓ |
| `date-format.ts` | ✓ |
| `product-display-name.ts` | ✓ |
| `numbering.ts` | ✓ |
| `inventory-allocation-totals.ts` | ✓ |
| `line-totals.ts` | ✓ |
| `record-calculation-rows.ts` | ✓ |
| `record-expense-summary.ts` | ✓ |
| `record-sales-reps.ts` | ✓ |
| `record-summary.ts` | ✓ |
| `table-preferences.ts` | ✓ |

All 11 files present. No extras, no missing.

**Purity scan** (each file against I/O, framework imports, throws, non-determinism):

| Check | Result |
|---|---|
| `throw` | 0 hits in `shared/` |
| `Date.now()`, `Math.random()`, `process.env` | 0 hits |
| `fetch(`, Node `fs`, `http`, `crypto` | 0 hits |
| `from "next"`, `from "react"` | 0 hits |
| `@builders/db`, `@builders/application` | 0 hits |
| `new Date(value)` — only in `date-format.ts:22,26` parsing a passed-in string; deterministic given input | PASS |
| `Intl.DateTimeFormat` in `date-format.ts:1,8` — module-level constants, deterministic | PASS |

All 11 shared utilities are pure. PURITY RULE: PASS.

---

## Section 8 — Warehouse mid-sweep violations

Warehouse is the only multi-section module. All items below are **sweep tasks**, not doc changes.

| # | Location | Issue | Blocks sweep? |
|---|---|---|---|
| 1 | `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:16` | Defines local `EMPTY_WAREHOUSE_DETAIL` instead of consuming `EMPTY_WAREHOUSE_FORM` from `@builders/domain`. | Yes — completes the "web modules import domain forms" claim. |
| 2 | `apps/web/modules/warehouse/record/create/warehouse-create-client.tsx:41` | Uses local `toWarehouseDraft` instead of `toWarehouseForm` from `@builders/domain`. | Yes. |
| 3 | `apps/web/modules/warehouse/domain/` | Web module has its own `domain/` folder. By the module anatomy rules, domain logic lives in `packages/domain/`, not inside the web module. | Yes — boundary violation. |
| 4 | `apps/web/modules/warehouse/types.ts` | Web module has its own `types.ts` duplicating shapes already in `packages/domain/src/flooring/warehouses/types.ts`. | Yes — source-of-truth split. |
| 5 | `apps/web/modules/warehouse/use-warehouse-client-controller.ts`, `use-warehouse-record-controller.ts` | Controllers sit at module root rather than under `controllers/`. | Low priority — structural, sweep cleanup. |
| 6 | `packages/domain/src/flooring/warehouses/diff-rules.ts:50-54` | `DiffValidationIssue` union has 4 codes. If warehouse acquires more multi-section invariants (e.g. section-level capacity rules), the union grows. Currently complete for the 3 implemented rules. | No — not missing, just watch-item. |

**Zero domain-layer throws or assertion helpers** in `packages/domain/src/flooring/warehouses/` — the warehouse domain is already clean.

---

## Section 9 — Doc-vs-doc contradictions

All five contradictions resolved by the applied edits (C1, C2 → `layers/PATTERN.md`; M1, M3, M4 → `docs/layers/domain/*`).

---

## Section 10 — Recommended doc edits

All recommended doc edits have been applied. Remaining follow-ups are code-level — see Section 11.

---

## Section 11 — Warehouse sweep follow-ups (NOT doc edits)

Tracked in `docs/module-anatomy/multi-section/warehouse/sweep-plan/VIOLATIONS.md`. Do not duplicate here.
