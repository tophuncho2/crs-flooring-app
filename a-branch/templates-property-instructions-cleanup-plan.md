# Plan — Templates Cleanup: Strip `propertyInstructions` From All Layers

Status: **PENDING APPROVAL.** Successor to the schema-drop commit. Brings the templates module fully back to life with `propertyInstructions` removed from every layer (domain → data → API → UI). Work-orders scaffolding is intentionally **NOT touched** — it will be addressed in the work-orders sweep that follows.

## Context

- Schema commit landed: `propertyInstructions` columns dropped from `flooring_template` + `flooring_work_order` tables, applied to Railway staging.
- Build is currently broken because TS still references the dropped fields in 13 source files (8 templates + 5 WO scaffolding).
- This plan fixes only the **8 templates files**. The remaining 5 WO files will continue to error — that's expected and acceptable until the WO sweep starts.
- No application-layer template code references the field (confirmed via grep — `CreateTemplateUseCaseInput` is just an alias of `CreateTemplateRecordInput`, so the data-layer change propagates through automatically).

## Goal

After this plan executes:
- Zero `propertyInstructions` references anywhere in the templates surface (domain types, normalizers, form-rules, db read/write repos, API validators, primary-fields UI section, smoke page).
- Templates layer typechecks cleanly when filtered to templates-only paths.
- API request payload no longer carries the field on either inbound (validator drops it) or outbound (form type drops it).
- Templates record view UI no longer renders the textarea row.

## Files to edit (8)

### Domain (3 files)

| File | Lines | Change |
|---|---|---|
| `packages/domain/src/management/templates/types.ts` | 23, 42, 54 | Drop `propertyInstructions: string` from `TemplateDetail`. Drop `propertyInstructions: string` from `TemplateForm`. Drop `propertyInstructions: ""` from `EMPTY_TEMPLATE_FORM`. |
| `packages/domain/src/management/templates/normalizers.ts` | 25, 56 | Drop `propertyInstructions: string \| null` from `TemplateDetailInput`. Drop `propertyInstructions: template.propertyInstructions ?? ""` from `normalizeTemplate` return body. |
| `packages/domain/src/management/templates/form-rules.ts` | 18 | Drop `propertyInstructions: template.propertyInstructions` from `toTemplateForm` mapping. |

### Data (2 files)

| File | Lines | Change |
|---|---|---|
| `packages/db/src/management/templates/read-repository.ts` | 47 | Drop `propertyInstructions: true` from `templateDetailSelect`. |
| `packages/db/src/management/templates/write-repository.ts` | 15, 35 | Drop `propertyInstructions?: string \| null` from `CreateTemplateRecordInput`. Drop `propertyInstructions: true` from `templateDetailSelect`. (`UpdateTemplateRecordInput` is `Partial<CreateTemplateRecordInput>` — inherits the drop.) |

### Application (0 files)

Nothing to edit. `CreateTemplateUseCaseInput = CreateTemplateRecordInput` and `UpdateTemplateUseCaseInput = UpdateTemplateRecordInput` are pure aliases ([packages/application/src/management/templates/types.ts:4-5](packages/application/src/management/templates/types.ts:4)). The change propagates from the data layer.

### API (1 file)

| File | Lines | Change |
|---|---|---|
| `apps/web/app/api/templates/_validators.ts` | 57, 74 | Drop `propertyInstructions: optionalText(body.propertyInstructions)` from `validateCreateTemplateInput`. Drop the `if ("propertyInstructions" in body) input.propertyInstructions = ...` branch from `validateUpdateTemplateInput`. After this, the inbound payload silently ignores the field if a stale client sends it. |

### UI (1 file)

| File | Lines | Change |
|---|---|---|
| `apps/web/modules/templates/components/record/template-primary-fields-section.tsx` | 113–123 | Delete the entire "Row 4: Property Instructions" `<CellAt col={1} row={4} colSpan={8}>` block including the `<FormField label="Property Instructions">` wrapper and the `<TextareaCell>`. The grid row is freed up. (No replacement lookup cell — that lands in a later sweep.) |

### Smoke fixture (1 file)

| File | Lines | Change |
|---|---|---|
| `apps/web/app/components-smoke/page.tsx` | 243, 695 | Delete the `useState("Notify Bluepoint…")` hook and the textarea block that renders `value={propertyInstructions}`. Smoke page is mock-only, no functional impact. |

### Module data (0 files)

`apps/web/modules/templates/data/mutations.ts` has no direct reference. The mutation payload is typed via `TemplateForm`; once `TemplateForm` drops the field, the outbound JSON drops it too. Confirmed via grep — no edits needed.

