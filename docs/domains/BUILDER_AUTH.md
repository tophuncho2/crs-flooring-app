# Builder / Admin / Auth — Architecture Baseline

> Generated 2026-04-06 via domain audit. Covers identity, sessions, access control, user governance, and builder administration.

---

## 1. Domain Map

### Entities

| Entity | Description | Source of Truth |
|--------|-------------|-----------------|
| **User** | Email, hashed password, role, verification status | `packages/db/prisma/schema.prisma` — `User` model |
| **Role** | OWNER · ADMIN · BUILDER · CONTRACTOR · CUSTOMER | `Role` enum in Prisma schema |
| **Capability** | 12 fine-grained permissions (e.g. `workOrders.write`) | `server/auth/access-control.ts` — `ROLE_CAPABILITIES` |
| **Session** | JWT token with id, email, role, isVerified | NextAuth CredentialsProvider, `server/auth/session.ts` |
| **Tool Access** | Feature-flag-style gating per role for 4 tool slugs | `server/platform/tool-access.ts` — `TOOL_ACCESS_POLICY` |
| **Login Activity** | Audit trail of successful logins | `UserLoginActivity` model |
| **Mutation Receipt** | Idempotency tracking per user/scope/key | `AppMutationReceipt` model |

### Relationships

```
User (1) ──→ (1) Role
User (1) ──→ (*) UserLoginActivity
User (1) ──→ (*) UserTablePreference
User (1) ──→ (*) AppMutationReceipt
User (1) ──→ (*) FlooringWorkOrderAllocationRun

Role ──maps-to──→ Set<Capability>   (ROLE_CAPABILITIES in access-control.ts)
Role ──maps-to──→ Set<ToolSlug>     (TOOL_ACCESS_POLICY in tool-access.ts)
```

### Where Each Concern Lives Today

| Concern | Current Location | Target Location |
|---------|-----------------|-----------------|
| Role enum | `packages/db` (Prisma) | `packages/db` (stay) |
| Capability definitions | `server/auth/access-control.ts` | `packages/domain/` (FLO-30) |
| Role → Capability map | `server/auth/access-control.ts` | `packages/domain/` (FLO-30) |
| Capability check helpers | `server/auth/access-control.ts` | `packages/domain/` (FLO-30) |
| User governance rules | `server/auth/user-governance.ts` | `packages/domain/` (FLO-30) |
| User CRUD operations | `server/builder/users.ts` | `packages/application/` + `packages/db/` (FLO-30) |
| Tool access policy | `server/platform/tool-access.ts` | `packages/domain/` (FLO-30) |
| Session management | `server/auth/session.ts` | `server/auth/` (stay — framework-specific) |
| Route authorization | `server/auth/route-auth.ts` | `server/auth/` (stay — framework-specific) |
| NextAuth config | `server/auth/auth-options.ts` | `server/auth/` (stay — framework-specific) |
| Route policy engine | `server/http/route-policy.ts` | `server/http/` (stay) |
| Response helpers | `server/http/route-helpers.ts` | Move to `route-policy.ts` or `api-helpers.ts`, then delete file (FLO-32) |

---

## 2. Execution Paths

### 2.1 Login Flow (Current — Password-Based)

```
LoginForm (modules/auth/components/login-form.tsx)
  │  signIn("credentials", { email, password })
  ▼
NextAuth CredentialsProvider (server/auth/auth-options.ts)
  │  1. Normalize email (trim, lowercase)
  │  2. Rate-limit check: 10 attempts / 10 min per IP
  │  3. prisma.user.findUnique({ where: { email } })
  │  4. bcrypt.compare(password, user.password)
  │  5. hasSystemAccess(user.role)  →  CONTRACTOR/CUSTOMER rejected
  │  6. Verification check:
  │     - OWNER/ADMIN: bypass (canBypassVerification)
  │     - BUILDER: must be isVerified === true
  │  7. prisma.userLoginActivity.create()
  │  8. Return { id, email, role, isVerified }
  ▼
NextAuth JWT callback → stores id, role, isVerified in token
NextAuth Session callback → populates session.user
  ▼
Client redirects to /dashboard/inventory
```

