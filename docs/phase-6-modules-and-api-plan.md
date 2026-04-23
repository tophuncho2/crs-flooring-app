# Phase 6 — Module directories + API routes for Management Companies + Properties

## Context

Phases 1–5 landed schema, domain, data, and application layers. This phase reshapes the two UI-facing modules (management-companies, properties) to the canonical module shape and rebuilds their API routes on top of the Phase 5 use cases.

**In scope:** management-companies + properties.
**Out of scope:** job-types (no UI this sweep), templates + work-orders (need their own application layer first).

## Field-flow reference (answer to the "where does each layer decide" question)

1. **Schema** — source of truth for what can be stored.
2. **Data write-repo input** (`Create*RecordInput` in `@builders/db`) — column menu that may be written.
3. **Use-case input** — same shape as the data write-repo input in Phase 5. Use case owns validation + orchestration.
4. **HTTP validator** (`_validators.ts` in the API route folder) — narrows untrusted body to the use-case input shape: type checks, required/optional, string trim, reject unknowns. This is where "what's allowed from the outside" is decided.
5. **Route handler** — runs `applyRoutePolicy` / mutation lifecycle, parses body via validator, passes parsed input to the use case.
6. **Return shape** — data-layer `select` + domain normalizer → returned by use case → serialized by the route.

Route transport owns the HTTP payload. Use case trusts what the validator hands it. Data layer persists only what the repo input allows. Domain owns error strings + invariants.

## Canonical module shape (target)

```
apps/web/modules/<module-plural>/
├── components/
│   ├── list/
│   │   ├── <module-plural>-client.tsx
│   │   └── <module-plural>-table.tsx
│   └── record/
│       ├── <module>-create-client.tsx
│       ├── <module>-detail-client.tsx
│       ├── <module>-primary-fields-section.tsx
│       ├── <module>-record-panel.tsx
│       └── <module>-<child>-section.tsx    (read-only openable child rows)
├── controller/                              (singular)
│   ├── use-<module>-primary-section.ts
│   └── use-<module-plural>-list-controller.ts
└── data/
    ├── queries.ts                           (server-side, wraps @builders/db)
    └── mutations.ts                         ("use client", HTTP calls to API routes)
```

**No `record/` folder. No `types.ts` at module root. No `domain/`, `application/`, or `controllers/` (plural).**

## Child-section pattern (user-specified — differs from warehouses reference)

Warehouses edits its child rows inline (sections + locations diff-save). For mgmt-co + properties, child rows are **read-only + openable only**:

- The detail page shows the main section (editable) + one child section per module.
- Child rows are rendered from the detail fetch (single `getXById` call returns nested child arrays).
- Each child row has a click/onOpen that navigates to the child's own detail page.
- No controller hook for child sections; no mutations route for child sections; no state-save logic.

**Management companies record view:**
- Main section: mgmt-co fields (editable).
- Child section: `management-company-properties-section` rendering **Property primary-scoped rows**. Each property row is toggle-expandable to reveal nested **Template child-scoped rows** (also openable). Click a property → `/dashboard/properties/{id}`. Click a template → `/dashboard/templates/{id}` *(template detail page rebuilds in a later phase; link still resolves to the path)*.

**Properties record view:**
- Main section: property fields (editable).
- Child section: `property-templates-section` rendering template primary-scoped rows only. Click a template → `/dashboard/templates/{id}`.

## Current → target delta

### Management-companies module

**Current tree** (14 files):
```
apps/web/modules/management-companies/
├── components/
│   ├── list/management-companies-client.tsx       ✓ keep
│   └── management-companies-client.tsx            ✗ delete (redundant)
├── data/
│   ├── mutations.ts                                ⚠ rewrite as HTTP client
│   └── queries.ts                                  ✓ keep
├── record/                                         ✗ move contents + delete folder
│   ├── create/management-company-create-client.tsx
│   ├── detail/management-company-detail-client.tsx
│   └── panel/
│       ├── controllers/use-management-company-primary-section.ts
│       ├── management-company-record-panel.tsx
│       └── sections/
│           ├── management-company-primary-fields-section.tsx
│           └── management-company-properties-section.tsx
└── validators.ts                                   ✗ move to API folder
```

