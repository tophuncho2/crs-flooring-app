### [packages/db/src/mutation-receipts.ts](packages/db/src/mutation-receipts.ts)
Exports 4 functions + `AppMutationReceiptRecord` type. Thin Prisma wrapper over the `appMutationReceipt` model — all code paths to that model go through this file (no duplication).

### Imports / callers
- **Re-exported** via [packages/db/src/index.ts](packages/db/src/index.ts)
- **One production caller**: [apps/web/server/http/route-policy.ts:2](apps/web/server/http/route-policy.ts#L2) — wraps the raw DB calls into `enforceMutationReceipt` / `finalizeMutationReceipt` helpers
- **Mocked** in 3 test files (templates, work-orders, work-order-allocations)

### Module usage (all via `route-policy`, never direct)

### Flag
`deleteExpiredAppMutationReceipts` is exported but unused — receipts will grow unbounded until a cleanup job is added.