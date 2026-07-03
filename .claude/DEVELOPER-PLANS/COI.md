# Certificate Tracking — New Module (rebuild plan)

> **Status: shelved, ready to re-execute.** This module was fully built on `dev-2`
> (schema → domain → data → application → api → module → pages, gauntlet green) but the
> work was **discarded uncommitted** on 2026-07-03 because `dev-3` was running a sweep that
> touches basically every module + layer (barrel `index.ts` files, `schema.prisma`,
> `nav-rail.tsx`, `definitions.ts`), which would collide on merge. dev-3's branch merges
> first; this module is re-executed cleanly afterward from this spec.
>
> Everything below is a faithful reconstruction of what was built — it is a **build sheet**,
> not a design doc. Re-executing it reproduces the shipped module 1:1. No engines were
> changed; the module only **consumes** existing engines (list-view, record-view, picker,
> common). Built on the **job-types / properties** management-module patterns.

---

## Vision

A standalone **Certificate Tracking** management module: track certificates (insurance,
licenses, compliance docs) that belong to an **Entity**, each with an **expiration date** and
free-text **internal notes**. The list surfaces a read-time-derived **status** (Expired /
Expiring Soon / Valid / No Expiration) as a colored chip so staff can see at a glance what's
lapsing. Full CRUD via the record-view engine; entity filter on the list.

**Naming:** the model is `Certificate` (no `Flooring` prefix — it lives under `management/`
alongside `Entity`, `Property`, `JobType`, `EntityType`, `Template`). The nav slug uses the
`flooring-` prefix only because the nav registry keys are uniformly prefixed
(`flooring-certificate-tracking`).

---

## Confirmed decisions (locked with user, 2026-07-01)

1. **`entityId` is a nullable FK** → `entity(id)`, **`ON DELETE SET NULL`**. A deleted entity
   orphans its certificates rather than cascade-deleting them (certificates outlive the entity
   link).
2. **`expirationDate` is `@db.Date`** (calendar date, no time — mirrors
   `FlooringWorkOrder.scheduledFor`). Displayed with the shared **`formatStableDate`**
   (UTC-stable). Nullable — "No Expiration" is a valid state.
3. **Status is computed at READ TIME, never stored.** A `CURRENT_DATE - expirationDate` diff
   is **not immutable**, so Postgres rejects it as a `GENERATED … STORED` column, and any
   stored value would be stale the day after write. The domain `computeCertificateStatus`
   pure function is the single source of truth; the data-layer normalizer calls it (allowed
   carve-out: pure computation, no throwing rule).
4. **`internalNotes` is `VARCHAR(500)`**, optional. Ceiling enforced in **both** the domain
   form-rule (client) and the API validator (server).
5. **Actor columns** `createdBy` / `updatedBy` (nullable `TEXT`) follow the actor-columns
   standard — stamped from `access.user.email` in the use cases, never user input.
   `createdBy` is immutable post-create.
6. **One query tool to start: the Entity filter.** No sort UI ships (the list falls to its
   server default `expirationDate ASC`), but the sort plumbing is wired end-to-end and dormant
   (allowlists + order-by builder ready for a future Sort tool).
7. **S3 / file attachments DEFERRED** — not in this build. Certificates are metadata-only for now.

---

## Data model

`Certificate` model added to `packages/db/prisma/schema.prisma`, plus a back-relation on `Entity`.

```prisma
// on model Entity, add to the relations block:
certificates    Certificate[]

model Certificate {
  id             String    @id @default(uuid())
  entityId       String?
  entity         Entity?   @relation(fields: [entityId], references: [id], onDelete: SetNull)
  name           String    @db.VarChar(120)
  expirationDate DateTime? @db.Date        // calendar date; read-time status; no stored generated col
  internalNotes  String?   @db.VarChar(500)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  createdBy      String?
  updatedBy      String?

  @@index([entityId])          // entity filter
  @@index([expirationDate])    // default date sort
  @@index([name])              // name search
  @@index([createdAt, id])     // list sort tiebreak
  @@index([updatedAt, id])     // list sort tiebreak
  @@map("certificate")
}
```

**Migration** `packages/db/prisma/migrations/20260701130000_add_certificate/migration.sql`
(user runs `db:deploy` — the file must be authored, deploy only applies pre-written files):
- `CREATE TABLE "certificate"` with the columns above (`updatedAt` has no default — Prisma
  stamps it).
