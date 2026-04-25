# Audit Report — Cut Logs (domain + data)

## 1. Domain layer — `packages/domain/src/flooring/inventory/cut-logs/`

### 1.1 Per-file inventory

| File | Lines | Purpose |
|---|---|---|
| `types.ts` | 21 | Defines `CUT_LOG_STATUS_VALUES` literal tuple, `CutLogStatus` derived literal union, and `CutLogRow` denormalized read shape. |
| `editability.ts` | 61 | Field-split constants by who's allowed to write each column (pending-user, void toggle, transactional, worker, linkage, auto) plus two type guards. |
| `errors.ts` | 23 | `CutLogDomainError` class with `code: CutLogDomainErrorCode` literal union + optional `detail: Record<string, unknown>` payload. |
| `cut-log-rules.ts` | 220 | Lifecycle predicates + asserts (status guard, arithmetic invariant, "must be most recent" delete rule, user-transition allowlist, linkage symmetry, void-status consistency, finalize readiness, pending-input gate) + `VoidedCutLogPatch` type and builder. |
| `category-math.ts` | 14 | Single function `computeCutCoverage` delegating to `convertStockToCoverage` from the categories module. |
| `index.ts` | 5 | Barrel re-exports of all five sibling files via `export *`. |

Named exports per file:

- `types.ts`: `CUT_LOG_STATUS_VALUES`, `CutLogStatus`, `CutLogRow`
- `editability.ts`: `CUT_LOG_PENDING_USER_EDITABLE_FIELDS`, `CUT_LOG_VOID_TOGGLE_FIELD`, `CUT_LOG_TRANSACTIONAL_FIELDS`, `CUT_LOG_WORKER_FIELDS`, `CUT_LOG_LINKAGE_FIELDS`, `CUT_LOG_AUTO_FIELDS`, `CutLogPendingUserEditableField`, `CutLogTransactionalField`, `CutLogWorkerField`, `CutLogLinkageField`, `CutLogAutoField`, `isCutLogPendingUserEditableField`, `isCutLogWorkerField`
- `errors.ts`: `CutLogDomainErrorCode`, `CutLogDomainError`
- `cut-log-rules.ts`: `isCutLogStatus`, `formatCutLogStatus`, `assertBeforeCutAfterInvariant`, `assertCanAddCutLog`, `isCutLogMostRecent`, `assertCutLogDeleteAllowed`, `CutLogUserTransition`, `isCutLogUserTransitionAllowed`, `assertCutLogUserTransition`, `assertCutLogLinkageSymmetry`, `VoidedCutLogPatch`, `buildVoidedCutLogPatch`, `assertCutLogVoidStatusConsistency`, `assertCutLogReadyToFinalize`, `assertCutLogPendingSaveInputAllowed`
- `category-math.ts`: `computeCutCoverage`

External imports (non-local):

- `cut-log-rules.ts` → `./editability.js`, `./errors.js`, `./types.js` (all sibling-local)
- `category-math.ts` → `../../categories/conversions.js` (`convertStockToCoverage`), `../../categories/types.js` (type `CategoryMeta`)
- `editability.ts`, `errors.ts`, `types.ts`, `index.ts`: no external imports

No `@prisma/client` imports anywhere in the domain layer (matching domain CLAUDE.md rule).

### 1.2 Cross-module domain imports

- `category-math.ts:1` → `../../categories/conversions.js` (function `convertStockToCoverage`)
- `category-math.ts:2` → `../../categories/types.js` (type `CategoryMeta`)

No imports from `inventory/computed.ts`, `inventory/formatters.ts`, or any inventory-parent file. Cut logs is self-contained domain-side except for the categories dependency.

---

## 2. Data layer — `packages/db/src/flooring/inventory/cut-logs/`

### 2.1 Per-file inventory

| File | Lines | Purpose |
|---|---|---|
| `shared.ts` | 26 | `CutLogDbClient` type alias, `cutLogRowSelect` Prisma select const (16 columns, includes `void` and `status`), and `CutLogRowPayload` `GetPayload` type. |
| `read-repository.ts` | 64 | `normalizeCutLogRow` (with runtime `isCutLogStatus` guard fallback to `"PENDING"`), `getCutLogById`, `listCutLogsByInventoryId`. |
| `write-repository.ts` | 191 | Five mutation primitives: `createCutLogRecord`, `updateCutLogPending`, `voidCutLogRecord`, `finalizeCutLogRecord`, `deleteCutLogRecordById`. Three input types: `CreateCutLogRecordInput`, `UpdateCutLogPendingInput`, `FinalizeCutLogRecordInput`. |
| `index.ts` | 3 | Barrel — `shared`, `read-repository`, `write-repository`. |

Named exports per file:

- `shared.ts`: `CutLogDbClient`, `cutLogRowSelect`, `CutLogRowPayload`
- `read-repository.ts`: `CutLogRecord`, `normalizeCutLogRow`, `getCutLogById`, `listCutLogsByInventoryId`
- `write-repository.ts`: `CreateCutLogRecordInput`, `UpdateCutLogPendingInput`, `FinalizeCutLogRecordInput`, `createCutLogRecord`, `updateCutLogPending`, `voidCutLogRecord`, `finalizeCutLogRecord`, `deleteCutLogRecordById`