**Planned changes (FLO-44):** Email-first two-step flow. Step 1: enter email, detect whether password is set. Step 2a: enter password (existing users) or Step 2b: set password (first login after admin provisioning). Requires `passwordSetAt` field on User model.

### 2.2 Session Resolution

```
Server Component (layout.tsx / page.tsx)
  │  await requireSessionUser()
  ▼
session.ts:requireSessionUser()
  │  1. getServerSession(getAuthOptions())
  │  2. Extract user from session
  │  3. If no user → redirect("/login")
  │  4. If !hasSystemAccess(role) → redirect("/login")
  │  5. If !isVerified && !canBypassVerification() → redirect("/login?restricted=1")
  ▼
Returns SessionUser { id, email, role, isVerified }
```

**Pattern:** STRUCTURAL — called in Server Component layouts, gates all `/dashboard/*` routes.

### 2.3 Route Authorization (API Routes)

```
API route handler (e.g. GET /api/admin/users)
  │  const access = await applyRoutePolicy(request, { capability: "users.manage", rateLimit: {...} })
  ▼
route-policy.ts:applyRoutePolicy()
  │  1. requireRouteAccess(request, { capability, toolSlug, allowUnverified })
  │     └─→ route-auth.ts:authorizeRouteAccess()
  │          1. Extract requestId, clientIp
  │          2. getSessionUser()
  │          3. No user → 401
  │          4. !hasSystemAccess → 403
  │          5. !isVerified && !canBypass → 403
  │          6. !hasCapability(role, cap) → 403
  │          7. !isToolUnlocked(role, slug) → 403
  │          8. Return AuthorizedRouteContext
  │  2. If rateLimit config set → consumeRateLimit()
  │     └─→ Exceeded → 429 response
  ▼
Returns AuthorizedRouteContext { user, requestId, clientIp } | Response
```

**Pattern:** ALL 72 API routes (excluding 2 auth routes) use `applyRoutePolicy()` — either directly (56 routes) or indirectly via `authorizeWorkOrdersRoute()` / `authorizeTemplatesRoute()` (16 routes). The deprecated `requireRouteAccess()` from `route-helpers.ts` is called only by `modules/shared/access/templates-work-orders.ts`.

### 2.4 User CRUD (Current — server/builder)

```
AdminUsersClient (modules/admin/components/list/admin-users-client.tsx)
  │  fetch("/api/admin/users")
  ▼
GET /api/admin/users/route.ts
  │  applyRoutePolicy({ capability: "users.manage" })
  │  enforceQueryRateLimit()
  │  listManagedUsers(actor)
  ▼
server/builder/users.ts:listManagedUsers()
  │  1. prisma.user.findMany({ where: { role: { in: [OWNER, ADMIN, BUILDER] } } })
  │  2. If !canManageUsers(actor) → return empty array
  │  3. normalizeManagedUserRow() for each user:
  │     - createdAt → ISO string
  │     - isVerified: exposed only for BUILDER (others always true)
  │     - canRestrict: true if actor can manage AND target is BUILDER
  │     - canEditRole: always false (stub)
  │     - canDelete: true if actor can manage AND target is BUILDER
  ▼
Returns { users: ManagedUserRow[], viewerCanManageUsers: boolean }
```

**Governance rules enforced:**
- Only BUILDER users can be governed (updated/deleted) from the panel
- OWNER/ADMIN accounts are visible but immutable
- Role changes are blocked (`canEditRole` always false)
- Only `isVerified` field can be toggled on BUILDER users
- Hard delete only — no soft-delete mechanism
- Self-demotion prevention via `assertGovernedUserUpdate()`

### 2.5 User Provisioning (Planned — FLO-43)

