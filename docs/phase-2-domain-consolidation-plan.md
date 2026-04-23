# Phase 2 — Domain consolidation: Management Companies + Properties

Both modules end with **zero domain logic under `apps/web/modules/`**. All pure rules live under `packages/domain/src/management/`. Pattern mirrors `packages/domain/src/flooring/contacts/`.

## Current-state inventory (what counts as domain)

### `apps/web/modules/management-companies/`

- `domain/types.ts` — row/detail/form types, `validateManagementCompanyForm`, `toManagementCompanyForm` → **domain**
- `domain/validators.ts`, `domain/services.ts` — one-line re-export shims (`export * from "../validators"` / `"../services"`) → **delete**
- `services.ts` (top-level) — `normalizeManagementCompany`, `normalizeManagementCompanyListRow`, `normalizeManagementCompanyOption`, `normalizeAddress` helper → **domain (pure)**
- `validators.ts` (top-level) — HTTP body parsing (`parseRequiredString`, etc. from `@/server/http/api-helpers`) → **NOT domain** (application layer, Phase 4)
- `data/queries.ts`, `data/mutations.ts` — Prisma → data layer, Phase 3

### `apps/web/modules/properties/`

- `domain/types.ts` — row/form types, `validatePropertyPrimaryForm`, `toPropertyPrimaryForm`, `createPropertyTemplatesRevisionKey` → **domain**
- `domain/validators.ts`, `domain/services.ts` — re-export shims → **delete**
- `services.ts` (top-level) — `normalizeProperty`, `normalizePropertyListRow`, `normalizePropertyOption`, `normalizePropertyAddress` → **domain (pure)**
- `queries.ts`, `mutations.ts` (top-level) — re-export shims of `data/queries.ts` / `data/mutations.ts` → **delete**
- `validators.ts` — HTTP parsing → application layer, Phase 4
- `data/queries.ts`, `data/mutations.ts` → data layer, Phase 3

## Target structure

```
packages/domain/src/management/
├── management-companies/
│   ├── index.ts         barrel
│   ├── types.ts         ManagementCompanyDetail, ...Row, ...Form
│   ├── form-rules.ts    validateManagementCompanyForm, toManagementCompanyForm
│   └── normalizers.ts   normalizeManagementCompany{,ListRow,Option}
└── properties/
    ├── index.ts
    ├── types.ts         PropertyDetailRecord, PropertyPrimaryForm, PropertyTemplateRow, PropertyManagementCompany, PropertyTemplateDraft
    ├── form-rules.ts    validatePropertyPrimaryForm, toPropertyPrimaryForm, createPropertyTemplatesRevisionKey
    └── normalizers.ts   normalizeProperty{,ListRow,Option}
```

Wire both into `packages/domain/src/index.ts`.

## Post-migration schema alignment (done during the move)

Current normalizers/types still reference pre-migration fields. Align to the new schema while moving:

- `templateTag` → `unitType` (type field + normalizer input + all references)
- `_count.serviceItems` dropped — template item count is just `_count.items`
- `createPropertyTemplatesRevisionKey` updates to use the renamed field + simpler count

## Address helper decision

`normalizeAddress` (mgmt-co) and `normalizePropertyAddress` (properties) are byte-for-byte identical. Options:

- **(a) Inline in each module's `normalizers.ts`** — matches current pattern.
- **(b) Extract to `packages/domain/src/shared/address-line.ts`** — `buildAddressLine({ streetAddress, city, state, postalCode })`. Recommended. The existing `shared/address-helpers.ts` has a similar helper but its signature uses `zip` instead of `postalCode`, so not a drop-in.

## Files to delete

**Management companies:** `domain/` folder, `services.ts` (top-level).
**Properties:** `domain/` folder, `services.ts`, `queries.ts`, `mutations.ts` (top-level shims).
**Tests:** everything under `apps/web/tests/modules/management-companies/` and `apps/web/tests/modules/properties/` (per "tests rebuilt later" rule).

## Import repointing (consumers)

Everything below switches from `@/modules/{module}/domain/...` or `@/modules/{module}/services` to `@builders/domain`:

- `apps/web/app/dashboard/management-companies/{page,new/page,[id]/page}.tsx`
- `apps/web/app/api/management-companies/{route,[id]/route}.ts`
- `apps/web/app/dashboard/properties/{page,new/page,[id]/page}.tsx`
- `apps/web/app/api/properties/{route,[id]/route}.ts`
- `apps/web/modules/management-companies/data/{queries,mutations}.ts`
- `apps/web/modules/properties/data/{queries,mutations}.ts`
- `apps/web/modules/*/record/**` components and controllers

## Concerns up front

1. **Build stays red after this phase.** `data/queries.ts` in both modules still reads `templateTag`, `serviceItems`, and the mgmt-co query still selects `padProducts`. The data layer (Phase 3) repoints those to the new schema. The domain package itself will typecheck clean in isolation.
2. **HTTP `validators.ts` stays put** for now — it imports `@/server/http/api-helpers`, can't live in `packages/domain`. Moves to `packages/application` in Phase 4.
3. **Module-directory shape** (`record/**` vs `components/record/**`, `controllers` singular vs plural) is out of scope — that's Phase 6.
4. **Out-of-scope UI leakage:** `apps/web/modules/management-companies/record/panel/sections/management-company-properties-section.tsx` imports from `@/modules/properties` for template-row display types. After the move both read from `@builders/domain` — circular-import risk is zero because everything routes through the package.

## Execution order

1. (If choosing option b) Add `packages/domain/src/shared/address-line.ts`.
2. Create `packages/domain/src/management/management-companies/{types,form-rules,normalizers,index}.ts`.
3. Create `packages/domain/src/management/properties/{types,form-rules,normalizers,index}.ts`.
4. Wire both into `packages/domain/src/index.ts`.
5. `npm run build --workspace @builders/domain` → must be green.
6. Repoint every consumer import.
7. Delete the old `domain/` folders and shim files in both modules.
8. Delete the two stale test directories.
9. Single commit: "Phase 2: extract management-companies + properties domain into @builders/domain".

## Verification

- `npm run typecheck --workspace @builders/domain` green.
- `rg "@/modules/(management-companies|properties)/(domain|services|validators|queries|mutations)"` returns zero hits (except the kept top-level `validators.ts` in each).
- `apps/web` typecheck remains broken (expected) — failures should only be about `templateTag`/`serviceItems`/`padProduct` inside `data/**` and `record/**`, not missing modules.

## Open choice points

- **Address helper:** option (a) inline, or (b) shared `buildAddressLine` (recommended)?
- **Stale tests:** delete all of `tests/modules/management-companies/**` and `tests/modules/properties/**` outright, or leave them and just skip re-running?