**Target tree:**
```
apps/web/modules/management-companies/
├── components/
│   ├── list/
│   │   ├── management-companies-client.tsx
│   │   └── management-companies-table.tsx         NEW (extract table from the client)
│   └── record/
│       ├── management-company-create-client.tsx
│       ├── management-company-detail-client.tsx
│       ├── management-company-primary-fields-section.tsx
│       ├── management-company-record-panel.tsx
│       └── management-company-properties-section.tsx
├── controller/                                     NEW folder
│   ├── use-management-company-primary-section.ts
│   └── use-management-companies-list-controller.ts NEW or moved
└── data/
    ├── queries.ts                                  keep
    └── mutations.ts                                REWRITE as "use client" HTTP
```

**Moves:**
- `record/create/management-company-create-client.tsx` → `components/record/`
- `record/detail/management-company-detail-client.tsx` → `components/record/`
- `record/panel/management-company-record-panel.tsx` → `components/record/`
- `record/panel/sections/management-company-primary-fields-section.tsx` → `components/record/`
- `record/panel/sections/management-company-properties-section.tsx` → `components/record/`
- `record/panel/controllers/use-management-company-primary-section.ts` → `controller/`

**Changes:**
- `data/mutations.ts` — rewrite from server-side `@builders/db` wrapper to `"use client"` HTTP caller.
- `components/record/management-company-properties-section.tsx` — adjust for toggle-expandable property rows revealing template child rows, both openable.

**Deletes:**
- `apps/web/modules/management-companies/components/management-companies-client.tsx` (old non-list-scoped wrapper; duplicate of components/list one).
- `apps/web/modules/management-companies/record/` (after moves).
- `apps/web/modules/management-companies/validators.ts` (migrates to `apps/web/app/api/management-companies/_validators.ts`).

### Properties module

Same pattern. The only structural difference: no nested toggle in the child section — `components/record/property-templates-section.tsx` is a flat list of openable template rows.

### API routes — rebuild

**Target tree per module:**
```
apps/web/app/api/<module-plural>/
├── _validators.ts                         HTTP body parsers per use case
├── route.ts                               GET list + POST create
└── [id]/
    ├── route.ts                           GET detail + DELETE
    └── primary/
        └── section/
            └── route.ts                   PATCH primary section
```

**Why the nesting:** per the modules-directory canon, "each section on the record view gets its own route file". With only the primary section editable, only `primary/section/route.ts` exists under `[id]/`. Child sections (properties, templates) have no PATCH because they're read-only.

**Handler-level contract per route (from warehouses reference):**
- Every route starts with `applyRoutePolicy({ toolSlug, rateLimit, route })` (or `authorizeXRoute` + `enforceQueryRateLimit` for pure GETs).
- Mutation routes use the full lifecycle: `parseMutationEnvelope` → `enforceMutationReceipt` → `withMutationTelemetry` → `finalizeMutationReceipt`.
- `assertExpectedUpdatedAt` on PATCH/DELETE for optimistic concurrency.
- Delegate to `@builders/application` use cases; no business logic in the handler.
- `routeJson(access, body)` / `routeError(access, error)` for response serialization.

**Use-case wiring:**
| Route | Method | Use case |
|---|---|---|
| `/api/management-companies` | POST | `createManagementCompanyUseCase` |
| `/api/management-companies/[id]/primary/section` | PATCH | `updateManagementCompanyUseCase` |
| `/api/management-companies/[id]` | DELETE | `deleteManagementCompanyUseCase` |
| `/api/properties` | POST | `createPropertyUseCase` |
| `/api/properties/[id]/primary/section` | PATCH | `updatePropertyUseCase` |
| `/api/properties/[id]` | DELETE | `deletePropertyUseCase` |