```
Admin navigates to Users module → "Add User" action
  │  Enters email + role
  │  (NO password — user sets on first login)
  ▼
POST /api/users (new route)
  │  applyRoutePolicy({ capability: "users.manage" })
  │  createUser use case (packages/application/)
  ▼
packages/db/ user repository
  │  prisma.user.create({ email, role, isVerified: true, password: null })
  ▼
Email notification sent to new user
  ▼
User clicks link → login page detects no password → password-set flow (FLO-44)
```

### 2.6 Registration Flow (Current — To Be Removed by FLO-43)

```
LoginForm → "Create Account" toggle
  │  POST /api/auth/register
  ▼
app/api/auth/register/route.ts
  │  1. Rate limit (5/15min anonymous, 20/15min governance)
  │  2. Validate email + password (≥12 chars)
  │  3. Check duplicate email
  │  4. prisma.user.create({ email, password: bcrypt(pw), role: BUILDER, isVerified: false })
  │  5. Return "pending approval" message
  ▼
User must wait for OWNER/ADMIN to set isVerified = true
```

---

## 3. Complete File Inventory

### 3.1 `server/auth/` — 5 Files

| File | Classification | Exports | Prisma Calls | Move Target |
|------|---------------|---------|-------------|-------------|
| `access-control.ts` | **Business logic** | 14 functions + 2 types: `CAPABILITIES`, `Capability`, `isBuilder()`, `isOwner()`, `isAdmin()`, `hasGovernanceAccess()`, `hasSystemAccess()`, `hasCapability()`, `canAccessBuilderPanel()`, `canBypassVerification()`, `canRestrictUser()`, `canEditRole()`, `canManageUsers()`, `canEditCategories()`, `canEditUnitOfMeasures()` | None | `packages/domain/` |
| `user-governance.ts` | **Business logic** | 4 functions + 1 type: `resolveGovernedVerification()`, `assertGovernedUserUpdate()`, `assertGovernedUserDelete()`, `normalizeManagedUserRow()`, `ManagedUserRow` | None | `packages/domain/` |
| `session.ts` | Infrastructure | 3 functions + 1 type: `getSessionUser()`, `requireSessionUser()`, `requireToolAccess()`, `SessionUser` | None | Stay |
| `route-auth.ts` | Infrastructure | 7 functions + 1 type: `authorizeRouteAccess()`, `ensureCapability()`, `ensureToolAccess()`, `ensureBuilderOrAdmin()`, `ensureAuthenticated()`, `ensureAdminOnly()`, `ensureBuilderOnly()`, `ensureGovernanceUser()`, `ensureBuilderPanelAccess()`, `AuthorizedRouteContext` | None | Stay |
| `auth-options.ts` | Infrastructure | 1 function: `getAuthOptions()` | **2 calls**: `user.findUnique`, `userLoginActivity.create` | Stay (move Prisma calls to `packages/db/`) |

### 3.2 `server/builder/` — 2 Files

| File | Classification | Exports | Prisma Calls | Move Target |
|------|---------------|---------|-------------|-------------|
| `users.ts` | **Business logic** + data access | 5 functions: `listManagedUsers()`, `normalizeManagedUserUpdateInput()`, `updateManagedUser()`, `deleteManagedUser()`, `listManagedUserActivity()` | **6 calls**: `user.findMany`, `user.findUnique` (x2), `user.update`, `user.delete`, `userLoginActivity.findMany` | Split: business logic → `packages/application/`, data access → `packages/db/` |
| `unit-of-measures.ts` | Thin wrapper | 2 functions: `normalizeUnitOfMeasureInput()`, `listUnitOfMeasures()` | **0** (delegates to `@builders/db`) | Already clean — validation stays in server, data access already in packages |

### 3.3 `server/platform/` — 5 Files