External imports (non-local):

- `shared.ts`: `@prisma/client` (`Prisma`, `PrismaClient`)
- `read-repository.ts`: `@builders/domain` (`isCutLogStatus`, `CutLogRow`, `CutLogStatus` types); `../../../client.js` (`db`); `./shared.js`
- `write-repository.ts`: `@prisma/client` (`Prisma`); `@builders/domain` (`assertCutLogLinkageSymmetry`, `buildVoidedCutLogPatch`); `../../../client.js` (`db`); `./read-repository.js` (`getCutLogById`, `CutLogRecord`); `./shared.js` (`CutLogDbClient`)

### 2.2 Cross-module imports

- Cut-log data layer imports domain helpers `isCutLogStatus`, `assertCutLogLinkageSymmetry`, `buildVoidedCutLogPatch` from `@builders/domain`. The `assertCutLogLinkageSymmetry` call inside `createCutLogRecord` (write-repository.ts:70) **throws** during a data-layer write — this is a domain rule executing inside a repository function (audit observation, no judgment).
- No other data-layer modules reference cut-logs except via the parent `inventory/shared.ts` import of `cutLogRowSelect` (line 2) and the parent `inventory/read-repository.ts` call to `normalizeCutLogRow` (line 145). No reverse dependency from cut-logs into other data-layer modules.

---

## 3. Conventions in use

### 3.1 Cut log row type shape

Denormalized strings throughout, matching the parent inventory convention. `status` is a **literal string union** (not the Prisma enum), `void` is a `boolean`, both present together.

```typescript
// packages/domain/src/flooring/inventory/cut-logs/types.ts
export const CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL", "VOIDED"] as const
export type CutLogStatus = (typeof CUT_LOG_STATUS_VALUES)[number]

export type CutLogRow = {
  id: string
  inventoryId: string
  workOrderId: string | null
  workOrderItemId: string | null
  before: string
  cut: string
  after: string
  coverageCut: string
  status: CutLogStatus
  isWaste: boolean
  void: boolean
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
}
```

`void: boolean` and `status: CutLogStatus` are stored as parallel correlated columns. Per `cut-log-rules.ts:158–161` doc-comment: "The `void` boolean and the `status` enum are correlated: void === true if and only if status === 'VOIDED'. They're stored as two columns (boolean for filtering, string for state-machine clarity) but must agree."

### 3.2 Cut log lifecycle predicates

Mix of `is*` boolean predicates and `assert*` throwing functions. No `*Blocked` polarity. No status-vs-void mixed predicate (`assertCutLogVoidStatusConsistency` enforces parity but is itself an assert, not a status-aware lifecycle predicate).

```typescript
// packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:7
export function isCutLogStatus(value: unknown): value is CutLogStatus

// :48
export function isCutLogMostRecent(
  cutLog: Pick<CutLogRow, "id" | "createdAt">,
  siblingsSameInventory: ReadonlyArray<Pick<CutLogRow, "id" | "createdAt">>,
): boolean

// :78
export function isCutLogUserTransitionAllowed(
  from: CutLogStatus,
  to: CutLogStatus,
): boolean

// :42 (asserts, throws CutLogDomainError)
export function assertCanAddCutLog(inventory: { isImported: boolean }): void

// :184
export function assertCutLogReadyToFinalize(input: {
  status: CutLogStatus
  isDirty: boolean
}): void
```

`assertCanAddCutLog` reads `inventory.isImported` — a field that the audit Section 4 / sweep-1 report flagged as REMOVED from `FlooringInventory` in the schema migration. This predicate is broken as-of sweep 1 but never surfaces because no cut-log code path currently calls it (out of scope per audit boundary; flagged in Section 8).

### 3.3 Status string literals — full grep

`"PENDING"` (8 occurrences, all consistent with the new Prisma enum value):