- Five `CREATE INDEX`: `entityId`, `expirationDate`, `name`, `(createdAt,id)`, `(updatedAt,id)`.
- `ADD CONSTRAINT certificate_entityId_fkey … REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE`.

> ⚠️ On re-execution, **re-timestamp the migration folder** to a value that sorts *after*
> whatever dev-3's sweep lands, so the migration spine stays monotonic on the shared dev DB.

---

## Layer-by-layer build

### Domain — `packages/domain/src/management/certificates/`

- **`types.ts`** — `CertificateEntity {id, entity}`, `CertificateDetailRecord`,
  `CertificateListRow` (identical shape; both carry `status: CertificateStatus` and an
  ISO-string `expirationDate` — `""` when unset), `CertificatePrimaryForm {name,
  expirationDate("YYYY-MM-DD"|""), internalNotes, entityId}`.
- **`status.ts`** — the crown jewel. `computeCertificateStatus(expirationDate, now = new Date())`:
  - Types: `CertificateStatusTone = "success"|"warning"|"error"|"muted"` (a plain string union
    matching the `@/engines/common` `CellChip` `tone` prop — kept as a string so pure domain
    never imports the web engine), `CertificateStatusKey = "expired"|"expiring"|"valid"|"none"`,
    `CertificateStatus {key, label, tone, daysUntilExpiration: number|null}`.
  - `CERTIFICATE_EXPIRING_SOON_DAYS = 30`.
  - Collapses both the expiration and `now` to a **UTC calendar-day index** (`toUtcDayIndex`)
    so the count never drifts across timezones — matches `formatStableDate`.
  - Tiers: `< 0` → Expired/error · `<= 30` → Expiring Soon/warning · else → Valid/success ·
    null/undefined/""/NaN → `No Expiration`/muted, `daysUntilExpiration: null`.
  - `now` param is injectable for deterministic tests.
- **`normalizers.ts`** — `normalizeCertificate` (→ detail) and `normalizeCertificateListRow`
  (→ list row). Both: `Date`→ISO string helpers, `internalNotes ?? ""`, `entity` passthrough,
  and `status: computeCertificateStatus(expirationDate)`. `toExpirationString(null)` → `""`.
- **`form-rules.ts`** — `CERTIFICATE_NOTES_MAX_LENGTH = 500`, `EMPTY_CERTIFICATE_FORM`,
  `toCertificatePrimaryForm(detail)` (uses shared `toDateInputValue` for the date input,
  `entity?.id ?? ""`), `validateCertificatePrimaryForm(form)` → returns error string (`""` when
  valid): blank name → name-required; notes > 500 → notes-too-long. Reuses shared
  `isBlankName` + `toDateInputValue`.
- **`error-messages.ts`** — `CERTIFICATE_NAME_REQUIRED_MESSAGE`, `CERTIFICATE_NOT_FOUND_MESSAGE`,
  `CERTIFICATE_NOTES_TOO_LONG_MESSAGE`.
- **`list-config.ts`** — cross-layer constants (referenced by both server use case/validator and
  client): `LIST_CERTIFICATES_PAGE_SIZE = 50`, `LIST_CERTIFICATES_MAX_PAGE_SIZE = 200`.
- **`index.ts`** — barrels all of the above.
- **Barrel wiring:** add `export * from "./management/certificates/index.js"` to
  `packages/domain/src/index.ts`.
- **Test** `packages/domain/tests/management/certificates/status.test.ts` — pins the four tiers,
  the window boundary (day 30 = Expiring, day 31 = Valid), day 0 = Expiring, past = Expired
  (−1), null/undefined/"" = No Expiration, and Date-instance ≡ ISO-string parity. Fixed
  `NOW = 2026-07-01T12:00:00Z`.

### Data — `packages/db/src/management/certificates/`

- **`read-repository.ts`** —
  - `certificateListSelect` / `certificateDetailSelect` (identical): scalar cols +
    `entity: { select: { id, entity } }`.
  - `getCertificateById(id, client=db)` → `findUniqueOrThrow` → `normalizeCertificate`.
  - `listCertificatesForListView(options, client=db)` → `Promise.all([count, findMany])`,
    `orderBy: buildCertificatesOrderBy(options.sort)`, `skip`/`take`, maps rows through
    `normalizeCertificateListRow`. Returns `{rows, total}`.
  - `buildListViewWhere` — `name contains (insensitive)` for search; `entityId in [...]` for the
    filter; ANDs multiple clauses; `undefined` when empty.
  - Exported sort types: `CertificatesListSortEntry {field, direction}`, `CertificatesListSort
    {entries}`, `CertificateListViewOptions`, `CertificateListViewResult`.