| File | Classification | Exports | Dead Code |
|------|---------------|---------|-----------|
| `tool-access.ts` | Business logic | 10 exports: `TOOL_CATALOG`, `ToolSlug`, `ToolCatalogItem`, `isKnownToolSlug()`, `hasToolAccess()`, `getToolCatalog()`, `UserToolRow`, `UserToolContext`, `getUserToolContext()`, `isToolUnlocked()` | **3 dead**: `hasToolAccess()`, `getToolCatalog()`, `isKnownToolSlug()` |
| `rate-limit.ts` | Infrastructure | 3 exports: `consumeRateLimit()`, `buildRateLimitResponse()`, `resetRateLimitStateForTests()` | None |
| `request-context.ts` | Infrastructure | 6 exports: `REQUEST_ID_HEADER`, `HeaderCarrier`, `getRequestId()`, `getClientIp()`, `withRequestId()`, `jsonWithRequestId()` | None |
| `env.ts` | Infrastructure | 12 exports: environment types + validators + getters | None |
| `logger.ts` | Infrastructure | 2 exports: `StructuredLogEvent`, `logEvent()` | None |

### 3.4 `server/http/` — 3 Files

| File | Classification | Status |
|------|---------------|--------|
| `route-policy.ts` | **Canonical** route protection | Active — all routes use `applyRoutePolicy()` |
| `route-helpers.ts` | Response formatting + **deprecated** auth wrappers | `requireRouteAccess()` and `enforceRouteRateLimit()` deprecated; `routeJson()` and `routeError()` still used by all 72 routes |
| `api-helpers.ts` | Input parsing + error normalization | Active |

### 3.5 `modules/auth/` — 1 File

| File | What It Does |
|------|-------------|
| `components/login-form.tsx` | Login + "Create Account" form. Client component with `signIn()` (NextAuth) and `POST /api/auth/register`. |

### 3.6 `modules/admin/` — Engine-Driven Admin Module

Canonical module following MODULE_ANATOMY.md. Uses list-view + record-view engine primitives.

| Directory | What It Does |
|-----------|-------------|
| `domain/types.ts` | `ManagedUserRow`, `ManagedUserForm` types, validators |
| `data/queries.ts` | SSR page data loaders (delegates to `server/builder/users.ts`) |
| `controllers/` | List controller composing engine hooks |
| `components/list/` | List page client + table rendering |
| `record/detail/` | Detail page scaffold |
| `record/panel/` | Record panel, section controller, fields section |

### 3.7 `modules/shared/access/` — Auth-Related

| File | What It Does | Issue |
|------|-------------|-------|
| `templates-work-orders.ts` | `authorizeTemplatesRoute()`, `authorizeWorkOrdersRoute()`, `buildWorkOrderCapabilityFlags()` | **Still calls deprecated `requireRouteAccess()`** — must migrate to `applyRoutePolicy()` |
| `domain-tools.ts` | Tool slug constants for templates/work-orders | Clean |

---

## 4. Roles, Capabilities, and Tool Access

### 4.1 All 12 Capabilities

| Capability | OWNER | ADMIN | BUILDER | CONTRACTOR | CUSTOMER |
|-----------|-------|-------|---------|------------|----------|
| `system.access` | yes | yes | yes | — | — |
| `governance.access` | yes | yes | — | — | — |
| `builderPanel.access` | yes | yes | — | — | — |
| `users.manage` | yes | yes | — | — | — |
| `categories.edit` | yes | yes | — | — | — |
| `unitOfMeasures.edit` | yes | yes | — | — | — |
| `tool.admin` | yes | — | — | — | — |
| `workOrders.read` | yes | yes | yes | — | — |
| `workOrders.write` | yes | yes | yes | — | — |
| `workOrders.delete` | yes | yes | yes | — | — |
| `workOrders.allocate` | yes | yes | yes | — | — |
| `workOrders.syncTemplate` | yes | yes | yes | — | — |

### 4.2 Role Hierarchy

**Flat.** No inheritance or hierarchy. Each role has an explicit `Set<Capability>` in `ROLE_CAPABILITIES`. Every check is a direct set lookup.

### 4.3 Tool Access Policy

All 4 tools (`products`, `templates`, `properties`, `warehouse`) require OWNER, ADMIN, or BUILDER role. Purely role-based after tool-subscriptions removal.

---

## 5. Database Schema — User Domain

### User Model

