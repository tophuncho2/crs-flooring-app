# Job Types Picker — Package + Apply to WO (Sweep 1 of 2)

## Context

Build a small picker package for job types and apply it to **work orders only** this sweep. Templates record view follows in sweep 2.

Job types is a terminal-managed lookup table — no list view, no record view, no Web-facing CRUD. The package only ships the missing search use case + API route + picker component. CRUD use cases (create/update/delete) already exist in `@builders/application` for terminal scripts to call directly.

**Out of scope:**
- Templates record view jobType field swap (sweep 2 of 2)
- Job types list view / record view UI (terminal-only per spec)
- The dead `/api/work-orders/options` aggregate route (no callers — flag for separate cleanup)

## Decision: create `apps/web/modules/job-types/`?

**Yes.** Same minimal shape as `apps/web/modules/categories/` — just `components/picker/` + `data/`. Justified by:
- Cross-module imports stay consistent with the established sibling-module public-export pattern
- Future expansion (if a job-types list ever lands) drops in cleanly
- Two subdirs total — small footprint

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema | None |
| Domain | None — `JobTypeOption {id, name}` already exists |
| Data | `searchJobTypeOptions({ search?, take })` in `packages/db/src/management/job-types/read-repository.ts` |
| Application | `packages/application/src/management/job-types/search-job-type-options.ts` + index re-export |
| API | `apps/web/app/api/job-types/_validators.ts` + `apps/web/app/api/job-types/options/route.ts` (new folder) |
| Web primitives / controllers / hooks / transport | None — all reused |
| Module — job-types | New: `apps/web/modules/job-types/data/job-type-options-request.ts` + `apps/web/modules/job-types/components/picker/job-type-picker.tsx` |
| Module — work-orders | 4 file edits (queries, section, panel, create-client) |
| Module — templates | Untouched (sweep 2) |
| `modules/shared` | No new imports |

---

## Reference patterns

| Concern | Reference |
|---|---|
| DB search fn (flat, no filter) | `searchManagementCompanyOptions` in `packages/db/src/management/management-companies/read-repository.ts` |
| Application use case (flat) | `searchManagementCompanyOptionsUseCase` in `packages/application/src/management/management-companies/list-management-companies.ts` |
| API options route | [api/management-companies/options/route.ts](apps/web/app/api/management-companies/options/route.ts) |
| API validator | [api/categories/_validators.ts](apps/web/app/api/categories/_validators.ts) |
| Picker (flat, no filter prop) | [category-picker.tsx](apps/web/modules/categories/components/picker/category-picker.tsx) |
| Picker request | [management-company-options-request.ts](apps/web/modules/management-companies/data/management-company-options-request.ts) |
| WO primary section detail extension | sweep 1 of pickers: `WorkOrderPrimaryDetail` type in `work-order-primary-fields-section.tsx` |

---

## Execution plan

### 1. Data — `packages/db/src/management/job-types/read-repository.ts`

Add `searchJobTypeOptions({ search?: string, take: number }, client?) → Promise<JobTypeOption[]>`:
- Where: `name` contains search (case-insensitive) when set, else undefined
- Order: `{ name: "asc" }`
- Select: `{ id, name }`
- Reuse `normalizeJobTypeOption`

### 2. Application — `packages/application/src/management/job-types/search-job-type-options.ts`

New file mirroring `searchManagementCompanyOptionsUseCase` shape:
- Input: `{ search?, take? }`
- Trim search, clamp take 1–50, default 20
- Delegate to `searchJobTypeOptions`
- Re-export from `packages/application/src/management/job-types/index.ts`

### 3. API — `apps/web/app/api/job-types/`

New folder. Two files:
- `_validators.ts` — `validateJobTypeOptionsQuery(searchParams)` returning `{ search?, take }`. Mirror `validateCategoryOptionsQuery` exactly.
- `options/route.ts` — GET only, `applyRoutePolicy` with appropriate tool slug, `enforceQueryRateLimit("/api/job-types/options")`, calls `searchJobTypeOptionsUseCase`, returns `{ options }`.