- **`order-by.ts`** — pure (only `import type` from Prisma client so it unit-tests without a DB):
  - `appendUniqueOrderBy(values, next)` — dedupes by JSON.
  - `certificateFieldOrderBy(field, dir)` — maps `name`/`expirationDate`/`createdAt`/`updatedAt`
    to scalar clauses, `entity` → `{entity:{entity:dir}}`, unknown → `undefined`.
  - `buildCertificatesOrderBy(sort)` — appends each entry's clause, then **always** an `id`
    tiebreak mirroring the lead direction (default `asc`). List default is `expirationDate ASC`
    (soonest first; NULLS LAST under ASC).
- **`write-repository.ts`** —
  - `CreateCertificateRecordInput {entityId:string|null, name, expirationDate:Date|null,
    internalNotes:string|null, createdBy, updatedBy}`.
  - `UpdateCertificateRecordInput = Partial<Omit<Create, "createdBy"|"updatedBy">> & {updatedBy}`.
  - `createCertificateRecord` / `updateCertificateRecord(id, …)` / `deleteCertificateRecordById(id)`
    — all accept optional tx client, return `normalizeCertificate` (delete → void).
- **`index.ts`** — barrels read + write.
- **Barrel wiring:** add `export * from "./management/certificates/index.js"` to
  `packages/db/src/index.ts`.
- **Test** `packages/db/tests/management/certificates/order-by.test.ts` — executable spec for the
  field→clause map, entity-relation resolution, id-tiebreak on every shape, unknown-field skip,
  lead-direction mirroring, `undefined ≡ empty`.

### Application — `packages/application/src/management/certificates/`

- **`errors.ts`** — `CertificateErrorCode = "CERTIFICATE_VALIDATION_FAILED" | "CERTIFICATE_NOT_FOUND"`;
  `CertificateExecutionError extends Error {code, status, field?, payload?}`.
- **`types.ts`** — `CreateCertificateUseCaseInput = Omit<CreateCertificateRecordInput,
  "createdBy"|"updatedBy">` (actor stamped separately), `UpdateCertificateUseCaseInput =
  Omit<UpdateCertificateRecordInput, "updatedBy">`, `CertificateUseCaseResult = CertificateDetailRecord`.
- **`create-certificate.ts`** — `createCertificateUseCase(input, actorEmail, client?)`: asserts
  non-empty `actorEmail`, opens `withDatabaseTransaction`, re-checks `isBlankName` → 400
  `CERTIFICATE_VALIDATION_FAILED` field `name`, then `createCertificateRecord({...input,
  createdBy: actorEmail, updatedBy: actorEmail})`.
- **`update-certificate.ts`** — `updateCertificateUseCase(id, input, actorEmail, client?)`: same
  actor assert, validates name only if present, `updateCertificateRecord(id, {...input,
  updatedBy: actorEmail})`, maps Prisma **P2025** → 404 `CERTIFICATE_NOT_FOUND`.
- **`delete-certificate.ts`** — `deleteCertificateUseCase(id, client?)` → `{ok:true}`. No in-use
  guard (certificates own no children, nothing references them). P2025 → 404.
- **`list-certificates.ts`** — `listCertificatesUseCase(input: ListInput<CertificatesListFilters>)`
  → `ListOutput<CertificateListRow>`. Clamps page/pageSize against the domain constants,
  normalizes+dedupes `entityId`, builds sort from `input.sorts ?? [input.sort]` capped at
  `MAX_SORT_LEVELS = 3` (repo silently drops unknown fields → no whitelist needed here).
  Exports `CertificatesListFilters {entityId?: ReadonlyArray<string>}`.
- **`index.ts`** — barrels errors, types, all four use cases.
- **Barrel wiring:** add `export * from "./management/certificates/index.js"` to
  `packages/application/src/index.ts`.
- **Contracts reused:** `ListInput`/`ListOutput`/`ListSort` from `../../list-view/contracts.js`.

### API — `apps/web/app/api/certificates/`

Canonical gauntlet: `applyRoutePolicy` (auth+ratelimit), `enforceQueryRateLimit` (GET),
`parseMutationEnvelope` + `enforceMutationReceipt`/`finalizeMutationReceipt` (idempotency),
`assertExpectedUpdatedAt` (OCC), `withMutationTelemetry`, `routeJson`/`routeError`,
`parseUuidParam`.