```prisma
model User {
  id                     String   @id @default(uuid())
  email                  String   @unique
  password               String                          // bcrypt hash
  role                   Role     @default(CUSTOMER)
  isVerified             Boolean  @default(false)
  hiddenFlooringNavSlugs String[]
  flooringNavOrderSlugs  String[]
  createdAt              DateTime @default(now())
  // Relations: activities, requestedAllocationRuns, tablePreferences, mutationReceipts
}
```

### Missing Fields for Planned Work

| Field | Needed By | Purpose |
|-------|-----------|---------|
| `passwordSetAt` (DateTime?) | FLO-44 | Detect first-login state for password-set flow |
| `deletedAt` (DateTime?) | FLO-45 | Soft-delete pattern if desired (current: hard delete) |
| `provisionedBy` (String?) | FLO-43 | Track which admin provisioned the user |

---

## 6. Layer Readiness for FLO-30

### `packages/domain/` — Current User Content

**None.** Only `shared/table-preferences.ts` exists (types + normalization for table UI preferences). No user roles, capabilities, or governance logic.

**Needed:**
- Role type re-export from `@builders/db`
- Capability type + constant
- `ROLE_CAPABILITIES` map
- All `is*()` / `has*()` / `can*()` check functions from `access-control.ts`
- Governance assertion functions from `user-governance.ts`
- `TOOL_ACCESS_POLICY` + `isToolUnlocked()` from `tool-access.ts`

### `packages/application/` — Current User Content

**None beyond table preferences.** Only `account/table-preferences.ts` exists.

**Needed (for FLO-45):**
- `listUsers(actor)` — paginated, filtered, sorted
- `getUser(actor, id)` — single record with computed permissions
- `updateUser(actor, id, input)` — with governance assertions
- `deleteUser(actor, id)` — with governance assertions
- `provisionUser(actor, input)` — create without password (FLO-43)

### `packages/db/` — Current User Content

**None.** Only `account/table-preference-repository.ts` exists. All user queries live in `server/builder/users.ts` and `server/auth/auth-options.ts`.

**Needed:**
- `findUsers(filter, sort, pagination)` — list with query support
- `findUserById(id)` — single record
- `createUser(data)` — insert without password
- `updateUser(id, data)` — partial update
- `deleteUser(id)` — hard delete
- `findUserLoginActivity(filter)` — activity list
- `createUserLoginActivity(data)` — login tracking (move from auth-options.ts)

---

## 7. Route Migration Status

### Auth Pattern Usage

| Pattern | Routes | Status |
|---------|--------|--------|
| `applyRoutePolicy()` directly | **56** routes | Current canonical pattern |
| `authorizeWorkOrdersRoute()` / `authorizeTemplatesRoute()` | **16** routes | Wraps deprecated `requireRouteAccess()` — needs migration |
| Custom auth (register) | **1** route | Intentionally custom |
| NextAuth handler | **1** route | Framework-managed |
| **Total** | **74** | |

### Deprecated Function Usage

| Deprecated Function | Direct Consumers | Indirect Consumers |
|---------------------|------------------|---------------------|
| `requireRouteAccess()` | **0** API routes | **16** via `templates-work-orders.ts` |
| `enforceRouteRateLimit()` | **0** API routes | **0** |

### Response Helper Usage

`routeJson()` and `routeError()` from `route-helpers.ts` are used by **all 72** API routes. These are NOT deprecated but live in the deprecated file. FLO-32 must relocate them before deleting the file.

---

## 8. Dead Code

| File | Dead Export | Reason |
|------|-----------|--------|
| `server/platform/tool-access.ts` | `hasToolAccess()` | Superseded by `isToolUnlocked()` |
| `server/platform/tool-access.ts` | `getToolCatalog()` | No consumers |
| `server/platform/tool-access.ts` | `isKnownToolSlug()` | No consumers |
| `server/http/route-helpers.ts` | `requireRouteAccess()` | Deprecated — 1 indirect consumer remaining |
| `server/http/route-helpers.ts` | `enforceRouteRateLimit()` | Deprecated — 0 consumers |

