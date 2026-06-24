# entities-rename — rename "Management Companies" → "Entities" everywhere (model, columns, symbols, paths, labels, nav, PDF, picker engine, cross-module references)

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` (target the management-companies module across every layer) to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
This branch performs a pure, 100% in-place RENAME of "Management Companies" → "Entities" across every layer — the model `FlooringManagementCompany` and its `name` column, all symbols, file/dir paths, user-facing labels, filter chips, list columns, print/PDF labels, nav items, the cascade picker engine, and every reference inside work-orders / templates / properties. There is NO new behavior, NO new model, NO new linking — only a rename. "Done" = the concept reads uniformly as "Entity"/"Entities" everywhere (~90 source files) and `/check` is green.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ Model name: keep the `Flooring` prefix → `FlooringEntity`, or go bare `Entity`? (Every schema model uses the `Flooring*` prefix except `Property`.)
- ⚑ `@@map` table name: `flooring_entity` vs `entity`? (Current is `flooring_management_company`.)
- ⚑ DTO / JS-side field: does the JS `name` field on the domain types/normalizers/list-column key also become `entity`, or does only the DB column rename while JS keeps `name`?
- ⚑ Property relation field names: `managementCompanyId`→`entityId`, `managementCompany`→`entity`? (Renaming these forces nested `where`/`orderBy`/`select` edits in the templates + work-orders repos.)
- ⚑ URL routes: rename `/dashboard/management-companies` → `/dashboard/entities` and `/api/management-companies` → `/api/entities`, plus the nav slug `flooring-management-companies` → `flooring-entities`? (Breaks existing bookmarks/links.)
- ⚑ Cascade engine folder: rename `engines/picker/combo/management-cascade/` → `entity-cascade/`?
- ⚑ Telemetry / event strings: rename scopes/actions (`managementCompanies.*`), `entityType:"flooringManagementCompany"`, error codes `MANAGEMENT_COMPANY_*`, and `errorCode MANAGEMENT_COMPANY_LIST_LOAD_FAILED`? (May orphan historical analytics/dashboards.)
- ⚑ Migration: confirm this is a pure RENAME (preserves rows, no backfill, no new column).
- ⚑ Cross-module DTO fields `managementCompanyName` / `managementCompanyId` on Property / Template / WorkOrder → `entityName` / `entityId`?
- ⚑ PDF print label: confirm the externally-visible work-order-slip `<th>Management Company</th>` label should change.
- ⚑ Naming collision: `entityType` / `entityId` already exist in the telemetry layer AND as local variables — renaming MC concepts to `entity*` risks ambiguous identifiers; apply naming care.
- ⚑ GAP: short-forms `mc` / `Mgmt` / `mgmt` (in filenames + local vars) will NOT surface under a `managementCompany` grep — search `\bmc\b` / `Mc` / `mgmt` separately.
- ⚑ GAP: stale `dist/` artifacts (e.g. `delete-rules.*` exists only under `dist/`, no `src` counterpart) pollute grep — exclude `/dist/`, `.next/`, `node_modules/`, `*.tsbuildinfo`; don't chase the missing `delete-rules` source.
- ⚑ GAP: verify the live DB column name for `managementCompanyId` (it has no `@map`) plus the Postgres-generated FK/index names BEFORE writing the migration SQL.

## Scope
In:  The full rename across every layer — schema model + column, the matching migration, domain (types/form-rules/error-messages/normalizers/list-config), data repositories + Prisma accessors, application use-cases + error codes, API routes/validators/telemetry, the module directory (31 files incl. short-form `mc`/`Mgmt` names), dashboard pages, the cascade picker engine, the three package barrels, nav definitions + nav-rail icon-map + route builders, the work-order PDF/print label, and every cross-module reference inside properties / templates / work-orders / (comment-only) inventory. Plus all matching unit / engine / e2e tests.

Out: Do NOT create any new model. Do NOT build any color / palette / badge feature. Do NOT add any new cross-entity linking or new behavior — this is a rename only. Do NOT modify historical migration files. Do NOT rename the shared `isBlankName` function in `packages/domain/src/shared/name-rules.ts` (touch only its doc comment).

## Files you own (do not edit anything outside this list)

### Schema
- `packages/db/prisma/schema.prisma` — model `FlooringManagementCompany` block (L92-106): rename the model, rename column `name`→`entity` (L94), update `@@map "flooring_management_company"` (L105). In `Property`: relation fields `managementCompanyId` (L112), `managementCompany` + `@relation` (L113), and `@@index([managementCompanyId])` (L129). NOTE: leave `Property.name` (L114) and `Property @@index([name])` (L130) ALONE — those are Property's own name.

### Migration (NEW file — do NOT run it)
- `packages/db/prisma/migrations/<timestamp>_rename_management_company_to_entity/migration.sql` — `ALTER TABLE flooring_management_company RENAME …`, `RENAME COLUMN name → entity`, rename the `property_hub` FK column + index. Pure rename preserves rows (no backfill). Verify the live DB column name for `managementCompanyId` (no `@map`) and the Postgres-generated FK/index names before writing the SQL. Do NOT edit historical migrations. The user runs `db:deploy`.

### Domain
- `packages/domain/src/management/management-companies/` → rename dir to `entities`:
  - `types.ts` — `ManagementCompanyDetail` / `ListRow` / `Option` / `Form`, `EMPTY_MANAGEMENT_COMPANY_FORM`
  - `form-rules.ts` — `toManagementCompanyForm`, `validateManagementCompanyForm`, "Company name is required" (L19)
  - `error-messages.ts` — `MANAGEMENT_COMPANY_NAME_REQUIRED_MESSAGE`, `MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE`
  - `normalizers.ts` — `normalizeManagementCompany` / `ListRow` / `Option` + `*Input` types
  - `list-config.ts` — `LIST_MANAGEMENT_COMPANIES_PAGE_SIZE` / `MAX_PAGE_SIZE`
  - `index.ts`
- `packages/domain/src/shared/name-rules.ts` L4 — doc comment only; do NOT rename the shared `isBlankName` fn.

### Domain tests
- `packages/domain/tests/management/management-companies/` → rename dir + ids: `form-rules.test.ts`, `normalizers.test.ts`.

### Data
- `packages/db/src/management/management-companies/` → rename dir:
  - `read-repository.ts` — `listManagementCompanyOptions`, `getManagementCompanyById`, `listManagementCompaniesForListView`, `searchManagementCompanyOptions`, `*Select` consts; Prisma accessor `client.flooringManagementCompany` (L64/76/122/123/158), `Prisma.FlooringManagementCompanyWhereInput` (L98/99), every `name:true` select + `orderBy:{name}` (L66/125/160 → `entity`)
  - `write-repository.ts` — `Create/UpdateManagementCompanyRecordInput`, `create/update/deleteManagementCompanyRecord`, `managementCompanyDetailSelect`, `client.flooringManagementCompany.{create,update,delete}` (L48/61/74)
  - `index.ts`

### Application
- `packages/application/src/management/management-companies/` → rename dir:
  - `types.ts`, `create-` / `update-` / `delete-` / `list-management-company*.ts`, `errors.ts`, `index.ts`
  - Symbols: `createManagementCompanyUseCase`, `updateManagementCompanyUseCase`, `deleteManagementCompanyUseCase`, `listManagementCompaniesUseCase`, `searchManagementCompanyOptionsUseCase`, `ManagementCompaniesListFilters`, `ManagementCompanyExecutionError`, `ManagementCompanyErrorCode`, error-code literals `"MANAGEMENT_COMPANY_VALIDATION_FAILED"` / `"MANAGEMENT_COMPANY_NOT_FOUND"`, `error.name`.

### Application tests
- `packages/application/tests/management/management-companies/` → rename dir (4 files: create / update / delete / list).

### API
- `apps/web/app/api/management-companies/` → rename dir to `entities`:
  - `_validators.ts` — `validate*ManagementCompany*`, `listManagementCompaniesQuerySchema`, `managementCompanyOptionsQuerySchema`, "Invalid management companies list query"
  - `route.ts` — route strings `"/api/management-companies"` (L24/42/68), scope `"managementCompanies.create"` (L41/52/73), telemetry message/action, `entityType:"flooringManagementCompany"` (L66), response key `{managementCompany:result}` (L71)
  - `[id]/route.ts` — delete scope, snapshot key, "Management company changed before delete completed…"
  - `[id]/primary/section/route.ts` — PATCH scope `"managementCompanies.primary.section.replace"`, entityType, response key, "Management company changed before section save…"
  - `options/route.ts`

### Module dir
- `apps/web/modules/management-companies/` → rename dir (31 files): `components/list`, `components/picker`, `components/record` (+ `primary`, `properties`, `templates`), `controllers`, `data`.
  - Filenames embed `management-compan*` AND short-form `mc` (`use-mc-create-section.ts`, `use-mc-primary-section.ts`; ids `linkedMc` / `selectedMcId` / `mcDisplay` / `mcError` / `hasMcCreate`).
  - User-facing strings: list-columns `{key:"name",label:"Company"}` (L13); client heading "Management Companies" (L115); table empty/aria "Open management company ${row.name}" (L23); record-view titles + `deleteLabel "Delete Management Company"` + `dirtyLabel "management company"`; create-client "New Management Company" / "Create Management Company" / "Creating Management Company..."; quick-create-modal "New Management Company"; picker create-menu heading "New management company"; `properties/primary/management-company-select-section.tsx` ActionHeader title; `data/queries.ts` "Management Company Unavailable" / "could not load this management company"; `data/list-management-companies-request.ts` (`MANAGEMENT_COMPANIES_LIST_QUERY_KEY`, `parseManagementCompaniesListInputFromSearchParams`); options-request; mutations.

### Pages
- `apps/web/app/dashboard/management-companies/` → rename dir:
  - `page.tsx` — `ManagementCompaniesClient` import, query key, parser, "Management Companies Unavailable", `errorCode="MANAGEMENT_COMPANY_LIST_LOAD_FAILED"`
  - `new/page.tsx`, `[id]/page.tsx`
- ALSO verify `apps/web/app/dashboard/page.tsx` for any MC link.

### Engines
- `apps/web/engines/picker/combo/management-cascade/` → rename dir (e.g. `entity-cascade`):
  - `index.ts` barrel
  - `client/cascade-rules.ts` — `applyManagementCompanySelection`, `CascadeSelectionPatch` keys `managementCompanyId` / `Label`
  - `client/use-cascade-picker-controller.ts` — `managementCompanyId` / `Label`, `selectManagementCompany`, `set*` state
  - `contracts/cascade-picker-contracts.ts` — `CascadePickerSeed.managementCompany`
- `apps/web/engines/common/controls/record-create-menu.tsx` L31/33 — doc-comment examples only (cosmetic).

### Engine tests
- `apps/web/tests/engines/picker/cascade-rules.test.ts` + `use-cascade-picker-controller.test.tsx`
- `apps/web/tests/engines/record-view/record-view-feature-alignment.test.ts` L10-14 — HARDCODED path-string literals for the MC module/page/api dirs (an import-rewrite tool MISSES these; must hand-edit to the new paths).

### Barrels (3)
- `packages/domain/src/index.ts` L8
- `packages/application/src/index.ts` L11
- `packages/db/src/index.ts` L16
- Each: `export * from "./management/management-companies/index.js"` → entities path.

### Nav
- `apps/web/modules/app-shell/navigation/definitions.ts` L27-31 — nav item `slug:"flooring-management-companies"`, `name:"Management Companies"`, `href:"/dashboard/management-companies"`
- `apps/web/modules/app-shell/components/nav-rail.tsx` L45 — icon-map key `"flooring-management-companies"` — MUST move together with the slug
- `apps/web/hooks/navigation/routes.ts` — `buildTemplateHubHref` / `buildPropertyRecordHref` thread `managementCompanyId` / `Label` query keys (L78 / L104-105 / L116-117)

### PDF / file-generation
- `packages/domain/src/flooring/work-orders/file-generation/work-order-document-sections.ts` L219 — print row `<th>Management Company</th>` `${input.managementCompanyName}` (user-facing PDF label) + L152/156 doc comments
- `packages/domain/src/flooring/work-orders/file-generation/types.ts` L89 — `managementCompanyName` field
- `packages/domain/src/flooring/work-orders/file-generation/build-work-order-slip-html.ts` L18 doc
- Tests: `work-order-info.test.ts` L16-17, `above-table-invariant.test.ts` L130, `_fixtures.ts`

### Cross-module references (rename relation/DTO fields + labels, NOT new dirs)
Backend:
- `packages/domain/src/management/properties/{types,normalizers,form-rules,property-hub-form}.ts` — `PropertyManagementCompany` type, `managementCompany` / `Id` / `Name`; `property-hub-form` imports `ManagementCompanyForm` + `validateManagementCompanyForm`
- `packages/domain/src/management/templates/{types,normalizers,delete-rules}.ts`
- `packages/domain/src/flooring/work-orders/{types,normalizers}.ts`
- `packages/db/src/management/properties/{read,write}-repository.ts`
- `packages/db/src/management/templates/{read,write}-repository.ts`
- `packages/db/src/flooring/work-orders/read-repository.ts` (L157 sort nested `managementCompany.name`, L104 filter, L392 select, L540 `managementCompanyName`) + `shared.ts`
- `packages/application/src/management/properties/{list-properties,search-property-options,create-property-hub}.ts` — `create-property-hub` imports `createManagementCompanyRecord`, `getManagementCompanyById`, `CreateManagementCompanyRecordInput`, `ManagementCompanyDetail`, `MANAGEMENT_COMPANY_NOT_FOUND_MESSAGE`, `ManagementCompanyExecutionError`
- `packages/application/src/management/templates/{list-templates,search-template-options}.ts`
- `packages/application/src/flooring/work-orders/list-work-orders.ts`

Frontend:
- `modules/properties/` — `property-detail-client`, `property-record-view`, `primary/management-company-picker-section`, `primary/property-fields-section`, `templates/property-templates-section`, `controllers/record/use-property-primary-section`, `data/list-properties-request`, `data/property-options-request`, `list/table/properties-list-columns` L12 `{key:"managementCompany",label:"Management Company"}`, `properties-row-cell`, `properties-client`, `toolbar-controls/management-company-filter-chip`, `toolbar-controls/add-hub-button`, `picker/property-create-menu`, `picker/property-picker`
- `modules/templates/` — `list/table/templates-list-columns` L13, `templates-row-cell`, `templates-client`, `toolbar-controls/management-company-filter-chip` + `property-filter-chip`, `record/primary/groups/template-property-unit-group` L133 `label="Management Company"`, `template-primary-fields-section`, `template-record-panel`, `templates-section-list`, controllers `use-templates-list-controller` / `use-template-hub-controller` / `use-templates-section-scope` / `use-templates-section-table`, data `list-templates-request` / `queries` / `template-options-request`, `picker/template-picker`
- `modules/work-orders/` — `list/table/work-orders-list-columns` L15 `{key:"managementCompanyName",label:"Management Company"}`, `work-orders-row-cell`, `toolbar-controls/mgmt-co-filter-chip` (filename + ariaLabel), `sort-picker-chip`, `property-filter-chip`, `template-filter-chip`, `work-orders-client` L155/326 "Mgmt Co" comments, `record/primary/types`, `record/primary/work-order-primary-fields-section` L260 label + L263-264 aria/title, `work-order-record-panel`, `controllers/record/drafts`, `data/list-work-orders-request`, `data/queries`
- Comment-only: `modules/inventory/components/record/inventory-record-view.tsx` L45; `engines/record-view/dialogs/choice-dialog.tsx` L30-31

### E2E
- `apps/web/tests/e2e/management-companies-smoke.spec.ts` — rename file; `goto "/dashboard/management-companies"`, `getByText("Management Companies")`, "Open management company ${name}"
- `apps/web/tests/e2e/templates-smoke.spec.ts` L44 — `getByRole` button `name:"Management company"`

## Layer-by-layer map
- **Schema** — `packages/db/prisma/schema.prisma` L92-106 (model + `name`→`entity` + `@@map`), Property L112/113/129 relation fields/index; leave L114/L130 (Property's own name).
- **Migration** — NEW `…_rename_management_company_to_entity/migration.sql`: pure `ALTER TABLE … RENAME`, `RENAME COLUMN name → entity`, FK column + index rename. Verify live column + generated constraint names first.
- **Domain** — `management/management-companies/` dir → `entities`: types, form-rules (L19 string), error-messages, normalizers, list-config, index; `shared/name-rules.ts` L4 comment only.
- **Data** — `db/src/management/management-companies/` dir → `entities`: read-repo Prisma accessor `client.flooringManagementCompany` (L64/76/122/123/158), `WhereInput` (L98/99), `name`→`entity` selects/orderBy (L66/125/160); write-repo accessors (L48/61/74).
- **Application** — `application/src/management/management-companies/` dir → `entities`: 5 use-cases + filters + errors + error-code literals + `error.name`.
- **API** — `app/api/management-companies/` dir → `entities`: route strings, scopes, telemetry `entityType:"flooringManagementCompany"`, response keys, validator schemas + messages, `[id]` + `[id]/primary/section` + `options` routes.
- **Module dir** — `modules/management-companies/` dir → `entities` (31 files): list-columns, headings, record-view titles/labels, create/quick-create strings, picker headings, queries strings, request query-keys + parsers; mind short-form `mc`/`Mgmt`.
- **Pages** — `app/dashboard/management-companies/` dir → `entities`: page.tsx imports/query-key/parser/error string/errorCode, new + [id] pages; verify dashboard/page.tsx link.
- **Engines** — `engines/picker/combo/management-cascade/` → `entity-cascade`: barrel, cascade-rules, controller, contracts seed; `common/controls/record-create-menu.tsx` L31/33 comments.
- **Barrels** — domain/application/db `src/index.ts` (L8/L11/L16) export paths.
- **Nav** — app-shell `navigation/definitions.ts` L27-31 (slug/name/href), `nav-rail.tsx` L45 icon-map key (move with slug), `hooks/navigation/routes.ts` query-key threading (L78/104-105/116-117).
- **PDF** — work-orders `file-generation/work-order-document-sections.ts` L219 print label + `types.ts` L89 field + slip-html L18 comment + 3 tests.
- **Cross-module** — properties / templates / work-orders backend (domain + db + application) relation/DTO fields + nested where/orderBy/select; properties / templates / work-orders frontend list-columns/filter-chips/labels/requests; comment-only inventory + choice-dialog.
- **Tests** — domain (2), application (4), engine (2 + the hardcoded-path alignment test L10-14), e2e (2).

## Migration (if schema changes)
Write the migration; DO NOT run it. The user runs all migrations.
- NEW: `packages/db/prisma/migrations/<timestamp>_rename_management_company_to_entity/migration.sql`
- Pure RENAME — `ALTER TABLE flooring_management_company RENAME TO <new>;`, `ALTER TABLE … RENAME COLUMN name TO entity;`, rename the `property_hub` FK column + its index. Preserves all rows; no backfill, no new column.
- BEFORE writing the SQL: verify the live DB column name backing `managementCompanyId` (no `@map`) and the Postgres-generated FK/index constraint names. Do NOT edit historical migration files. User runs `db:deploy`.

## Done means
- `/check` green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
