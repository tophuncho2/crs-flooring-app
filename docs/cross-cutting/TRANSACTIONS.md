# Transactions

> **Scope:** Database transaction boundaries, outbox colocaton, rollback guarantees.
> **Location:** `packages/db/src/client.ts`

## Rules

1. Every multi-step mutation runs in an explicit `withDatabaseTransaction()`.
2. The outbox event write is always in the same transaction as the state mutation.
3. No partial writes — if any step fails, the entire transaction rolls back.
4. Transaction clients are propagated via optional `client` parameter on repository and use case functions.
5. Read-only operations do not use transactions.

## Contract

### `withDatabaseTransaction(callback)`

```typescript
async function withDatabaseTransaction<T>(
  callback: (client: Prisma.TransactionClient) => Promise<T>
): Promise<T>
```

Opens a transaction, passes the client to the callback, commits on success, rolls back on failure.

### Transaction Propagation Pattern

```typescript
// Application use case
async function createCategory(input, client?) {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    const record = await insertCategory(c, input)
    await createQueueOutboxEvent(c, { ... })
    return record
  })
}
```

The optional `client` parameter allows callers to compose multiple use cases in a single transaction when needed.

### Outbox Colocation

```
withDatabaseTransaction(async (tx) => {
  // 1. Perform state mutation
  const record = await repository.create(tx, data)

  // 2. Write outbox event (SAME transaction)
  await createQueueOutboxEvent(tx, {
    queue: "sync-inventory",
    payload: { recordId: record.id },
  })

  // Both commit together or both roll back
  return record
})
```

This guarantees that outbox events are only created when the state mutation succeeds.

## Anti-Patterns

1. **Do not** write outbox events outside the mutation transaction — this breaks the delivery guarantee.
2. **Do not** nest `withDatabaseTransaction()` calls — propagate the client instead.
3. **Do not** perform I/O to external services inside a transaction — keep transactions short.
4. **Do not** use transactions for read-only queries — they add unnecessary overhead.
5. **Do not** catch and suppress errors inside a transaction callback — let them propagate for rollback.

## Related Docs

- [../layers/DATA.md](../layers/DATA.md) — persistence layer that uses transactions
- [../layers/APPLICATION.md](../layers/APPLICATION.md) — use cases that open transactions
- [../patterns/OUTBOX_PATTERN.md](../patterns/OUTBOX_PATTERN.md) — outbox event delivery
