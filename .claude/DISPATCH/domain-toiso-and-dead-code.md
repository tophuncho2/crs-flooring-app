# domain-toiso-and-dead-code — Domain-layer: converge toIsoTimestamp + share the planned-payments validator + delete ~230 LOC of dead code

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/session-new` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode → produce a plan and STOP for approval.
   - AUTO mode → execute the work.
   Either way, research-and-validate BEFORE acting.

Package is `@builders/domain`, root `packages/domain/src/`, barrel `packages/domain/src/index.ts`. Every path below is relative to the repo root unless already absolute.

## Intent for this session
Converge 8 private `toIso*` helpers plus ~25 inline `x instanceof Date ? x.toISOString() : x` copies onto ONE shared `toIsoTimestamp` in `packages/domain/src/shared/date-format.ts` (already barrel-exported), share the verbatim planned-payments positive-money+direction validator across its two clone modules, and delete ~230 LOC of confirmed dead code (whole files, dead types/consts/functions/aliases) plus drop the `export` keyword on internally-reachable-only symbols. "Done" = duplication + dead code gone with **zero behavior change** and the gauntlet green.

## ⚑ Flags — decisions to make / potential gaps

⚑ **1. Shared helper name + null policy.** Add to `packages/domain/src/shared/date-format.ts` (holds only display formatters today: `toStableDate`, `formatStableDate`/`DateTime`, `formatEasternDateTime`, `toDateInputValue`; barrel-exported at `index.ts:18`). The 8 private helpers split into two behaviors: `null→""` vs. no-null. Recommend ONE `toIsoTimestamp(value: Date | string | null): string` returning `""` on null — subsumes both. Name TBD (`toIsoTimestamp` fits the file's mixed `to*`/`format*` naming). Not pre-decided.

⚑ **2. `toExpirationString` subtle variant** (`certificates/normalizers.ts:33`) maps `null → ""` **and** `"" → ""`. A plain null-guard helper returns `""` unchanged, so it's covered — but confirm `computeCertificateStatus("")` semantics are unchanged before converging this site.

⚑ **3. How far to converge the planned-payments clone.** Every file in the two dirs is prefix-only divergent (`index.ts` already byte-identical). Options: (i) full generic share — one parametrized module — but the two prefixes are load-bearing type identities used widely downstream; (ii) share only the prefix-free pieces (validator logic + `toIso` via ⚑1) and leave the named `Row`/`Form`/diff types divergent per module. Recommend (ii). Not pre-decided.

⚑ **4. Validator 3rd site.** `payments/form-rules.ts:10 validatePaymentForm` runs the SAME rule logic (present → `isValidMoneyAmount` → `Number>0`, then direction ∈ {REVENUE, EXPENSE}) but returns `PaymentFormIssue[]` + `describePaymentFormIssue`, NOT a message string. Full convergence needs a return-shape decision. Cheapest win: share only sites 1–2 (verbatim `validateTemplate…`/`validateWorkOrder…PlannedPaymentForm`), leave payments as-is. Not pre-decided.

⚑ **5. `LIST_*_PAGE_SIZE` shared const (LOW).** 13–14 modules carry an identical `=50`/`=200` pair; outliers (`payments` 25/100, `products/indicators` + `inventory/adjustments` max-100-only) break uniformity. Probably NOT worth a shared const — couples unrelated modules. Recommend leaving as-is. Not pre-decided.

⚑ **6. `editability.ts` reversal risk (HIGHEST).** Both `inventory/editability.ts` and `imports/editability.ts` are fully dead, but a **prior pass KEPT them** — the likely cause is that `packages/db` write-repos name-drop the consts in DOC COMMENTS (`packages/db/src/inventory/write-repository.ts:62` → `INVENTORY_EDITABLE_FIELDS`; `packages/db/src/imports/write-repository.ts:52` → `IMPORT_USER_EDITABLE_FIELDS`). Those comments are OUT OF BOUNDS to edit here — but FLAG them so a future pass doesn't re-add the "referenced" consts. Confirm you still want to delete the files.

⚑ **7. Subtle normalizer variant — `undefined` guard.** `work-orders/normalizers.ts:59 toIsoDate` uses `=== null` (so `undefined` is NOT guarded). If the shared helper uses `== null`, behavior on `undefined` changes for work-orders. Verify no caller passes `undefined` for `scheduledFor` before converging that site.

⚑ **8. Dead message constants count.** It's **9, not ~10** — the 10th candidate `TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE` is LIVE (`packages/application/src/work-orders/sync-template-to-work-order.ts:8,47`). Do NOT remove it.

⚑ **9. Staged editability "3 dead members" scope.** Only 3 members (`STAGED_AUTO_FIELDS`, `StagedAutoField`, `StagedParentOwnedField`) are BOTH prod-dead AND test-uncovered. Siblings `isStagedRowQueued`/`isStagedRowMaterialized`/`isStagedUserEditableField`/`STAGED_USER_EDITABLE_FIELDS`/`STAGED_PARENT_OWNED_FIELDS` are prod-dead but COVERED by `packages/domain/tests/imports/staged-inventory-rows/editability.test.ts` — removing them means removing the test too. Confirm scope before touching the test-covered siblings.

## Scope
**In:**
- **Dedup 1 — `toIsoTimestamp`:** add one shared helper to `shared/date-format.ts`; converge the 8 private `toIso*` helpers + ~25 inline copies onto it.
- **Dedup 2 — planned-payments validator:** share the verbatim positive-money+direction validator across `templates/planned-payments` and `work-orders/planned-payments` (per ⚑3/⚑4).
- **Dedup 3 (optional, LOW) — `LIST_*_PAGE_SIZE`:** likely leave as-is (⚑5).
- **Dead code (~230 LOC):** whole files, dead types/consts/functions/aliases/EMPTY-forms listed in the Layer map.
- **Export-hardening:** drop the `export` keyword (KEEP the code) on internally-reachable-only symbols listed in the Layer map.

**Out:**
- Anything outside `packages/domain/src` (and its tests under `packages/domain/tests`).
- **The two write-repo doc-comments that name-drop dead consts are OUT OF BOUNDS to edit:** `packages/db/src/inventory/write-repository.ts:62` and `packages/db/src/imports/write-repository.ts:52`. Flag them for a future pass — do NOT edit any `packages/db` file.

## Files you own (do not edit anything outside this list)

**Dedup 1 — toIsoTimestamp**
- `packages/domain/src/shared/date-format.ts` — add the shared helper here (barrel-exported at `index.ts:18`).
- Private-helper sites: `payments/normalizers.ts`, `work-orders/normalizers.ts`, `work-orders/planned-payments/normalizers.ts`, `templates/planned-payments/normalizers.ts`, `certificates/normalizers.ts`, `users/normalizers.ts`, `invites/normalizers.ts`.
- Inline-copy sites: `work-orders/material-items/normalizers.ts`, `entity-types/normalizers.ts`, `user-activity/normalizers.ts`, `unit-of-measures/normalizers.ts`, `job-types/normalizers.ts`, `properties/normalizers.ts`, `templates/normalizers.ts`, `templates/planned-products/normalizers.ts`, `categories/normalizers.ts`, `entities/normalizers.ts`.

**Dedup 2 — planned-payments validator**
- `templates/planned-payments/rules.ts`, `work-orders/planned-payments/rules.ts` (share sites 1–2); `payments/form-rules.ts` only if ⚑4 chooses full convergence.
- New shared home (per ⚑3): a shared validator (e.g. `shared/…` or a planned-payments-shared file) — pick the home during research.

**Dead code + export-hardening** — all files named in the Layer map below (all under `packages/domain/src/`).

**Tests** — `packages/domain/tests/**` files named in the Domain tests section.

## Layer-by-layer map
Domain — grouped by work item with path:line and the change.

### Work item 1a — toIsoTimestamp (HIGH, clean)
Target dir CONFIRMED: `packages/domain/src/shared/` exists; `date-format.ts` already exists and is barrel-exported at `index.ts:18` but holds only DISPLAY formatters — NO `toIsoTimestamp`-style helper yet. Add one there.

**8 private `toIso*` helpers (2 signatures):**

| # | Site | Symbol | Behavior |
|---|------|--------|----------|
| 1 | `payments/normalizers.ts:34` | `toIso` | `Date\|string\|null` → `null→""` |
| 2 | `work-orders/normalizers.ts:59` | `toIsoDate` | `Date\|string\|null` → `null→""` (uses `===null`, `undefined` NOT guarded — see ⚑7) |
| 3 | `work-orders/planned-payments/normalizers.ts:24` | `toIso` | `Date\|string\|null` → `null→""` |
| 4 | `templates/planned-payments/normalizers.ts:24` | `toIso` | `Date\|string\|null` → `null→""` |
| 5 | `certificates/normalizers.ts:37` | `toIsoString` | `Date\|string` (no null) |
| 6 | `users/normalizers.ts:4` | `toIso` | `Date\|string` (no null) |
| 7 | `invites/normalizers.ts:14` | `toIso` | `Date\|string` (no null) |
| 8 | `certificates/normalizers.ts:33` | `toExpirationString` | `Date\|string\|null` → `null` OR `"" → ""` (**SUBTLE variant** — see ⚑2) |

**~25 inline `x instanceof Date ? x.toISOString() : x` copies across 11 files** (all operate on non-null `createdAt`/`updatedAt` — verbatim convergence, no null path):
`work-orders/material-items/normalizers.ts:30`; `entity-types/normalizers.ts:22,24`; `user-activity/normalizers.ts:15`; `unit-of-measures/normalizers.ts:17,34,35`; `job-types/normalizers.ts:18,19`; `properties/normalizers.ts:79,80,103,104`; `templates/normalizers.ts:76,77`; `templates/planned-products/normalizers.ts:47,48`; `categories/normalizers.ts:27,29`; `entities/normalizers.ts:82,83,106,107`.

Convergence is verbatim for the non-null sites; the `null→""` sites need the shared helper to accept null (per ⚑1).

### Work item 1b — planned-payments clone (~130 LOC)
Two dirs, 6 files each, byte-identical apart from `Template`↔`WorkOrder` prefix (+ comment wording):
`packages/domain/src/templates/planned-payments/{column-limits,diff-rules,index,normalizers,rules,types}.ts`
vs. `packages/domain/src/work-orders/planned-payments/{...}.ts`.
`index.ts` is IDENTICAL (0 diff); `column-limits`/`diff-rules`/`normalizers`/`rules`/`types` are prefix-only divergent.

**Positive-money+direction validator — 3 sites:**
- `templates/planned-payments/rules.ts:7 validateTemplatePlannedPaymentForm` — returns `""`|message.
- `work-orders/planned-payments/rules.ts:7 validateWorkOrderPlannedPaymentForm` — VERBATIM identical to template.
- `payments/form-rules.ts:10 validatePaymentForm` — SAME rule logic (present → `isValidMoneyAmount` → `Number>0`, then direction ∈ {REVENUE, EXPENSE}) but DIFFERENT return shape (`PaymentFormIssue[]` + `describePaymentFormIssue`, not a message string).

Sites 1–2 share verbatim; site 3 is the conceptual ancestor with a divergent contract (⚑4). Recommend pulling the validator into a shared `validatePositiveMoneyDirectionForm` for sites 1–2 and leaving the named types divergent per module (⚑3).

### Work item 1c — LOW: LIST_*_PAGE_SIZE
Standard pair = `50`/`200`. 13–14 modules carry the identical pair in `list-config.ts`: warehouses, products, payment-purposes, entity-types, user-activity, certificates, imports, unit-of-measures, job-types, properties, inventory, users, templates, categories, entities — plus `invites/types.ts:41-42` (invites keeps them in `types.ts`, NOT `list-config.ts`). **Outliers to LEAVE:** `payments/list-config.ts:6-7` (25/100), `products/indicators/list-config.ts:7` and `inventory/adjustments/list-config.ts:5` (max 100 only). Recommend NOT extracting (⚑5).

### Work item 2 — DEAD CODE (~230 LOC)

**`editability.ts` files — CONFIRMED dead (reversal-risk, see ⚑6):**
- `packages/domain/src/inventory/editability.ts` — WHOLE FILE (1–42). All 7 symbols 0 code refs: `INVENTORY_IMMUTABLE_FIELDS`, `INVENTORY_EDITABLE_FIELDS`, `INVENTORY_TRANSACTIONAL_FIELDS`, `isInventoryFieldEditable`/`Immutable`/`Transactional`, `buildInventoryFieldNotEditableMessage`. Only hit = doc-comment mention of `INVENTORY_EDITABLE_FIELDS` in `packages/db/src/inventory/write-repository.ts:62` (comment, not import — OUT OF BOUNDS; flag).
- `packages/domain/src/imports/editability.ts` — WHOLE FILE (1–20). All 5 symbols dead. Only hit = doc-comment mention of `IMPORT_USER_EDITABLE_FIELDS` in `packages/db/src/imports/write-repository.ts:52` (comment — OUT OF BOUNDS; flag).
- Remove any barrel re-exports of these files from `index.ts` too.

**Whole file — pending-mutation-rules:**
- `packages/domain/src/products/indicators/rules/pending-mutation-rules.ts` — sole export `assertIndicatorExpectedUpdatedAtMatches`, 0 refs. Barrel re-export `packages/domain/src/products/indicators/index.ts:7` (`export *`) MUST be dropped too.

**12 dead diff-rule aliases** (all `export type`, only at definition; sibling `...Diff = SectionDiff<...>` uses the `Form` types directly; external `*Update` hits are Prisma-generated substring collisions in `packages/db/src/generated`, verified non-imports):
- `work-orders/material-items/diff-rules.ts:7,12,17` — `WorkOrderMaterialItemDraft`/`Update`/`Delete`
- `work-orders/planned-payments/diff-rules.ts:4,9,14` — `WorkOrderPlannedPaymentDraft`/`Update`/`Delete`
- `templates/planned-products/diff-rules.ts:4,9,14` — `TemplatePlannedProductDraft`/`Update`/`Delete`
- `templates/planned-payments/diff-rules.ts:4,9,14` — `TemplatePlannedPaymentDraft`/`Update`/`Delete`
- ⚠️ `staged-inventory-rows` / `staged-inventory-filter-rows` diff `Draft`/`Update`/`Delete` are LIVE — do NOT touch.

**4 dead `EMPTY_*_FORM`** (only definition line):
- `work-orders/planned-payments/types.ts:42` `EMPTY_WORK_ORDER_PLANNED_PAYMENT_FORM`
- `imports/staged-inventory-rows/types.ts:44` `EMPTY_STAGED_INVENTORY_FORM`
- `templates/planned-products/types.ts:47` `EMPTY_TEMPLATE_PLANNED_PRODUCT_FORM`
- `templates/planned-payments/types.ts:42` `EMPTY_TEMPLATE_PLANNED_PAYMENT_FORM`

**4 numbering fossils** — `packages/domain/src/shared/numbering.ts` (`computeNextNumber` is LIVE+tested, KEEP):
- `:5` `isValidRafterLevel`, `:9` `formatWarehouseLabel`, `:13` `formatSectionLabel`, `:17` `formatLocationLabel` — all 0 refs.

**~8 dead functions** (each only at definition, 0 code+test refs):
- `shared/line-totals.ts:17` `formatLineTotal`
- `products/product-rules.ts:46` `isProductNameConflict`
- `templates/delete-rules.ts:6` `isTemplateDeleteBlocked` (WHOLE FILE — just this always-false fn)
- `work-orders/delete-rules.ts:3` `isWorkOrderDeleteBlocked` (WHOLE FILE, always-false)
- `inventory/computed.ts:35` `buildInventoryOversoldMessage`
- 3 `to*Form` mappers: `products/indicators/types.ts:96` `toInventoryIndicatorUpdateForm`; `imports/staged-inventory-filter-rows/types.ts:35` `toStagedInventoryFilterForm`; `imports/staged-inventory-rows/types.ts:55` `toStagedInventoryForm` (the other 14 `to*Form` mappers are LIVE — leave them).

**7 dead types** (0 refs but definition):
- `work-orders/file-generation/print-presets.ts:30` `WorkOrderDocumentLabel`
- `products/indicators/types.ts:7` `IndicatorRowUnit`
- `products/indicators/types.ts:61` `InventoryIndicatorDetail`
- `certificates/file-rules.ts:20` `CertificateFileContentType`
- `properties/types.ts:90` `PropertyTemplateDraft`
- `invites/types.ts:54` `CreateInvitePayload`
- `categories/types.ts:1` `CategoryMeta`

**9 dead message constants** (only definition, 0 refs incl tests — see ⚑8):
- `payments/error-messages.ts:2` `PAYMENT_VALIDATION_FAILED_MESSAGE`, `:3` `PAYMENT_STALE_MESSAGE`
- `invites/error-messages.ts:3` `INVITE_EMAIL_REQUIRED_MESSAGE`, `:4` `INVITE_NOT_FOUND_MESSAGE`
- `templates/error-messages.ts:4` `TEMPLATE_PLANNED_PRODUCT_PRODUCT_REQUIRED_MESSAGE`, `:5` `TEMPLATE_PLANNED_PRODUCT_QUANTITY_INVALID_MESSAGE`
- `work-orders/error-messages.ts:1` `WORK_ORDER_VACANCY_INVALID_MESSAGE`, `:2` `WORK_ORDER_VACANCY_REQUIRED_MESSAGE`, `:4` `WORK_ORDER_INVENTORY_ADJUSTMENT_WRITE_FAILED_MESSAGE`
- ⚠️ `TEMPLATE_SYNC_TEMPLATE_NOT_FOUND_MESSAGE` is LIVE (`packages/application/src/work-orders/sync-template-to-work-order.ts:8,47`) — do NOT remove.

**3 dead members in `imports/staged-inventory-rows/editability.ts`** (no code use AND no test coverage — see ⚑9):
- `:77` `STAGED_AUTO_FIELDS`, `:86` `StagedAutoField`, `:85` `StagedParentOwnedField`.
- CAVEAT: `isStagedRowQueued`(`:13`), `isStagedRowMaterialized`(`:19`), `isStagedUserEditableField`(`:88`), `STAGED_USER_EDITABLE_FIELDS`(`:58`), `STAGED_PARENT_OWNED_FIELDS`(`:67`) have NO production use but ARE covered by `packages/domain/tests/imports/staged-inventory-rows/editability.test.ts` — test-only-live, NOT part of the "3 dead members." Removing them means removing the test too.

### Work item 3 — Export-hardening (drop `export`, KEEP code — 0 cross-package + 0 domain-test refs)

**6 `describe*Issue` (singular; each called by its LIVE plural `describe*Issues` sibling in the same file):**
- `payments/form-rules.ts:29` `describePaymentFormIssue`
- `products/indicators/rules/form-rules.ts:44` `describeIndicatorFormIssue`
- `imports/staged-inventory-filter-rows/form-rules.ts:31` `describeStagedInventoryFilterValidationIssue`
- `imports/staged-inventory-rows/form-rules.ts:58` `describeStagedInventoryValidationIssue`
- `imports/staged-inventory-rows/diff/types.ts:46` `describeStagedInventoryRowDiffIssue`
- `inventory/adjustments/rules/form-rules.ts:28` `describeAdjustmentFormIssue`

**3 `*FormIssue` types (used only internally):**
- `payments/form-rules.ts:4` `PaymentFormIssue`
- `products/indicators/rules/form-rules.ts:7` `IndicatorFormIssue`
- `inventory/adjustments/rules/form-rules.ts:3` `AdjustmentFormIssue`

Verify each has no barrel re-export in `index.ts` before dropping `export`; if it does, remove that re-export line too.

### Domain tests touching the slice
- `packages/domain/tests/templates/planned-payments.test.ts` + `packages/domain/tests/work-orders/planned-payments.test.ts` — clone-pair; exercise normalizers + the dup validator. Follow whatever share is chosen (⚑3/⚑4). (WO validator's form seed carries extra `notes:""`, `entityId:null` — trivial.)
- `packages/domain/tests/imports/staged-inventory-rows/editability.test.ts` — covers staged editability members (see ⚑9 caveat).
- `packages/domain/tests/shared/numbering.test.ts` — tests ONLY `computeNextNumber`; the 4 fossils are untested → clean removal.
- Normalizer tests asserting ISO output (exercise the shared `toIsoTimestamp` after convergence): `packages/domain/tests/{payments,work-orders,templates,entities,job-types,properties}/normalizers.test.ts`.
- No test references the 8 dead functions, the pending-mutation-rules export, the 9 dead message consts, the 7 dead types, the 4 EMPTY forms, the `editability.ts` symbols, or the export-hardening symbols.

## Migration (if schema changes)
None — no schema change.

## Done means
- `/check-gauntlet` green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
