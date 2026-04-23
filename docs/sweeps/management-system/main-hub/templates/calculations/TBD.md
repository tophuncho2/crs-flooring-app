# Templates — Current Calculations

All arithmetic is delegated to shared domain helpers in `packages/domain/src/shared/`. Templates wrappers live in `apps/web/modules/templates/`.

## Line Items
- [ ] Line total — `quantity × unitPrice` — `packages/domain/src/shared/line-totals.ts:11` (`calculateLineTotal`)
- [ ] Material subtotal — sum of material line totals — `packages/domain/src/shared/line-totals.ts:23` (`sumLineTotals`)
- [ ] Service subtotal — sum of service line totals — `packages/domain/src/shared/line-totals.ts:23` (`sumLineTotals`)

## Summary
- [ ] Grand total — `materialTotal + serviceTotal` — `packages/domain/src/shared/record-summary.ts:27` (`buildRecordSummary`)
- [ ] Item counts — `materialItemsCount + serviceItemsCount` — `packages/domain/src/shared/record-summary.ts:24` (`buildRecordSummary`)

## Expenses & Margin
- [ ] Sales rep expense — `sum(customerCost × percent / 100)` per rep — `packages/domain/src/shared/record-expense-summary.ts:22` (`calculateRecordSalesRepExpense`)
- [ ] Total expenses — `materialTotal + serviceTotal + salesRepExpense` — `packages/domain/src/shared/record-expense-summary.ts:35` (`calculateRecordExpenseSummary`)
- [ ] Profit — `customerCost − expenses` — `packages/domain/src/shared/record-expense-summary.ts:36` (`calculateRecordExpenseSummary`)
- [ ] Profit margin % — `profit / customerCost` (0 if `customerCost = 0`) — `packages/domain/src/shared/record-expense-summary.ts:37` (`calculateRecordExpenseSummary`)

## Templates Wrappers
- [ ] `calculateTemplateTotal()` wraps `buildRecordSummary()` — `apps/web/modules/templates/services.ts:19`
- [ ] Expense/sales rep passthrough — `apps/web/modules/templates/domain/expense-summary.ts`
