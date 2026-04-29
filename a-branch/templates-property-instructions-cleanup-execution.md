# Execution Summary — Templates Cleanup: Strip `propertyInstructions`

Plan: [templates-property-instructions-cleanup-plan.md](templates-property-instructions-cleanup-plan.md) — locked.
Decisions: Q1 = skip `components-smoke/page.tsx` (revised — leave the mock alone). Q2 = renumber rows 5 → 4 (close the gap).

## Files edited (7)

| Layer | File | Change |
|---|---|---|
| Domain | `packages/domain/src/management/templates/types.ts` | Dropped `propertyInstructions` from `TemplateDetail`, `TemplateForm`, `EMPTY_TEMPLATE_FORM` |
| Domain | `packages/domain/src/management/templates/normalizers.ts` | Dropped from `TemplateDetailInput` + `normalizeTemplate` body |
| Domain | `packages/domain/src/management/templates/form-rules.ts` | Dropped from `toTemplateForm` mapping |
| Data | `packages/db/src/management/templates/read-repository.ts` | Dropped from `templateDetailSelect` |
| Data | `packages/db/src/management/templates/write-repository.ts` | Dropped from `CreateTemplateRecordInput` and `templateDetailSelect` |
| API | `apps/web/app/api/templates/_validators.ts` | Dropped from create + update validators (payload no longer reads field) |
| UI | `apps/web/modules/templates/components/record/template-primary-fields-section.tsx` | Deleted "Row 4: Property Instructions" `<CellAt>` block; renumbered Template Notes from row 5 → row 4 |

Skipped (per Q1 revision): `apps/web/app/components-smoke/page.tsx` — mock fixture left alone.

## Verification — all gates passed

| Gate | Command | Result |
|---|---|---|
| Grep templates surface | `grep -rn propertyInstructions packages/domain/src/management/templates packages/db/src/management/templates apps/web/modules/templates apps/web/app/api/templates apps/web/app/dashboard/templates` | ✅ 0 matches |
| Domain typecheck | `npm run typecheck --workspace @builders/domain` | ✅ exit 0 |
| Data typecheck | `npm run typecheck --workspace @builders/db` | ✅ exit 0 (after rebuilding `@builders/domain` dist) |
| Application typecheck | `npm run typecheck --workspace @builders/application` | ✅ exit 0 |
| Web — templates-scoped errors | `npm run typecheck --workspace @builders/web 2>&1 \| grep -E "^(modules/templates\|app/api/templates\|app/dashboard/templates)"` | ✅ 0 lines |

**Note on dist rebuild:** Initial DB typecheck failed because `tsc` resolves `@builders/domain` via the published `dist/` folder, not source. Ran `npm run build --workspace @builders/domain` (then `--workspace @builders/db` and `--workspace @builders/application` for downstream consumers) to refresh the type artifacts. After the rebuild all four workspaces typecheck clean within the templates surface.

## Leftover web typecheck errors (NOT templates-related)

Web workspace still has 57 total errors, ALL outside the templates surface:

| Count | Area | Status |
|---|---|---|
| 48 | `modules/work-orders/*` (record + list + controllers) | Deferred — WO sweep cleans these up |
| 5 | `modules/shared/engines/record-view/panel/*` — `Cannot find module '../client/...'` | Pre-existing, unrelated to this cleanup |
| 4 | `app/api/admin/*` + `modules/admin/controller/*` — `SessionUser` type mismatch | Pre-existing, unrelated |

The WO 48-error block is exactly what the user said to expect: "work orders is still filled with errors." None of these errors reference `propertyInstructions`.

## State of working tree

Modified, ready for one commit:
- `packages/domain/src/management/templates/types.ts`
- `packages/domain/src/management/templates/normalizers.ts`
- `packages/domain/src/management/templates/form-rules.ts`
- `packages/db/src/management/templates/read-repository.ts`
- `packages/db/src/management/templates/write-repository.ts`
- `apps/web/app/api/templates/_validators.ts`
- `apps/web/modules/templates/components/record/template-primary-fields-section.tsx`

Built artifacts also changed under `packages/{domain,db,application}/dist/` — these are committed via the existing repo convention (matches recent `21aea69` "schema commit" containing dist).

**Awaiting user approval before `git commit`.** (CLAUDE.md: never commit unless explicitly asked.)

## Open issues

None encountered. Cleanup completed in single pass; only adjustment was rebuilding the `@builders/domain` dist so downstream typechecks could see the updated types — standard workspace mechanic.