## Verification

Run **after** all edits land. Two gates: (1) templates-surface grep must be empty; (2) templates-scoped typecheck errors must be zero.

### Gate 1 — Grep

```
grep -rn "propertyInstructions" \
  packages/domain/src/management/templates \
  packages/db/src/management/templates \
  apps/web/modules/templates \
  apps/web/app/api/templates \
  apps/web/app/dashboard/templates \
  apps/web/app/components-smoke \
  --include="*.ts" --include="*.tsx"
```

**Expected: zero output.** Any match means the cleanup missed a reference.

### Gate 2 — Scoped typecheck

The packages still error overall because of the WO scaffolding leftovers. Templates is "back to life" when filtered errors are zero in each of the four scopes:

| Scope | Filter | Expected |
|---|---|---|
| Domain — templates | `npm run typecheck --workspace @builders/domain 2>&1 \| grep -E "^packages/domain/src/management/templates"` | 0 lines |
| Data — templates | `npm run typecheck --workspace @builders/db 2>&1 \| grep -E "^packages/db/src/management/templates"` | 0 lines |
| Application — templates | `npm run typecheck --workspace @builders/application 2>&1 \| grep -E "templates/"` | 0 lines |
| Web — templates surface | `npm run typecheck --workspace @builders/web 2>&1 \| grep -E "^(apps/web/modules/templates\|apps/web/app/api/templates\|apps/web/app/dashboard/templates\|apps/web/app/components-smoke)"` | 0 lines |

The remaining WO errors (in `packages/domain/src/flooring/work-orders/*` and `packages/db/src/flooring/work-orders/*`) are **expected** — log them as the leftover surface for the WO sweep.

### Gate 3 — Runtime sanity (optional)

`npm run dev --workspace @builders/web` should start without crashing on the templates dashboard route. Visit `/dashboard/templates`, open a record view, confirm the primary section renders without the Property Instructions row, and confirm a section save round-trips cleanly (PATCH body has no `propertyInstructions`, server accepts).

## Out of scope (explicit)

| Item | Why deferred |
|---|---|
| Work-orders scaffolding files (`packages/domain/src/flooring/work-orders/{types,normalizers,form-rules}.ts`, `packages/db/src/flooring/work-orders/{shared,write-repository}.ts`) | Per user direction: WO is "filled with errors" already and will be rewritten layer-by-layer in the upcoming WO sweep. Wiping `propertyInstructions` from these stubs is wasted work. The WO sweep starts from these files anyway. |
| Adding the readonly `Property → instructions` lookup cell to the templates record view | Belongs to a later templates polish sweep, per the locked decision. |
| Expanding `templateDetailSelect` to include `property: { select: { instructions: true } }` | Same — defer until the lookup cell sweep, per Q1=B from the schema-drop plan. |
| Any work-orders cleanup or sweep work | Separate plan after templates is green. |

## Risk + rollback

| Risk | Mitigation |
|---|---|
| A reference is missed and the templates UI silently breaks at runtime | Gate 1 (grep) catches it. Gate 3 (dev server visit) catches anything grep misses (e.g. dynamic property access). |
| Stale frontend client posts the field after deploy | Validator silently drops unknown keys (`optionalText` is no longer wired to read it). No 500. Just a payload-shape mismatch on the next mutation save with a stale tab open — refresh resolves. |
| Data-layer `Prisma.create({ data: input })` rejects unknown key | The field is removed from `CreateTemplateRecordInput`, so the type system blocks any caller from passing it. Even if it leaks through `as any`, Prisma's strict mode would throw a runtime error — caught at Gate 3. |

## Commit shape

Single commit. Title suggestion: `chore(templates): drop propertyInstructions from domain/data/api/ui`. CLAUDE.md is satisfied — schema commit was its own commit (already landed), this is the matching code cleanup.

## Open questions

| # | Question |
|---|---|
| 1 | Confirm: smoke page (`components-smoke/page.tsx`) — fully delete the textarea block per Q2=A from the prior plan, or scope this commit to only the production code path and handle the smoke page in a separate follow-up? My lean: same commit (Q2=A applies). |
| 2 | The deleted UI textarea was on its own grid row (row 4). Should the rows below renumber (Template Notes moves from row 5 → row 4) or leave the gap? My lean: **renumber** — empty row indices read as a bug to the next person. |

## Sequence after this plan executes

```
✅ Schema commit — propertyInstructions columns dropped (already landed)
👉 This plan — templates cleanup (single commit)
   Sweep 7 — work orders module (full sweep, starts with WO scaffolding cleanup as part of layer 7a)
```
