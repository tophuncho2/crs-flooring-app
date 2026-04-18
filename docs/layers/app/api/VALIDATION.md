# Validation

> **Scope:** Shared validation infrastructure, input parsing conventions, and schema reuse.
> **Location:** `apps/web/server/http/api-helpers.ts`, `apps/web/modules/{mod}/validators.ts`
> **Grade: B-** — Consistent hand-rolled validators with strong naming conventions, but no client/server schema reuse.

## Rules

1. Validation is **hand-rolled TypeScript functions**, not a schema library. Zod is installed but used only for queue message schemas in `packages/domain/`.
2. Every module that accepts mutations must have a `validators.ts` (or `domain/validators.ts` re-exported from `validators.ts`).
3. Validators export typed input interfaces (`CreateXInput`, `UpdateXInput`) and corresponding `validateCreateXInput()` / `validateUpdateXInput()` functions.
4. Validators throw `AppError` on failure — never return error strings or booleans. Each error includes `message` and `field`.
5. Update validators use `if ("fieldName" in body)` to support partial updates — only present fields are validated.
6. Optional fields resolve to `null` when missing or empty, never `undefined`.

## Contract

### Parsing Primitives

Located in `apps/web/server/http/api-helpers.ts`:

| Function | Purpose |
|----------|---------|
| `parseRequiredString(value, field)` | Non-empty string or throw |
| `parseOptionalString(value)` | String or null |
| `parseOptionalStateAbbreviation(value)` | Normalized 2-letter state code or null |
| `parseBoolean(value, field)` | Strict boolean or throw |
| `parseDecimal(value, field, scale?)` | Decimal with precision validation |
| `parseDecimalOrDefault(value, default, scale?)` | Decimal with fallback |
| `parseUuidParam(value, field)` | UUID regex validation |

### Business Logic Validators

Located in `apps/web/modules/shared/engines/record-view/contracts/child-item-validation.ts`:

| Function | Purpose |
|----------|---------|
| `requirePositiveDecimal(value, field)` | Must be > 0 |
| `requireNonNegativeDecimal(value, field)` | Must be >= 0 |
| `requireServiceNameWhenCustom(type, name)` | Conditional required field |

### Validator Structure

```typescript
// apps/web/modules/{mod}/validators.ts

export type CreateProductInput = {
  name: string
  categoryId: string
  // ...
}

export function validateCreateProductInput(body: unknown): CreateProductInput {
  const data = asRecord(body)
  return {
    name: parseRequiredString(data.name, "name"),
    categoryId: parseUuidParam(data.categoryId, "categoryId"),
    // ...
  }
}
```

### Route Integration

Validators plug into the mutation envelope via `parseMutationEnvelope()`:

```typescript
const { input, mutation } = parseMutationEnvelope(body, validateCreateProductInput)
```

This extracts the idempotency key and `expectedUpdatedAt` from the envelope, then passes the nested payload to the validator.

## Patterns

- **Modules with validators:** work-orders, products, contacts, management-companies, properties, manufacturers, templates, categories, services, warehouses.
- **Combinator pattern:** Templates use a generic `parseSectionRowInput<TItem>()` function that accepts a per-item parser — used for material and service line items.
- **Array defaults:** Arrays default to `[]` rather than throwing when missing.
- **Decimal handling:** All monetary/quantity fields use `parseDecimal()` with explicit scale, preserving string representation for precision.

## Anti-Patterns

1. **Do not** use Zod for route-level validation. The codebase convention is hand-rolled validators with `AppError` throws.
2. **Do not** return error strings from validators. Always throw `createAppError(message, { field })`.
3. **Do not** use `undefined` for absent optional fields. Return `null`.
4. **Do not** validate fields not present in the request body during updates — check `if ("field" in body)` first.
5. **Do not** duplicate parsing logic. Use the shared primitives from `api-helpers.ts`.

## Gaps

- **No client/server schema reuse.** Validators run server-side only. Client forms perform their own ad-hoc validation (e.g., `validateManufacturerForm()` returns strings instead of throwing).
- **No unified error message catalog.** Error messages are defined inline in each validator.
- **Zod is underutilized.** Installed as a dependency but only used for queue schemas. Could unify validation if adopted more broadly.

## Related Docs

- [ROUTE_POLICY.md](../../../server/ROUTE_POLICY.md) — `parseMutationEnvelope()` wiring
- [ERROR_HANDLING.md](../../application/ERROR_HANDLING.md) — `AppError` shape and classification
- [EXECUTION_ENGINE.md](../../../execution-patterns/EXECUTION_ENGINE.md) — where validation sits in the 9-step sequence