**GET routes:**
| Route | Method | Source |
|---|---|---|
| `/api/management-companies` | GET | `listManagementCompanies` from `@builders/db` |
| `/api/management-companies/[id]` | GET | `getManagementCompanyById` from `@builders/db` |
| `/api/properties` | GET | `listProperties` from `@builders/db` |
| `/api/properties/[id]` | GET | `getPropertyById` from `@builders/db` |

**Error translation in route handlers:**
`ManagementCompanyExecutionError` / `PropertyExecutionError` bubble out of the use case. Route's `routeError(access, error)` inspects `error.status` + `error.code` to produce the HTTP response.

### `_validators.ts` shape (per module)

Functions:
- `validateCreateManagementCompanyInput(body) → CreateManagementCompanyRecordInput`
- `validateUpdateManagementCompanyInput(body) → UpdateManagementCompanyRecordInput` (partial)
- Same for properties.

Parsers: ports `parseRequiredString`, `parseOptionalString`, `parseOptionalStateAbbreviation` that the old module-root `validators.ts` used, or inlines them per warehouses precedent. Uses existing `@/server/http/api-helpers` if already available.

Throw `<Module>ExecutionError` with `code: "<MODULE>_VALIDATION_FAILED"` and `message: <field> required` for HTTP parsing failures. Route uses `routeError` to serialize.

### `data/mutations.ts` rewrite (HTTP client)

**Management-companies target shape:**
```ts
"use client"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "@builders/domain"

export async function createManagementCompanyRequest(input: ManagementCompanyForm) {
  return requestJson<{ managementCompany: ManagementCompanyDetail }>("/api/management-companies", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateManagementCompanyRequest(id: string, input: ManagementCompanyForm, expectedUpdatedAt: string) {
  return requestJson<{ managementCompany: ManagementCompanyDetail }>(`/api/management-companies/${id}/primary/section`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, expectedUpdatedAt)),
  })
}

export async function deleteManagementCompanyRequest(id: string, expectedUpdatedAt: string) {
  return requestJson<{ ok: true }>(`/api/management-companies/${id}`, {
    method: "DELETE", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, expectedUpdatedAt)),
  })
}
```

Mirror for properties. Controllers (in `controller/`) call these HTTP clients.

### Dashboard pages

