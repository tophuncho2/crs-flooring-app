# Domain — Utilities

> **Source:** `packages/domain/src/shared/`

**Rule:** Every utility here must be pure — plain inputs in, plain outputs out. No I/O, no framework imports, no `Date.now()` / `Math.random()` / environment reads. Anything stateful or impure does not belong in this folder. Legacy helpers that drift from this rule must be flagged and corrected in-place, not worked around.

**Note:** `date-format.ts` uses `new Date(string)` to parse caller-provided timestamps. This is deterministic (output depends only on input) and does not violate the "no `Date.now()` / no non-determinism" rule. Flagged preemptively to avoid false positives in future audits.

Checklist of utilities currently in the domain shared folder, grouped by role.

## Formatters

- [ ] `address-helpers.ts`
- [ ] `date-format.ts`
- [ ] `product-display-name.ts`
- [ ] `numbering.ts`

## Calculators

- [ ] `inventory-allocation-totals.ts`
- [ ] `line-totals.ts`
- [ ] `record-calculation-rows.ts`
- [ ] `record-expense-summary.ts`

## Record helpers

- [ ] `record-sales-reps.ts`
- [ ] `record-summary.ts`
- [ ] `table-preferences.ts`
