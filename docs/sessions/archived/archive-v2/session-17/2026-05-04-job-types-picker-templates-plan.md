# Job Types Picker — Apply to Templates (Sweep 2 of 2)

## Context

Final consumer of the job-types picker package shipped in sweep 1: the templates record view's Job Type field. Mechanical mirror of the WO swap. Picker package + API + tool slug are all in place — this sweep only edits the templates module + its 2 page loaders.

**Zero user-visible behavior changes.** Job Type stays optional. Picker shows `selectedLabel={detail.jobTypeName}` for the saved record; "—" placeholder for create.

**Out of scope:**
- Templates list view (job type column reads `jobTypeName` directly from the joined select — untouched)
- Anything outside the templates module

## Resolved decisions

| Decision | Choice |
|---|---|
| Auth | `JOB_TYPES_TOOL_SLUG = "warehouse"` (set in sweep 1) — works for templates users since `ManagementCompanyPicker` + `PropertyPicker` (also warehouse-gated) are already wired into templates and working. No new gate needed. |

---

## Layer-boundary contract

| Layer | New code |
| --- | --- |
| Schema / Domain / Data / Application / API | None |
| Web primitives / controllers / hooks / transport | None — all reused |
| Module — job-types | None — `JobTypePicker` reused via public export |
| Module — templates | 5 file edits |
| `app/dashboard/templates/{[id],new}/page.tsx` | 2 file edits |
| `modules/shared` | No new imports |

---

## Reference patterns

| Concern | Reference |
|---|---|
| WO Job Type cell swap (sweep 1 of this set) | `apps/web/modules/work-orders/components/record/primary/work-order-primary-fields-section.tsx` |
| WO panel `detail` object construction | `apps/web/modules/work-orders/components/record/work-order-record-panel.tsx` |
| WO queries trim | `apps/web/modules/work-orders/data/queries.ts` |

---

## Execution plan

### 1. `apps/web/modules/templates/data/queries.ts`

- Drop `listJobTypeOptions` from imports.
- Drop the `listJobTypeOptions()` call from `loadTemplateDropdownOptions()`. Function returns `{ warehouseOptions }` only.
- Drop `jobTypeOptions` field from the `getTemplateDetailPageData` return-type annotation.

### 2. `apps/web/modules/templates/components/record/template-primary-fields-section.tsx`

- Drop `jobTypeOptions` prop from signature.
- Add `jobTypeId: string | null` and `jobTypeName: string | null` to `TemplatePrimaryDetail`.
- Import `JobTypePicker` from `@/modules/job-types/components/picker/job-type-picker`.
- Replace the Job Type cell branch:
  ```tsx
  <CellAt col={5} row={1} colSpan={2}>
    <FormField label="Job Type">
      {editable ? (
        <JobTypePicker
          value={draft.jobTypeId || null}
          onChange={(id) => onFieldChange("jobTypeId", id ?? "")}
          selectedLabel={detail?.jobTypeName ?? null}
          placeholder="No job type"
          ariaLabel="Job type"
        />
      ) : (
        <StaticFieldValue>{detail?.jobTypeName ?? "—"}</StaticFieldValue>
      )}
    </FormField>
  </CellAt>
  ```

### 3. `apps/web/modules/templates/components/record/template-record-panel.tsx`

- Drop `jobTypeOptions` prop + forwarding to the section.
- Add `jobTypeId: primary.record.jobTypeId` + `jobTypeName: primary.record.jobTypeName` to the `detail` object passed to the section.

### 4. `apps/web/modules/templates/components/record/template-detail-client.tsx`

- Drop `jobTypeOptions` prop from signature + panel forwarding.

### 5. `apps/web/modules/templates/components/record/template-create-client.tsx`

- Drop `jobTypeOptions` prop from both the inner `TemplateCreatePanel` and the exported `TemplateCreateClient`. Drop section forwarding.

### 6. `apps/web/app/dashboard/templates/[id]/page.tsx`

- Stop forwarding `result.data.jobTypeOptions` to `TemplateDetailClient`.

### 7. `apps/web/app/dashboard/templates/new/page.tsx`

- Stop forwarding `result.data.jobTypeOptions` to `TemplateCreateClient`.

---

## Verification

1. `npm run typecheck --workspace @builders/web` — clean.
2. `npm run build --workspace @builders/web` (Railway's step) — succeeds.
3. UI smoke (manual): open a template record. Job Type field shows the saved name in read-only mode. Edit mode opens `JobTypePicker` with current selection in the trigger. Type to search. Pick a different job type. Save → round-trips. Open `/dashboard/templates/new` — picker works empty.

---

## Files touched (7, all modified, 0 new)

- `apps/web/modules/templates/data/queries.ts`
- `apps/web/modules/templates/components/record/template-primary-fields-section.tsx`
- `apps/web/modules/templates/components/record/template-record-panel.tsx`
- `apps/web/modules/templates/components/record/template-detail-client.tsx`
- `apps/web/modules/templates/components/record/template-create-client.tsx`
- `apps/web/app/dashboard/templates/[id]/page.tsx`
- `apps/web/app/dashboard/templates/new/page.tsx`

---

## Open questions

None.

---

## Job-types picker package status — done across both intended sites

| Site | Sweep | Status |
|---|---|---|
| Work-orders primary section | 1 | ✅ shipped |
| Templates primary section | 2 | ⏳ this sweep |