- **`_validators.ts`** —
  - `validateCreateCertificateInput(body)` → `CreateCertificateUseCaseInput`. `requireString`
    for name; `optionalString` for entityId; `optionalNotes` (enforces 500 ceiling → 400);
    `optionalDate` accepts bare `YYYY-MM-DD` → projects to `new Date(`${d}T00:00:00Z`)` for
    `@db.Date`, empty→null, bad shape→400.
  - `validateUpdateCertificateInput(body)` — **partial**: only copies keys present in body
    (`"name" in body`, etc.), so a PATCH touches exactly what it sends.
  - List query validator: zod schema `{q?, page(coerce,≥1,default 1), pageSize(coerce, 1..MAX,
    default PAGE_SIZE)}`; `CERTIFICATES_UI_SORT_FIELDS = [name, entity, expirationDate, createdAt,
    updatedAt]` (defense-in-depth allowlist independent of the data layer);
    `parseSortsParam("field:dir,…")` deduped+capped at 3; **default sort `expirationDate:asc`**
    when no `sorts` param; `entityId` read via `searchParams.getAll` (multi-value), deduped/trimmed.
- **`route.ts`** — `GET` (list; query-ratelimit) + `POST` (create; `CRUD_CREATE`, scope
  `certificates.create`, telemetry entityType `certificate`, responds `201 {certificate}`).
- **`[id]/route.ts`** — `GET` (detail by uuid → `{certificate}`) + `DELETE` (`CRUD_DELETE`, scope
  `certificates.delete`, requires `expectedUpdatedAt`, OCC snapshot check, telemetry, `{ok:true}`).
- **`[id]/primary/section/route.ts`** — `PATCH` (`CRUD_UPDATE_SECTION`, scope
  `certificates.primary.section.replace`, requires `expectedUpdatedAt`, OCC check,
  `updateCertificateUseCase`, `{certificate}`).

### Web module — `apps/web/modules/certificates/`