**Tool slug question:** check `apps/web/modules/shared/access/tool-slugs.ts` for an existing `JOB_TYPES_TOOL_SLUG` or similar. If none, use `WORK_ORDERS_TOOL_SLUG` (since WO is the immediate consumer) or add a slug. Will resolve during execution.

### 4. Module — `apps/web/modules/job-types/`

New folder. Two files:
- `data/job-type-options-request.ts` — `JOB_TYPE_OPTIONS_QUERY_KEY = ["job-types", "options"] as const`. `searchJobTypeOptionsRequest(search, signal, args?: { take? })` calling `GET /api/job-types/options?search=&take=`. Mirror management-company-options-request exactly.
- `components/picker/job-type-picker.tsx` — mirror `CategoryPicker` exactly (flat, no filter prop). Props: `value`, `onChange`, `selectedLabel?`, `placeholder?`, `disabled?`, `ariaLabel?`, etc. `toDropdownOption(option) → { id, title: option.name }`.

### 5. Module — work-orders (the actual swap)

#### 5a. `apps/web/modules/work-orders/data/queries.ts`

- Drop `listJobTypeOptions` from imports + from `getWorkOrderFormOptions`. Drop `jobTypeOptions` field from `WorkOrderFormOptionSet`. Keep `warehouseOptions` (still SSR-fetched as a static select).

#### 5b. `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx`

- Drop `JobTypeOption` import + `jobTypeOptions` prop + `jobTypeSelectOptions` derivation.
- Add `jobTypeId: string | null` and `jobTypeName: string | null` to `WorkOrderPrimaryDetail` type.
- Replace the Job Type cell branch:
  ```tsx
  <CellAt col={5} row={1} colSpan={1}>
    <FormField label="Job Type">
      {editable ? (
        <JobTypePicker
          value={draft.jobTypeId || null}
          onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
          selectedLabel={detail?.jobTypeName ?? null}
          placeholder="—"
          ariaLabel="Job type"
        />
      ) : (
        <StaticFieldValue>{detail?.jobTypeName ?? "—"}</StaticFieldValue>
      )}
    </FormField>
  </CellAt>
  ```

#### 5c. `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx`

- Drop `jobTypeOptions={options.jobTypeOptions}` forwarding to the section.
- Add `jobTypeId: controller.record.jobTypeId` and `jobTypeName: controller.record.jobTypeName` to the `detail` object passed to the section.

#### 5d. `apps/web/modules/work-orders/components/record/work-order-create-client.tsx`

- Drop `jobTypeOptions={options.jobTypeOptions}` forwarding. (`detail={null}` already in place from sweep 1 of pickers.)

---

## Verification

1. `npm run build --workspace @builders/{domain,db,application}` — clean.
2. `npm run typecheck --workspace @builders/web` — clean.
3. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
4. UI smoke (manual): open a WO record. Read-only mode shows the joined job type name. Edit mode opens picker with current selection in trigger. Type to search. Pick a different job type. Save → round-trips. Open `/dashboard/work-orders/new` — picker works empty. Confirm WO list view's job type column still renders (it reads `WorkOrderListRow.jobTypeName` via the joined select — independent of this sweep).

---

## Files touched (~10)

**New (6):**
- `packages/application/src/management/job-types/search-job-type-options.ts`
- `apps/web/app/api/job-types/_validators.ts`
- `apps/web/app/api/job-types/options/route.ts`
- `apps/web/modules/job-types/data/job-type-options-request.ts`
- `apps/web/modules/job-types/components/picker/job-type-picker.tsx`

**Modified (4):**
- `packages/db/src/management/job-types/read-repository.ts`
- `packages/application/src/management/job-types/index.ts`
- `apps/web/modules/work-orders/data/queries.ts`
- `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx`
- `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx`
- `apps/web/modules/work-orders/components/record/work-order-create-client.tsx`

---

## Open questions

None.

---

## Follow-up — sweep 2 of 2

Templates record view: same `<JobTypePicker>` swap on `template-primary-fields-section.tsx` row 1 cols 5-6, drop `listJobTypeOptions` from `loadTemplateDropdownOptions`, drop `jobTypeOptions` props from panel/detail-client/page. Pure UI / data-loading consumer migration since the picker package is already shipped after this sweep.