| Line | Source |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/types.ts:1` | `export const CUT_LOG_STATUS_VALUES = ["PENDING", "FINAL", "VOIDED"] as const` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:74` | `\| { from: "PENDING"; to: "FINAL" }` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:75` | `\| { from: "PENDING"; to: "VOIDED" }` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:82` | `if (from === "PENDING" && to === "FINAL") return true` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:83` | `if (from === "PENDING" && to === "VOIDED") return true` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:188` | `if (input.status !== "PENDING" \|\| input.isDirty) {` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:207` | `if (input.status !== "PENDING") {` |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:81` | `status: "PENDING",` (createCutLogRecord) |
| `packages/db/src/flooring/inventory/cut-logs/read-repository.ts:22` | `const status: CutLogStatus = isCutLogStatus(row.status) ? row.status : "PENDING"` |

`"FINAL"` (7 occurrences, all consistent):

| Line | Source |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/types.ts:1` | tuple member |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:12` | `if (status === "FINAL") return "Final Cut"` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:74` | union member |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:76` | `\| { from: "FINAL"; to: "VOIDED" }` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:82` | branch |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:84` | `if (from === "FINAL" && to === "VOIDED") return true` |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:175` | `status: "FINAL",` (finalizeCutLogRecord) |

`"VOIDED"` (11 occurrences — does NOT match the new Prisma enum value `"VOID"`):

| Line | Source |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/types.ts:1` | tuple member |
| `packages/domain/src/flooring/inventory/cut-logs/editability.ts:5` | doc-comment |
| `packages/domain/src/flooring/inventory/cut-logs/editability.ts:14` | doc-comment |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:13` | `if (status === "VOIDED") return "Voided"` |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:69` | doc-comment |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:75` | union member |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:76` | union member |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:83` | branch |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:84` | branch |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:136` | `status: "VOIDED"` (VoidedCutLogPatch type) |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:151` | `status: "VOIDED",` (buildVoidedCutLogPatch return) |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:159` | doc-comment |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:167` | `const isVoidedStatus = input.status === "VOIDED"` |

`"VOID"` (no D) — **zero occurrences** in the cut-logs tree. The Prisma enum value is referenced exactly nowhere in current cut-log code.

### 3.4 Void-boolean call sites — exhaustive

Property declarations:

| Line | Source |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/types.ts:15` | `void: boolean` (CutLogRow field) |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:135` | `void: true` (in `VoidedCutLogPatch` type literal) |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:163` | `void: boolean` (in `assertCutLogVoidStatusConsistency` input shape) |
| `packages/db/src/flooring/inventory/cut-logs/shared.ts:18` | `void: true,` (in `cutLogRowSelect`) |

Constants:

| Line | Source |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/editability.ts:17` | `export const CUT_LOG_VOID_TOGGLE_FIELD = "void" as const` |

Writes (set/clear):

| Line | Source |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:150` | `void: true,` (returned from `buildVoidedCutLogPatch`) |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:85` | `void: false,` (createCutLogRecord — explicit on insert) |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:148` | `void: patch.void,` (voidCutLogRecord — sets `true` via patch) |

Reads:

| Line | Source |
|---|---|
| `packages/db/src/flooring/inventory/cut-logs/read-repository.ts:34` | `void: row.void,` (normalizer surfaces the column verbatim) |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:166` | `const isVoid = input.void` (inside `assertCutLogVoidStatusConsistency`) |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:170` | `void: input.void,` (echoed in error detail payload) |

Doc-comment references (not load-bearing):

| Line | Source |
|---|---|
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:120` | "Only `notes` and the `void` checkbox survive." |
| `packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:158` | "The `void` boolean and the `status` enum are correlated…" |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:16` | "the `void` flag are not accepted on create" |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:17` | "stamped later by the FINAL transition or the void flow" |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:63` | "void-status consistency" (caller contract) |

`finalizeCutLogRecord` (write-repository.ts:162) does **not** touch `void` — leaves it as whatever the row had pre-finalize. `updateCutLogPending` (write-repository.ts:113) also does not touch `void`.

The only **read of `void` that drives behavior** is `assertCutLogVoidStatusConsistency` (cut-log-rules.ts:162). That function is exported but not currently called from any data-layer or application-layer code path within the cut-logs scope. It exists as a domain assertion the caller must invoke explicitly.

The only **non-comment, non-test consumer** of `row.void` is the read-repository normalizer, which surfaces it into `CutLogRow.void` for downstream consumers (UI / application layer — out of audit scope).

### 3.5 Validator return shape

**No `Issue[]` validators.** The cut-logs domain uses `assert*` functions that **throw** `CutLogDomainError`. This diverges from the parent `inventory/form-rules.ts` convention which returns `Issue[]`.

Type definition:

```typescript
// packages/domain/src/flooring/inventory/cut-logs/errors.ts:13
export class CutLogDomainError extends Error {
  readonly code: CutLogDomainErrorCode
  readonly detail?: Record<string, unknown>

  constructor(code: CutLogDomainErrorCode, detail?: Record<string, unknown>) {
    super(code)
    this.name = "CutLogDomainError"
    this.code = code
    this.detail = detail
  }
}
```

Representative signature:

```typescript
// packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:17
export function assertBeforeCutAfterInvariant(input: {
  before: string
  cut: string
  after: string
}): void
```

These throw on mismatch; do not return an issue array.

### 3.6 Predicate naming and polarity

No `is*Blocked` polarity (parent inventory module uses it heavily). Naming style is `is*` for booleans and `assert*` for throwing checks. No `can*` predicates either.

```typescript
export function isCutLogStatus(value: unknown): value is CutLogStatus           // type guard
export function isCutLogMostRecent(cutLog, siblings): boolean                   // condition
export function isCutLogUserTransitionAllowed(from, to): boolean                // allowlist
export function isCutLogPendingUserEditableField(field): field is …             // type guard
export function assertCanAddCutLog(inventory: { isImported: boolean }): void    // throws
```

### 3.7 Error handling

`CutLogDomainError` extends `Error`. Differs from parent `InventoryDomainError`:
- Has an additional `detail?: Record<string, unknown>` field for per-error context payloads.
- Constructor signature `constructor(code, detail?)` — no separate `message` parameter; `super(code)` makes the code its own message string.

Eleven codes documented:

```
CUT_LOG_INVALID_STATUS
CUT_LOG_ARITHMETIC_MISMATCH
CUT_LOG_INVENTORY_NOT_IMPORTED
CUT_LOG_EXCEEDS_STARTING_BALANCE
CUT_LOG_DELETE_NOT_MOST_RECENT
CUT_LOG_INVALID_TRANSITION
CUT_LOG_LINKAGE_ASYMMETRY
CUT_LOG_VOID_STATUS_MISMATCH
CUT_LOG_FINALIZE_DIRTY_BLOCKED
CUT_LOG_PENDING_INPUT_NOT_ALLOWED
```

(Note: the file shows 10 distinct codes; `CUT_LOG_INVALID_STATUS` is in the union but not thrown anywhere in the cut-logs tree as I read it.)

Throw sites: every `assert*` function in `cut-log-rules.ts` plus `assertCutLogLinkageSymmetry` (called from data-layer `createCutLogRecord` at write-repository.ts:70). Catch sites: none in the cut-logs tree (caught further up — out of audit scope).

### 3.8 Message builders

**No `build*Message` helpers in cut-logs.** No `describe*Issue` / `describe*Issues` either. The `formatCutLogStatus` function is the closest analog — formats an enum value to display copy.

```typescript
// packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:11
export function formatCutLogStatus(status: CutLogStatus): "Pending Cut" | "Final Cut" | "Voided" {
  if (status === "FINAL") return "Final Cut"
  if (status === "VOIDED") return "Voided"
  return "Pending Cut"
}
```

The error-class `code` field carries the prose-equivalent (codes are uppercase identifiers, not user-facing strings). No standalone `messages.ts` file. This diverges from the parent inventory module convention (which has `build*Message` / `describe*Issue` co-located with rules).

### 3.9 Decimal handling

Domain row type uses `string` for every decimal field. Read normalizer uses `.toString()` and `toDecimalString` helper. Write inputs accept the union `Prisma.Decimal | string | number | null`.

| Field | Domain type (`CutLogRow`) | Prisma column | Normalizer source |
|---|---|---|---|
| `before` | `string` | `Decimal @db.Decimal(12, 2)` (NOT NULL) | `row.before.toString()` (read-repository.ts:28) |
| `cut` | `string` | `Decimal @db.Decimal(12, 2)` (NOT NULL) | `row.cut.toString()` (line 29) |
| `coverageCut` | `string` | `Decimal? @db.Decimal(12, 2)` (NULL) | `toDecimalString(row.coverageCut)` (line 31) — null → `""` |
| `after` | `string` | `Decimal @db.Decimal(12, 2)` (NOT NULL) | `row.after.toString()` (line 30) |
| `cost` | `string` | `Decimal? @db.Decimal(10, 2)` (NULL) | `toDecimalString(row.cost)` (line 35) |
| `freight` | `string` | `Decimal? @db.Decimal(10, 2)` (NULL) | `toDecimalString(row.freight)` (line 36) |

Write side (`CreateCutLogRecordInput`, `UpdateCutLogPendingInput`, `FinalizeCutLogRecordInput`) all use `Prisma.Decimal | string | number` (with `| null` where the column is nullable). No `decimal.js` import.

### 3.10 Repository signatures

All cut-log read and write functions follow the optional `client = db` pattern. None require a `Prisma.TransactionClient`.

```typescript
// packages/db/src/flooring/inventory/cut-logs/read-repository.ts:43
export async function getCutLogById(
  id: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord | null>

// :54
export async function listCutLogsByInventoryId(
  inventoryId: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord[]>

// packages/db/src/flooring/inventory/cut-logs/write-repository.ts:66
export async function createCutLogRecord(
  input: CreateCutLogRecordInput,
  client: CutLogDbClient = db,
): Promise<CutLogRecord>

// :113
export async function updateCutLogPending(
  id: string,
  input: UpdateCutLogPendingInput,
  client: CutLogDbClient = db,
): Promise<CutLogRecord>

// :133
export async function voidCutLogRecord(
  id: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord>

// :162
export async function finalizeCutLogRecord(
  id: string,
  input: FinalizeCutLogRecordInput,
  client: CutLogDbClient = db,
): Promise<CutLogRecord>

// :186
export async function deleteCutLogRecordById(
  id: string,
  client: CutLogDbClient = db,
): Promise<void>
```

Naming follows the `*Record` convention from sweep-1/sweep-2 audit Section 4.10. All writes follow the "mutate then re-read via `getCutLogById`" pattern.

### 3.11 Transaction-only primitives

**None.** All five cut-log mutation primitives default `client = db`. No function in `cut-logs/` requires a `Prisma.TransactionClient`. Compare to the parent `applyStagedInventoryRowsDiff` and the new sweep-2 primitives `markStagedRowsForImport` / `materializeStagedRowsToInventory` which all require `tx: Prisma.TransactionClient`.

### 3.12 Inventory locking pattern

**Documented in doc-comment only; not enforced in code.** The `write-repository.ts:56–64` doc-comment states:

> *Caller contract for every mutating primitive in this file:*
> *- The application use case opens a transaction via `withDatabaseTransaction` and locks the parent inventory row `FOR UPDATE` before invoking.*
> *- Any totalCutSum delta is applied via `updateInventoryTotalCutSum` (in inventory's write-repo) inside the same transaction.*
> *- Domain rules (linkage symmetry, status transition, pending-input gate, void-status consistency) are validated before the call.*

No `SELECT … FOR UPDATE`, no `$queryRaw`, no `Prisma.sql` calls anywhere in the cut-logs tree. The contract is asserted in prose, not in the type system or runtime.

### 3.13 `updateInventoryTotalCutSum` call sites

**Zero call sites in cut-logs.** The function is mentioned only in the write-repository doc-comment (line 60).

| Location | Reference |
|---|---|
| `packages/db/src/flooring/inventory/write-repository.ts:146` | function definition |
| `packages/db/src/flooring/inventory/write-repository.ts:158` | self-reference inside the function body (error message) |
| `packages/db/src/flooring/inventory/cut-logs/write-repository.ts:60` | doc-comment mention |

No code path actually invokes `updateInventoryTotalCutSum` anywhere in the repo (verified across `packages/` and `apps/`, excluding `dist/`).

### 3.14 Barrel export style

```typescript
// packages/domain/src/flooring/inventory/cut-logs/index.ts (5 lines)
export * from "./types.js"
export * from "./editability.js"
export * from "./errors.js"
export * from "./cut-log-rules.js"
export * from "./category-math.js"
```

```typescript
// packages/db/src/flooring/inventory/cut-logs/index.ts (3 lines)
export * from "./shared.js"
export * from "./read-repository.js"
export * from "./write-repository.js"
```

Both parent inventory barrels re-export `cut-logs/`:
- `packages/domain/src/flooring/inventory/index.ts:14` → `export * from "./cut-logs/index.js"`
- `packages/db/src/flooring/inventory/index.ts:4` → `export * from "./cut-logs/index.js"`

So all cut-log domain symbols flow through `@builders/domain` and all data symbols through `@builders/db` automatically.

---

## 4. Schema field coverage

### 4.1 Domain row type vs Prisma model

Prisma `FlooringCutLog` model (post sweep-1 migration):

```
id              String                 @id @default(uuid())
inventoryId     String
workOrderId     String?
workOrderItemId String?
before          Decimal                @db.Decimal(12, 2)
cut             Decimal                @db.Decimal(12, 2)
coverageCut     Decimal?               @db.Decimal(12, 2)
after           Decimal                @db.Decimal(12, 2)
status          FlooringCutLogStatus   @default(PENDING)     // enum: PENDING | FINAL | VOID
cost            Decimal?               @db.Decimal(10, 2)
freight         Decimal?               @db.Decimal(10, 2)
isWaste         Boolean                @default(false)
void            Boolean                @default(false)
notes           String?
createdAt       DateTime               @default(now())
updatedAt       DateTime               @updatedAt
```

Domain `CutLogRow` (`packages/domain/src/flooring/inventory/cut-logs/types.ts:4`):

| Domain field | Domain type | Prisma counterpart | Notes |
|---|---|---|---|
| `id` | `string` | `String` | match |
| `inventoryId` | `string` | `String` | match |
| `workOrderId` | `string \| null` | `String?` | match |
| `workOrderItemId` | `string \| null` | `String?` | match |
| `before` | `string` | `Decimal` | conventional decimal-as-string |
| `cut` | `string` | `Decimal` | same |
| `after` | `string` | `Decimal` | same |
| `coverageCut` | `string` | `Decimal?` | **nullable in Prisma, non-null `string` in domain** — normalizer coalesces null to `""` via `toDecimalString` |
| `status` | `CutLogStatus` ("PENDING" \| "FINAL" \| **"VOIDED"**) | `FlooringCutLogStatus` (PENDING \| FINAL \| **VOID**) | **type/value mismatch on the void member** |
| `isWaste` | `boolean` | `Boolean` | match |
| `void` | `boolean` | `Boolean` | match |
| `cost` | `string` | `Decimal?` | nullable in Prisma, non-null `string` in domain — coalesces |
| `freight` | `string` | `Decimal?` | same |
| `notes` | `string` | `String?` | nullable in Prisma, non-null `string` in domain — coalesces |
| `createdAt` | `string` | `DateTime` | ISO string |
| `updatedAt` | `string` | `DateTime` | ISO string |

**No fields in Prisma but missing from domain.** Every Prisma column is represented.

**No fields in domain but absent from Prisma** (no computed/denormalized additions on `CutLogRow`).

**Type mismatches:**
- `status`: domain literal union has `"VOIDED"`; Prisma enum has `"VOID"`. The runtime guard `isCutLogStatus(row.status)` (read-repository.ts:22) returns false for `"VOID"` and falls back to `"PENDING"` — silently rewriting voided rows to pending in the normalized output.
- `coverageCut`, `cost`, `freight`, `notes`: nullable in Prisma, non-null in domain (coalesced through normalizer). Same pattern as parent inventory module post-sweep-2.

### 4.2 Sweep 1 schema delta touchpoints

**`FlooringCutLogStatus` enum (PENDING | FINAL | VOID):**

- Used at `write-repository.ts:81` (`status: "PENDING"`) — literal matches enum, type-checks.
- Used at `write-repository.ts:175` (`status: "FINAL"`) — literal matches enum, type-checks.
- Used at `write-repository.ts:149` (`status: patch.status`) — `patch.status` is the literal `"VOIDED"` from `VoidedCutLogPatch`. Does not match the enum. **This is the documented baseline tsc error.**
- Used at `read-repository.ts:22` (runtime `isCutLogStatus` guard) — guard's allowlist is `["PENDING", "FINAL", "VOIDED"]`. For incoming Prisma values:
  - `"PENDING"` → guard passes, surfaces as `"PENDING"`. ✓
  - `"FINAL"` → guard passes, surfaces as `"FINAL"`. ✓
  - `"VOID"` → guard **fails**, falls back to `"PENDING"`. ✗ (silent normalization bug)

**Compound indexes `(workOrderItemId, status)` and `(inventoryId, status)`:**

- Zero queries in cut-logs filter by `status`. The only reads are `getCutLogById(id)` and `listCutLogsByInventoryId(inventoryId)` — both filter by id-shaped columns, neither leverages the status portion of the compound indexes.
- Zero queries filter by `workOrderItemId`. The column is selected and surfaced via the normalizer, but no `where: { workOrderItemId: ... }` exists in the cut-logs tree.
- Both indexes are defined in the schema but unused by current cut-log code paths.

---

## 5. Cross-layer wiring

### 5.1 Read path trace

The only cut-log read flow visible in scope is the inventory record-view's `cutLogs` section, which is materialized as part of the inventory detail payload:

1. `apps/web/app/api/inventory/[id]/route.ts:19` (out of scope but cited as the entry point) — `GET` handler returns `await getInventoryDetailById(id)`.
2. `packages/db/src/flooring/inventory/read-repository.ts:182` — `getInventoryDetailById` runs `findUnique({ select: inventoryDetailSelect })`.
3. `packages/db/src/flooring/inventory/shared.ts:73–76` — `inventoryDetailSelect` spreads `inventoryRowSelect` and adds `cutLogs: { select: cutLogRowSelect, orderBy: [{ createdAt: "asc" }] }`.
4. `packages/db/src/flooring/inventory/cut-logs/shared.ts:5–22` — `cutLogRowSelect` enumerates the 16 cut-log columns including `void` and `status`.
5. `packages/db/src/flooring/inventory/read-repository.ts:139` — `normalizeInventoryDetail(payload)` spreads `normalizeInventoryRow(payload)` then sets `cutLogs: payload.cutLogs.map(normalizeCutLogRow)` (line 145).
6. `packages/db/src/flooring/inventory/cut-logs/read-repository.ts:21` — `normalizeCutLogRow` runs the runtime `isCutLogStatus` guard (line 22) and emits `CutLogRow` via toString/toDecimalString conversions.

Standalone cut-log reads `getCutLogById` and `listCutLogsByInventoryId` are exported but have no in-scope callers (cut-log application layer is out of scope; this audit cannot verify or deny external callers above the data layer).

### 5.2 Write path trace

**No cross-layer write path exists for cut logs.** The write primitives `createCutLogRecord`, `updateCutLogPending`, `voidCutLogRecord`, `finalizeCutLogRecord`, `deleteCutLogRecordById` are all standalone data-layer functions. None are called from any application use case or API route in scope. None are wrapped in a transaction that also touches `flooring_inventory.totalCutSum` (per Section 3.13).

The doc-comment at `write-repository.ts:56–64` describes the intended caller contract (open transaction, lock parent inventory, call `updateInventoryTotalCutSum` in the same transaction), but no code currently implements that caller. The contract is currently aspirational.

---

## 6. The :149 blocker — full diagnostic

### 6.1 Code at `:149`

```typescript
// packages/db/src/flooring/inventory/cut-logs/write-repository.ts:138-152
  await client.flooringCutLog.update({
    where: { id },
    data: {
      cut: patch.cut,
      coverageCut: patch.coverageCut,
      before: patch.before,
      after: patch.after,
      cost: patch.cost,
      freight: patch.freight,
      isWaste: patch.isWaste,
      void: patch.void,
      status: patch.status,                       // ← line 149
      workOrder: { disconnect: true },
      workOrderItem: { disconnect: true },
    },
    select: { id: true },
  })
```

`patch` is the return value of `buildVoidedCutLogPatch()` (line 137). `patch.status` is typed as the literal `"VOIDED"` per the `VoidedCutLogPatch` type definition.

### 6.2 `"VOIDED"` literal occurrences

The literal `"VOIDED"` is encoded into both the type and the runtime in `cut-log-rules.ts`:

```typescript
// packages/domain/src/flooring/inventory/cut-logs/cut-log-rules.ts:125-137 (type)
export type VoidedCutLogPatch = {
  cut: "0"
  coverageCut: null
  before: "0"
  after: "0"
  cost: null
  freight: null
  isWaste: false
  workOrderId: null
  workOrderItemId: null
  void: true
  status: "VOIDED"                                // ← line 136
}

// :139-153 (builder)
export function buildVoidedCutLogPatch(): VoidedCutLogPatch {
  return {
    cut: "0",
    coverageCut: null,
    before: "0",
    after: "0",
    cost: null,
    freight: null,
    isWaste: false,
    workOrderId: null,
    workOrderItemId: null,
    void: true,
    status: "VOIDED",                             // ← line 151
  }
}
```

Plus the additional 9 `"VOIDED"` references catalogued in Section 3.3.

### 6.3 Typing diagnosis

`patch.status` is typed as the **string literal** `"VOIDED"`, not as the Prisma enum. The Prisma update input `Prisma.FlooringCutLogUpdateInput["status"]` resolves to `FlooringCutLogStatus | EnumFlooringCutLogStatusFieldUpdateOperationsInput | undefined`. The literal `"VOIDED"` is not a member of `FlooringCutLogStatus` (which is `"PENDING" | "FINAL" | "VOID"`).

**Diagnosis: not a single-line domain rename. Both:**

1. **A typing cascade:** every `"VOIDED"` literal in the domain (11 occurrences across `types.ts`, `cut-log-rules.ts`, plus 2 doc-comments in `editability.ts`) needs to become `"VOID"`. Touched constructs:
   - `CUT_LOG_STATUS_VALUES` tuple (`types.ts:1`)
   - `formatCutLogStatus` switch (`cut-log-rules.ts:13`)
   - `CutLogUserTransition` union members (`:75`, `:76`)
   - `isCutLogUserTransitionAllowed` branches (`:83`, `:84`)
   - `VoidedCutLogPatch.status` literal type (`:136`)
   - `buildVoidedCutLogPatch` return literal (`:151`)
   - `assertCutLogVoidStatusConsistency` comparison (`:167`)
   - Doc-comments throughout (non-load-bearing but stale)
2. **A semantic alignment:** the domain's `CutLogStatus` literal union becomes redundant with the Prisma enum after rename. Either keep the literal-tuple convention (matching the existing pattern) or re-export the Prisma enum (matching the staged-row convention adopted in sweep 1, where `FlooringStagedRowStatus` is re-exported from `@prisma/client`).

The `:149` symptom is therefore the leaf of an enum-rename refactor that touches every cut-log-rules predicate that branches on status.

---

## 7. Sibling broken state

### 7.1 String-to-enum mismatches

After fixing the enum literal:

- `read-repository.ts:22` — `isCutLogStatus(row.status)` continues to type-check (the input is widened to `unknown` at the guard site), but the guard's truth table changes. Once the literal-union becomes `"PENDING" | "FINAL" | "VOID"`, the guard correctly accepts every Prisma value and the silent fallback to `"PENDING"` (line 22) becomes dead code. (Unless the guard array is left at `["PENDING", "FINAL", "VOIDED"]` while the type changes — that would be a partial rename leaving guard semantics broken.)
- `write-repository.ts:81` — `status: "PENDING"` already matches the enum. No change needed.
- `write-repository.ts:175` — `status: "FINAL"` already matches the enum. No change needed.

### 7.2 `"VOIDED"` predicate/message switches

After enum rename, any predicate left switching on `"VOIDED"` would silently fail to match the new `"VOID"` value. Sites that branch on the void member:

- `formatCutLogStatus` (`cut-log-rules.ts:13`): `if (status === "VOIDED") return "Voided"` — would return `"Pending Cut"` for VOID rows after enum rename without renaming the literal here.
- `isCutLogUserTransitionAllowed` (`cut-log-rules.ts:83`, `:84`): two branches gating user transitions to the void state. Silent failure → users would get no transition rejection, then the underlying enum-mismatch would resurface elsewhere.
- `assertCutLogVoidStatusConsistency` (`cut-log-rules.ts:167`): `const isVoidedStatus = input.status === "VOIDED"`. Silent failure → consistency check would think VOID rows always disagree with their `void` boolean (since `isVoidedStatus` would always be false), throwing on every voided row.
- `CutLogUserTransition` union (`cut-log-rules.ts:75`, `:76`): type-level. After enum rename, callers passing Prisma's `"VOID"` would no longer type-narrow into these branches, surfacing as type errors at the call site (out of audit scope).
- `VoidedCutLogPatch` literal type (`cut-log-rules.ts:136`): type-level. `patch.status` would carry stale literal type unless renamed.

### 7.3 `status` + `void` drift risk

The two columns are **not** enforced consistent at the schema, normalizer, or write-primitive level. Enforcement lives only in `assertCutLogVoidStatusConsistency` which the caller must explicitly invoke. Drift sites:

- `createCutLogRecord` (write-repository.ts:74–95) hardcodes `status: "PENDING"` (line 81) and `void: false` (line 85) — consistent.
- `voidCutLogRecord` (write-repository.ts:133–160) writes both `void: patch.void` (`true`) and `status: patch.status` (`"VOIDED"`) — consistent (assuming the patch is honored by Prisma).
- `finalizeCutLogRecord` (write-repository.ts:162–184) writes `status: "FINAL"` but **does not touch `void`**. If the row's `void` was somehow `true` before finalize (it shouldn't be, since you can't finalize a voided row per the user-transition allowlist), it would remain `true` while `status: "FINAL"` — inconsistent. There's no current path that would create this state (the user-transition allowlist forbids `VOIDED → FINAL`), but the data layer has no defense against it.
- `updateCutLogPending` (write-repository.ts:113–131) does not touch either column.

The schema column `void` has DB-level default `false`. The application/caller is the sole owner of keeping the two columns in lockstep. The domain assertion exists; no current code path calls it.

---

## 8. Open observations

- **`assertCanAddCutLog` is broken as of sweep 1.** It reads `inventory.isImported` (cut-log-rules.ts:42–46), but `FlooringInventory.isImported` was removed by the schema migration (per sweep-1 audit Section 7 / Open Observation). The function is exported but no caller exists in the cut-logs tree, so the breakage hasn't surfaced. The use case that was supposed to call it (sweep 3 territory) would fail to compile against the post-sweep-1 inventory row type.
- **`CUT_LOG_INVALID_STATUS` error code is declared but never thrown** (`errors.ts:2` lists it; no `throw new CutLogDomainError("CUT_LOG_INVALID_STATUS", …)` anywhere in `cut-logs/` tree).
- **`CUT_LOG_VOID_TOGGLE_FIELD` is declared but unread** (`editability.ts:17`). No predicate or write path consumes it. Same kind of "documented contract, no consumer" pattern as the `void` boolean's read sites.
- **`assertCutLogLinkageSymmetry` is the only domain assert called from a data-layer function.** It runs inside `createCutLogRecord` (write-repository.ts:70) before the Prisma write. Other repositories in scope (imports/inventory/staged) do not invoke domain asserts inline — the domain validation lives in the application layer for those modules. This is a layering inconsistency vs the established pattern.
- **Comment vs code drift on transactionality.** The `write-repository.ts:56–64` doc-comment promises a transactional contract (parent-inventory `FOR UPDATE` lock, `updateInventoryTotalCutSum` co-application) that is enforced nowhere — the function signatures default `client = db`, no `tx: Prisma.TransactionClient` requirement, no inline lock or totalCutSum call. The contract is aspirational.
- **`updateInventoryTotalCutSum` has zero callers across the entire repo.** Defined at `packages/db/src/flooring/inventory/write-repository.ts:146`, mentioned only in the cut-logs doc-comment. The function is dead code as of audit time.
- **`finalizeCutLogRecord` does not touch `void` or `notes`.** It updates 5 fields (`before`, `after`, `cost`, `freight`, `coverageCut`, `status`). The doc-comment at line 45–47 says "Sets status = FINAL and stamps the five computed fields atomically" — accurate, but silent on the fact that `void` is left as-is (not explicitly set to `false`).
- **`createCutLogRecord` hardcodes `before: 0` and `after: 0`** (write-repository.ts:79–80). These are populated by `finalizeCutLogRecord` later. Comment at line 14–17 explains the staging.
- **The `void` boolean's only behavior-driving read site is `assertCutLogVoidStatusConsistency`**, which is itself uncalled by any in-scope code path. Outside of that one function, `void` is set on writes (create=false, void=true), persisted, and surfaced through the normalizer to consumers. Whether downstream UI or application code branches on it is out of audit scope.
- **`coverageCut` is normalized to `string` but null in Prisma.** `toDecimalString(null)` returns `""`. The domain row exposes `""` as the "no coverage" state — UI consumers must distinguish `""` from `"0"` or treat them the same.
- **`isWaste` is selected, surfaced through the normalizer, and accepted on `CreateCutLogRecordInput`** but never read by any domain predicate or asserted into a rule. It's a passthrough flag with no domain semantics in scope.
- **No barrel re-export drama.** Both layers' barrels include cut-logs verbatim; no symbol-collision concerns, no missing re-exports.
- **Domain layer does no validator-shape work.** Cut-logs is the only inventory submodule that throws domain errors directly from rules instead of returning issue arrays. Parent inventory module returns `Issue[]` from `validateInventoryForm`; cut-logs throws from every `assert*`.
- **The compound indexes added in sweep 1 (`(workOrderItemId, status)`, `(inventoryId, status)`) are unused.** Added speculatively per the migration; no read query in scope filters by status.
- **`listCutLogsByInventoryId` does not filter by status.** Returns every cut log including voided rows. UI consumers must filter client-side if they want to hide voided rows.