**data/**
- `queries.ts` — `getCertificateDetailPageData(id)` (server): `getCertificateById`, maps P2025 →
  `{ok:false, notFound:true}`, other errors → `createPrismaPageLoadIssue` with code
  `CERTIFICATE_DETAIL_LOAD_FAILED`.
- `mutations.ts` (`"use client"`) — `createCertificateRequest(form)` (POST),
  `updateCertificateRequest(id, form, revisionKey)` (PATCH primary/section),
  `deleteCertificateRequest(id, updatedAt)` (DELETE). All wrap `withMutationMeta` (idempotency +
  OCC token).
- `list-certificates-request.ts` — `parseCertificatesListInputFromSearchParams` (server-side URL
  → `ListInput`), `buildCertificatesListSearchString`, `listCertificatesRequest` (GET), and
  `CERTIFICATES_LIST_QUERY_KEY = ["certificates","list"]`.

**controllers/**
- `list/use-certificates-list-controller.ts` — thin: `useRecordEntryNavigation(
  "/dashboard/certificate-tracking")` + message/pageError state; exposes `openCreate`,
  `openCertificate`.
- `record/primary/use-certificate-primary-section.ts` — `useSingleSectionRecordController`
  (record-view engine), scope `certificates`, `payloadKey "certificate"`, `detailUrl
  /api/certificates/{id}`, `manageDirtySections:false`. `saveSection` validates via
  `validateCertificatePrimaryForm` (→ `createRecordSectionError` on fail) then
  `updateCertificateRequest`. `deleteRecord` → `deleteCertificateRequest` +
  `invalidateQueries(CERTIFICATES_LIST_QUERY_KEY)`.

**components/list/**
- `certificates-client.tsx` (default export) — `useFetchListController<CertificateListRow,
  EngineCertificateFilters>` (mode `fetch`), engine↔app filter translation (near-identity;
  `entityId` array), `ListPageShell` + `ListCreateButtonPortal` (label "Certificate") +
  `ListPageFeedback` + `ListActionBar` (label "Certificate Tracking", rowCountLabel
  "certificates") hosting one `ToolbarMenuButton "Filter"` → `EntityFilterChip`. Holds the
  selected-entity label locally (picker label-binding contract). Renders `CertificatesTable`.
- `certificates-table.tsx` — wraps `DataTable<CertificateListRow>` with columns + row renderer +
  `onOpenRow`, empty "No certificates match these filters."
- `table/certificates-list-columns.ts` — columns L→R: Certificate(name), Entity, Expires
  (expirationDate), **Status**, Notes, Created, Updated, Created by, Updated by.
- `table/certificates-row-cell.tsx` — per-cell renderer; **Status** cell = `<CellChip
  tone={row.status.tone}>{row.status.label}</CellChip>`; dates via `formatStableDate`
  (expiration) / `formatEasternDateTime` (created/updated); em-dash fallbacks.
- `toolbar-controls/entity-filter-chip.tsx` — wraps the canonical
  `EntityTypePicker` (from `@/modules/entities/components/picker/entity-type-picker`).

**components/record/**
- `certificate-create-client.tsx` — `RecordCreateClientScaffold` +
  `useSingleSectionCreateController<CertificatePrimaryForm>` seeded from
  `EMPTY_CERTIFICATE_FORM`; on create redirects to `buildRecordDetailHref`. Holds local
  `entityLabel` state.
- `certificate-detail-client.tsx` — `RecordDetailClientScaffold` (headerVariant "section") →
  `CertificateRecordPanel`.
- `certificate-record-panel.tsx` — `useCertificatePrimarySection`, one primary
  `RecordPrimarySectionInstance` inside `RecordMultiSectionPanel`, plus `RecordEntityFooter`
  (Delete Certificate, confirm "Delete certificate?"). Seeds+refreshes the entity trigger label
  locally (picker contract).
- `primary/certificate-primary-fields-section.tsx` — shared editable form for **both** create and
  detail. Fields: Certificate Name (`TextCell`, required), Entity (`EntityTypePicker`), Expiration
  Date (`DateCell`), Status (read-only `CellChip`, detail only), Internal Notes (`TextareaCell`,
  rows 3). Detail flow additionally renders a divider + read-only Created/Updated timestamps
  (`formatEasternDateTime`) and Created by/Updated by actor band. Column span 8 (detail) vs 4
  (create), keyed off whether timestamps are passed.

### Pages — `apps/web/app/dashboard/certificate-tracking/`

- `page.tsx` — `requireSessionUser`, parses list input, prefetches the list query +
  `searchEntityOptionsUseCase({take:20})` into a `HydrationBoundary`, resolves the initial
  selected-entity label (seeds from the fetched options or a targeted search-by-id), renders
  `CertificatesClient`. Error → `DashboardErrorState` (code `CERTIFICATES_LIST_LOAD_FAILED`).
- `new/page.tsx` — `requireSessionUser`, resolves `backHref`, renders `CertificateCreateClient`.
- `[id]/page.tsx` — `requireSessionUser`, `getCertificateDetailPageData`, `notFound()` on missing,
  `DashboardErrorState` on load error, else `CertificateDetailClient`.

### Navigation (shared files — the collision surface)

- `apps/web/modules/app-shell/navigation/definitions.ts` — add to `FLOORING_NAV_ITEMS` (management
  group, after Entity Types): `{slug:"flooring-certificate-tracking", name:"Certificate Tracking",
  href:"/dashboard/certificate-tracking", group:"management"}`.
- `apps/web/modules/app-shell/components/nav-rail.tsx` — import `ShieldCheck` from lucide, add
  `"flooring-certificate-tracking": ShieldCheck` to `NAV_ICONS`.

---

## Re-execution checklist

1. Branch off the post-dev-3-merge `dev`. Confirm the six shared files (3 barrels,
   schema.prisma, nav-rail, definitions) merged cleanly — this module only **appends** to each,
   so re-apply the append.
2. Recreate the 10 module directories exactly as above.
3. **Re-timestamp** the migration folder to sort after any dev-3 migration on the shared dev DB.
   Author `schema.prisma` + the SQL migration together (deploy only applies pre-written files;
   the user runs `db:deploy`).
4. Run `/check` (the gauntlet). It was **green** at shelving time.
5. **DO NOT COMMIT** — hand back to the user. Provide a ≤17-word commit message.

## Deferred (not in this build)

- **S3 / file attachments** on certificates (the actual certificate PDFs).
- **Sort UI** — the toolbar Sort tool. Plumbing is dormant-ready (allowlists + order-by builder);
  only the client Sort menu + `?sorts=` wiring remain. See `/column-sort`.
- **CSV export** — no export manifest was built. See `/table-csv-export` if wanted.
- **Row number / color** — no `CERT-` row# or palette color. See `/column-rownumber`,
  `/column-color`.

## Source memory

See MEMORY.md → `[certificate tracking module]` (`certificate-tracking-module.md`) for the
original session's condensed record.