Already exist for both modules. Audit + fix imports after module moves. Each module has three pages:
- `page.tsx` — list view (imports `components/list/<module-plural>-client` + `data/queries`'s page-data loader)
- `new/page.tsx` — create form (imports `components/record/<module>-create-client`)
- `[id]/page.tsx` — detail view (imports `components/record/<module>-detail-client` + `data/queries`'s detail-page loader)

No dashboard page changes beyond import-path fixups.

### Job Types — no module, no routes, no pages

Confirmed. Seeded via script; `listJobTypeOptions` / `listJobTypes` from `@builders/db` are called from inside property + template forms when those UIs need the dropdown (a later phase).

## Reference files

- `apps/web/modules/warehouse/` — canonical module shape (with the caveat that warehouses uses `controllers/` plural today; we're adopting `controller/` singular per the current target spec).
- `apps/web/app/api/warehouses/` — reference for the mutation-lifecycle route pattern (`applyRoutePolicy`, `enforceMutationReceipt`, `assertExpectedUpdatedAt`, etc.).
- `apps/web/app/api/warehouses/_validators.ts` — reference for HTTP validator structure.

## Critical files

**Create (new):**
- `apps/web/modules/management-companies/controller/use-management-company-primary-section.ts` (moved, updates `data/mutations.ts` import)
- `apps/web/modules/management-companies/controller/use-management-companies-list-controller.ts`
- `apps/web/modules/management-companies/components/list/management-companies-table.tsx` (extracted from client)
- `apps/web/modules/properties/controller/use-property-primary-section.ts` (moved)
- `apps/web/modules/properties/controller/use-properties-list-controller.ts`
- `apps/web/modules/properties/components/list/properties-table.tsx` (extracted)
- `apps/web/app/api/management-companies/_validators.ts`
- `apps/web/app/api/management-companies/[id]/primary/section/route.ts`
- `apps/web/app/api/properties/_validators.ts`
- `apps/web/app/api/properties/[id]/primary/section/route.ts`

**Move (filesystem relocation only):**
- `record/**` → `components/record/**` (5 files × 2 modules).
- `record/panel/controllers/use-*-primary-section.ts` → `controller/` (1 file × 2 modules).

**Rewrite:**
- `apps/web/modules/management-companies/data/mutations.ts` — server wrapper → HTTP client.
- `apps/web/modules/properties/data/mutations.ts` — same.
- `apps/web/app/api/management-companies/route.ts` — POST now calls `createManagementCompanyUseCase`, full mutation lifecycle.
- `apps/web/app/api/management-companies/[id]/route.ts` — DELETE now calls `deleteManagementCompanyUseCase`; GET keeps `getManagementCompanyById`.
- `apps/web/app/api/properties/route.ts` — same.
- `apps/web/app/api/properties/[id]/route.ts` — same.
- Primary section components → child-section components where child rows adopt an `onOpen` prop + navigation.

**Delete:**
- `apps/web/modules/management-companies/components/management-companies-client.tsx` (redundant root wrapper).
- `apps/web/modules/management-companies/record/` entire folder (after moves).
- `apps/web/modules/management-companies/validators.ts` (migrated to API folder).
- `apps/web/modules/properties/components/properties-client.tsx`.
- `apps/web/modules/properties/record/` entire folder.
- `apps/web/modules/properties/validators.ts`.

## Execution order

1. **Pre-flight** — confirm baseline package builds green (they do as of Phase 5).
2. **Rewrite API routes first** on the existing module layout — they can be built on top of the Phase 5 use cases without touching modules. New routes pass lint/typecheck against `@builders/application` and `@builders/db`. New `_validators.ts` per module.
3. **Restructure management-companies module** — move `record/**` → `components/record/**`, create `controller/`, delete redundant wrapper, extract `*-table.tsx`, update imports.
4. **Rewrite `management-companies/data/mutations.ts`** as HTTP client. Update controller imports.
5. **Adjust `management-company-properties-section.tsx`** for openable rows + toggle template child rows.
6. **Restructure properties module** — same 3+4+5 steps.
7. **Fix dashboard page imports** (list, new, detail — three pages × two modules = six files).
8. **Final sweep** — delete stale `record/` folders + old root wrappers + old module-root `validators.ts`.
9. **Build + typecheck** — all three packages green; apps/web typecheck scoped only to templates + work-orders UI (Phase 7 surface) + admin (out of sweep).
10. **Manual verification** — start dev server, hit list + detail + create + delete paths for both modules end-to-end.

## Concerns

1. **HTTP envelope shape (`withMutationMeta`)** — warehouses uses `withMutationMeta(input, revisionKey)` where `revisionKey` is `updatedAt`. Confirm both modules also use `updatedAt` for optimistic-lock revision (yes — both models have `updatedAt`). No custom revision keys needed.
2. **`requestJson` error shape** — when API returns 4xx with `{ error: { code, message, field } }`, `requestJson` throws. Controllers need to translate these to UI-friendly messages. Existing controllers already do this via `createRecordSectionError`.
3. **Child-section row "openable" implementation** — use Next.js `Link` with `href={buildRecordDetailHref("/dashboard/properties", property.id)}`. If `buildRecordDetailHref` isn't already generic, inline a simple template-literal builder. Click handler emits `onOpen(id)` which the parent wires to `router.push` or `<Link>`.
4. **Nested template rows under properties (mgmt-co view)** — `getManagementCompanyById` already returns `properties[].templates[]` in the detail shape. The UI needs a per-row toggle state (local `useState<Set<string>>` of expanded property ids). No extra fetch.
5. **`controller/` naming** — the target spec says singular. Warehouse reference uses plural `controllers/` (older convention). Going singular per the spec; warehouse is on a later-flip path.
6. **Options loaders for create pages** — `getManagementCompanyCreatePageOptions` (if any) isn't currently split out; management-company create has no parent entity so no options needed. Property create needs management-company options — that's already baked into `getPropertyCreatePageOptions` in `data/queries.ts`. No changes here.
7. **Templates dashboard pages don't exist** (Phase 4 deleted them). Child rows that "open a template" will navigate to a 404 until templates UI is rebuilt. Accepted — `href` still resolves to the correct path; 404 is a later phase's problem.
8. **Route handler typing** — `routeJson` expects the serializable shape; we don't need to force-cast execution-error translations, `routeError` already handles `ManagementCompanyExecutionError.status` + `code`.
9. **Record-section controllers** — `use-management-company-primary-section.ts` already calls `data/mutations` under the old module wrapper shape. After the rewrite of mutations to HTTP, the controller's save handler becomes `updateManagementCompanyRequest(id, form, expectedUpdatedAt)`.

## Verification

- `npm run build --workspace @builders/domain` + `@builders/db` + `@builders/application` — all green.
- `npm run typecheck --workspace @builders/web` — target modules + routes clean; residual errors scoped to templates + work-orders UI (Phase 7).
- `find apps/web/modules/management-companies -name "record" -type d` → empty.
- `find apps/web/modules/management-companies -name "controllers" -type d` → empty.
- `ls apps/web/modules/management-companies/controller` → two controller files.
- `rg "prisma\\." apps/web/modules/management-companies apps/web/modules/properties` → zero hits.
- `rg "@builders/db" apps/web/modules/management-companies/data/mutations.ts apps/web/modules/properties/data/mutations.ts` → zero hits (mutations are HTTP, not db).
- `rg "\"use client\"" apps/web/modules/management-companies/data/mutations.ts apps/web/modules/properties/data/mutations.ts` — both marked client.
- Manual smoke test: dev server resolves `/dashboard/management-companies` list view; `/new` create works; `/[id]` detail loads; delete path returns 200; properties section rows link to the right hrefs.

## Out of scope (confirmed)

- Templates UI rebuild (Phase 7).
- Work-orders UI rebuild (Phase 7+).
- Job-types UI (no UI this sweep).
- Auto-allocation, template sync, file generation (all deferred).
- Application-layer use cases for templates + work-orders (later phase).
- New features in mgmt-co / properties UI beyond what the existing components already render.

## Answer to the conceptual question (reference)

> at what point do we decide what fields are going through each use case? does the use case decide which columns are important and the full row gets sent into it? and the transport sets the payload for api sends calls application with that data?

Yes, directionally. The breakdown:

- **Columns the DB accepts** = Prisma schema. Frozen by migrations.
- **Columns a write-repo will set** = `Create*RecordInput` / `Update*RecordInput` types in `@builders/db`. These intentionally mirror the writable schema fields. They are the authoritative "field menu" for every caller above the data layer.
- **Columns a use case's input carries** = identical to the data repo's input in Phase 5 (we kept them aligned). Use case uses them as-is; no picking, no filtering — that already happened one layer up.
- **Columns an HTTP payload can carry** = defined by `_validators.ts` per API route. The validator rejects unknown keys, enforces required/optional, trims strings, returns the parsed object as the use-case input.
- **So the route sets the payload contract; the use case trusts it; the data layer writes it.** If a new field is added to the schema later, it flows upstream: add to the write-repo input → add to `_validators.ts` → route re-accepts it. The use case usually needs no change because it already hands input through to the data layer.
