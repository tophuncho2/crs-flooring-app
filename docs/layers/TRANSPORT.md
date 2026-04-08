# Transport Layer

> **Scope:** Payload assembly forward (controller -> application). Response shaping back (application -> controller).
> **Package:** `apps/web/modules/` (per-module, often implicit)


## Rules

1. Transport is thin — no business logic, no conditional branching beyond field mapping.
2. Transport assembles request payloads from controller state and shapes API responses back to controller types.
3. Domain Zod schemas handle input validation directly in most modules — explicit transport files are not required when schemas suffice.
4. When an explicit transport layer exists, it lives alongside the controller in the module directory.

## Contract

Transport functions follow one of two patterns:

**Request assembly (controller -> API):**
```typescript
function buildCreatePayload(controllerState: FormState): ApiRequestBody
function buildUpdatePayload(controllerState: FormState, meta: MutationMeta): ApiRequestBody
```

**Response shaping (API -> controller):**
```typescript
function normalizeListResponse(apiResponse: ApiListResponse): ControllerItem[]
function normalizeRecordResponse(apiResponse: ApiRecordResponse): SectionData
```

## Structure

```
Explicit transport files live per-module when needed:
modules/{name}/
└── transport/
├── {view}-types.ts    ← Response shapes for specific views
└── {action}-types.ts  ← Request shapes for mutations

Shared transport utilities:
modules/shared/engines/common/transport/
├── http.ts          ← Fetch wrapper with error handling
└── mutations.ts     ← Mutation metadata assembly (idempotency keys, timestamps)
```

Most modules keep transport implicit — domain Zod schemas validate input, and API responses are normalized inline in controllers. This is the accepted pattern.


## Anti-Patterns

1. **Do not** put business logic in transport functions — they are mappers, not decision-makers.
2. **Do not** create transport files when domain schemas already handle validation — avoid unnecessary indirection.
3. **Do not** make API calls from transport functions — transport assembles payloads, controllers initiate requests.

## Related Docs

- [CONTROLLER.md](CONTROLLER.md) — consumes transport for API communication
- [../execution/ROUTE_POLICY.md](../execution/ROUTE_POLICY.md) — server-side request handling