---

## 9. Open Decisions

1. **Soft-delete vs hard-delete for users (FLO-45).** Current: hard delete. Should FLO-45 add `deletedAt` for soft-delete? Considerations: UserLoginActivity preserves `userEmail` independently (audit trail survives hard delete), but AppMutationReceipt cascades on delete.

2. **Password field nullable or removed (FLO-43/44).** Admin-provisioned users won't have passwords at creation. Should `password` become `String?` (nullable) or should a separate `UserCredential` model be introduced?

3. **`routeJson()` / `routeError()` destination (FLO-32).** Move to `api-helpers.ts` (natural fit) or `route-policy.ts` (keeps route response helpers together)?

4. **`authorizeWorkOrdersRoute()` migration (FLO-32).** Currently wraps deprecated `requireRouteAccess()`. Convert to wrap `applyRoutePolicy()` (keeps the abstraction) or inline `applyRoutePolicy()` into each route (removes the abstraction)?

5. **Structural auth enforcement (FLO-33).** Current: `applyRoutePolicy()` is called by convention in every route handler. Options: (a) Next.js middleware that rejects unauthenticated requests before route handlers run, (b) a `withRoutePolicy()` HOF that wraps handler functions, (c) keep current pattern but lint for missing calls.

6. **Tool access policy location.** `TOOL_ACCESS_POLICY` is pure business logic (role → tool mapping). Should it move to `packages/domain/` alongside capabilities, or stay close to the catalog definition?

---

## 10. Linear Issue Cross-Reference

### Issue Validation

| Issue | Title | Scope Accurate? | Adjustments Needed |
|-------|-------|-----------------|-------------------|
| **FLO-30** | Move user governance logic from server/builder to packages | **Yes — expand slightly** | Also move `access-control.ts` business logic and `tool-access.ts` policy to `packages/domain/`. Move Prisma calls from `users.ts` and `auth-options.ts` to `packages/db/`. |
| **FLO-32** | Complete migration from route-helpers to route-policy | **Scope adjustment needed** | Auth migration is 97% complete — only `templates-work-orders.ts` still calls deprecated `requireRouteAccess()`. Real remaining work: (1) migrate that file, (2) move `routeJson()`/`routeError()` to non-deprecated location, (3) delete `route-helpers.ts`. Smaller than originally scoped. |
| **FLO-33** | Structurally enforce auth on all API routes | **Yes** | Current state: all routes call `applyRoutePolicy()` by convention. FLO-33 should make this structural (middleware, HOF, or lint rule). No unprotected routes exist today, but enforcement is by discipline not structure. |
| **FLO-39** | Add execution engine coverage tests for web app API routes | **Yes** | 74 routes to cover. Test infrastructure exists in `apps/web/tests/modules/`. |
| **FLO-43** | Replace self-registration with admin-provisioned onboarding | **Yes** | Delete `POST /api/auth/register`, remove "Create Account" from `login-form.tsx`, add admin provisioning endpoint + UI in Users module. Requires `password` field to become nullable in schema. |
| **FLO-44** | Redesign login to email-first two-step flow | **Yes — clarify schema needs** | Needs `passwordSetAt` (DateTime?) on User model to detect first-login state. Login form becomes: email → detect password state → show password input or password-set form. Does NOT require magic links or email verification tokens — it's a UX flow change, not an auth mechanism change. |
| **FLO-45** | Build canonical Users module | **Yes** | Blocked by FLO-30 (user logic must be in packages first). Build list-view + record-view using execution engine. ~~Replace `BuilderUsersPanel` with engine-driven UI~~ (Done — now `modules/admin/`). |

### New Issues Needed

