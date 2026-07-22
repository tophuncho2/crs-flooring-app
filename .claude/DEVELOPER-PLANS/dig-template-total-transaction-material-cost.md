# DIG — `totalTransaction` money column + Material Cost relocated to primary section

_Date: 2026-07-22 · Branch: dev-1 · Commits: `56072abcb` (Task 1), `ecab15c85` (Task 2)_

## Audit surface
- **16 files**, all committed, working tree clean
- Layers touched: schema · domain · data · api · module-dir · tests
- Focus: manual money column on Template parent + Material Cost rollup moved out of products section into the primary section

## Clean
- **Wire contract intact** — `totalTransaction` name identical across all links: `TemplateForm` → whole-form PATCH/POST → `validateCreate/UpdateTemplateInput` → use-case input → `CreateTemplateRecordInput` → `toMoney` fold → column. Read path: `select → normalizeTemplateListRow → TemplateListRow → toTemplateForm → draft → MoneyCell`.
- **Relocation left zero residue** — no `materialCost`/`formatMoney`/`sum…` refs remain in `template-products-section.tsx` or its controller (net diff for both is 0).
- **Record-panel map correct** — `TemplatePlannedProductRow` has `quantity` (`:7`) + `productCost` (`:20`); `materialCost` map won't yield `""`/NaN.
- **Primary dirty-detection covers it** — `toTemplateForm` seeds `totalTransaction`, so the shallow form diff marks/clears dirty correctly (no separate revision key needed, unlike the products section).
- **Layer boundaries OK** — `write-repository.ts` imports only the pure `normalizeMoneyAmount` from `@builders/domain` (allowed carve-out), not a throwing `validate*`/`is*` rule.
- **Schema↔migration parity** — migration `20260722120000_add_template_total_transaction` present + applied.
- **WO sync isolation** — `sync-template-to-work-order.ts` never references `totalTransaction`; not carried to work orders (matches `planned_product.cost` precedent).
- **Validation at execution** — domain/db/application builds clean (Prisma client regenerated) · web typecheck 0 errors · 55 tests pass (24 domain+app, 31 web templates).

## Hanging
### ⚠️ The write-repo `toMoney` fold is untested
- **Where:** `packages/db/src/templates/write-repository.ts` (create fold + update skip-when-absent conditional)
- **Why it matters:** the only genuinely-new branching logic. App tests assert the use case passes the raw string through (repo mocked), so `""→null` and the `undefined ? {} : …` skip are uncovered. Regression risk = blank saved as `""` → Prisma Decimal error, or a partial patch wiping the value.
- **Action:** defer explicitly, or add a small db-layer test. (Sibling service-items `toMoney` also has no test, so this matches existing coverage — but the gap is real.)

### ⚠️ `totalTransaction` fetched on every list query but nothing renders it
- **Where:** `read-repository.ts` `templateListSelect` + `TemplateListRow`
- **Why it matters:** list-ready by design (column UI coming), but until then it's a wasted column fetch. Intentional.

## Things to know for testing
- **Material Cost = last-saved planned products, not live edits** (by design). Edit a planned-product quantity → Material Cost won't move until you **Save the products section** (which republishes the record). Not a bug.
- **Material Cost shows "$0.00" on the create flow** — block renders unconditionally (no products can exist pre-creation). Gating it on `detail` is a one-liner if undesired.
- **Clearing a saved value** → should persist NULL. Worth a targeted test (exercises the `""→null` fold that has no automated coverage).

## Open threads
- **List-column UI** (column def / sort / export for `totalTransaction`) — flagged follow-on. Read side ready; UI not built.
- **Deferred, untouched:** tax booleans on planned products + service items; service-item type → FK.

## Recommendation
- **Address now:** nothing blocking. Optionally add the `toMoney` db-test before promotion (or defer explicitly).
- **Safe to continue:** yes — prioritize *clear-a-value → NULL* and *save-products → Material Cost updates* paths when testing.