| # | Title | Description | Priority |
|---|-------|-------------|----------|
| **NEW-1** | Remove dead code from `tool-access.ts` | Delete unused exports: `hasToolAccess()`, `getToolCatalog()`, `isKnownToolSlug()`. 3 dead functions after tool-subscriptions cleanup. | Low |
| **NEW-2** | Move Prisma calls out of `auth-options.ts` | `user.findUnique` and `userLoginActivity.create` in NextAuth authorize callback should use `packages/db/` repositories. Currently the only direct Prisma calls in `server/auth/`. | Medium (part of FLO-30) |
| **NEW-3** | Add `passwordSetAt` field to User model | Schema migration needed before FLO-44. Add nullable DateTime field, backfill existing users with `createdAt` value. | High (blocks FLO-44) |
| **NEW-4** | Make `password` field nullable on User model | Schema migration needed before FLO-43. Admin-provisioned users won't have passwords at creation. | High (blocks FLO-43) |

### Dependency Graph

```
                    ┌─────────┐
                    │  FLO-30 │  Move user governance to packages
                    └────┬────┘
                         │ blocks
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         ┌────────┐ ┌────────┐ ┌────────┐
         │ FLO-45 │ │ FLO-43 │ │ FLO-44 │
         └────────┘ └───┬────┘ └───┬────┘
                        │          │
                    ┌───┘          │
                    ▼              │
               ┌─────────┐        │
               │  NEW-4  │        │
               │ nullable │        │
               │ password │        │
               └─────────┘        │
                              ┌───┘
                              ▼
                         ┌─────────┐
                         │  NEW-3  │
                         │ passwordSetAt
                         └─────────┘

  Independent:
  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
  │ FLO-32 │  │ FLO-33 │  │ FLO-39 │  │ NEW-1  │
  └────────┘  └────────┘  └────────┘  └────────┘
```

### Execution Plan

**Phase 1: Foundation (FLO-30 + NEW-1 + NEW-2)**
Move user governance logic to packages. This unblocks everything downstream.
1. Create `packages/domain/src/auth/` — move capabilities, role checks, governance assertions, tool access policy
2. Create `packages/db/src/account/user-repository.ts` — move all user Prisma queries from `server/builder/users.ts` and `server/auth/auth-options.ts`
3. Create `packages/application/src/account/users.ts` — move user CRUD orchestration from `server/builder/users.ts`
4. Update `server/builder/users.ts` to thin delegation layer
5. Update `server/auth/auth-options.ts` to use `packages/db/` for user lookup and login activity
6. Delete dead code from `tool-access.ts` (NEW-1)

**Phase 2: Route Infrastructure (FLO-32 + FLO-33)**
Complete route-helpers migration and add structural enforcement.
1. Move `routeJson()` and `routeError()` from `route-helpers.ts` to `api-helpers.ts` (or `route-policy.ts`)
2. Update all 72 import sites
3. Migrate `authorizeTemplatesRoute()` / `authorizeWorkOrdersRoute()` to use `applyRoutePolicy()`
4. Delete `route-helpers.ts`
5. Implement structural auth enforcement (FLO-33): middleware, HOF wrapper, or lint rule

**Phase 3: Auth Flow Changes (FLO-43 + FLO-44 + NEW-3 + NEW-4)**
Prerequisite schema migrations, then auth flow changes.
1. Schema migration: make `password` nullable (NEW-4)
2. Schema migration: add `passwordSetAt` field (NEW-3)
3. Remove self-registration: delete `/api/auth/register`, simplify `login-form.tsx` (FLO-43)
4. Add admin provisioning endpoint and use case
5. Redesign login form to email-first two-step flow (FLO-44)

**Phase 4: Users Module (FLO-45)**
Build canonical Users module with execution engine.
1. Create user list-view controller + component
2. Create user record-view section controller + component
3. Wire to `packages/application/` use cases from Phase 1
4. ~~Replace `BuilderUsersPanel` with engine-driven UI~~ (Done — now `modules/admin/`)
5. Add user provisioning UI (from FLO-43)

**Phase 5: Testing (FLO-39)**
Add execution engine coverage tests for all API routes.
1. Prioritize auth/builder routes (highest governance risk)
2. Cover remaining resource routes
3. Test rate limiting, idempotency, and concurrency control
