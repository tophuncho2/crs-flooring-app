# User Governance Domain

> **Scope:** User governance, authentication flow, role hierarchy, and user lifecycle.

## Role Hierarchy

| Role | Rank | Provisioning | System Access |
|------|------|-------------|---------------|
| OWNER | 3 | CLI only (`npm run db:upsert-owner`) | Full |
| ADMIN | 2 | Admin panel (by OWNER or ADMIN) | Full |
| BUILDER | 1 | Admin panel (by OWNER or ADMIN) | Full (when verified) |
| CONTRACTOR | — | N/A | None (rejected at login) |
| CUSTOMER | — | N/A | None (rejected at login) |

## Governance Truth Table

Core rule: actor can modify target only if actor's rank is strictly above target's rank, and it's not a self-action.

| Actor | Action | Target | Allowed? |
|-------|--------|--------|----------|
| OWNER | Update/Delete | ADMIN | ✅ |
| OWNER | Update/Delete | BUILDER | ✅ |
| OWNER | Update/Delete | OWNER | ❌ |
| OWNER | Promote BUILDER→ADMIN | BUILDER | ✅ |
| OWNER | Demote ADMIN→BUILDER | ADMIN | ✅ |
| ADMIN | Update/Delete | BUILDER | ✅ |
| ADMIN | Update/Delete | ADMIN | ❌ |
| ADMIN | Update/Delete | OWNER | ❌ |
| ADMIN | Promote BUILDER→ADMIN | BUILDER | ✅ |
| ADMIN | Demote ADMIN→BUILDER | ADMIN | ❌ |
| BUILDER | Any admin action | Anyone | ❌ |
| Any | Self-delete | Self | ❌ |
| Any | Self-role-change | Self | ❌ |

Valid role transitions via admin panel: BUILDER↔ADMIN only. OWNER is never a transition target or source.

## User Lifecycle

OWNER/ADMIN creates user → { email, role, password: null, isVerified: false }
User visits login → enters email → PASSWORD_SETUP_REQUIRED
User sets password via POST /api/auth/set-password → { password: hashed, isVerified: true }
Subsequent logins → email-first, then password


## Domain Layer (`packages/domain/src/admin/`)

Pure predicates and message builders. No I/O, no error classes.

- `canActorModifyTarget(actor, target)` — core governance gate
- `canCreateUser(actorRole)` — OWNER or ADMIN only
- `isValidCreationRole(role)` — ADMIN or BUILDER only
- `isValidRoleTransition(from, to)` — BUILDER↔ADMIN only
- `canUpdateUserStatus`, `canDeleteUser`, `canChangeUserRole` — wrappers over core gate
- `computeGovernancePermissions(actor, target)` — returns { canUpdateStatus, canChangeRole, canDelete }
- `resolveGovernedVerification(role, input, fallback)` — OWNER/ADMIN always true

## Application Layer (`packages/application/src/admin/`)

Use cases with `GovernanceExecutionError` (code, status, field, payload):

- `createManagedUserUseCase` — governance + role validation, creates with null password
- `updateManagedUserUseCase` — governance + role transition validation
- `deleteManagedUserUseCase` — governance check, hard delete
- `listManagedUsersUseCase` — returns users with computed permissions
- `getManagedUserUseCase` — single user with permissions
- `setUserPasswordUseCase` — one-shot, flips isVerified: true

## Data Layer (`packages/db/src/admin/`)

- `findManagedUsers`, `findManagedUserById`, `findUserByEmail` — read
- `createManagedUser`, `updateManagedUser`, `deleteManagedUser`, `setUserPassword` — write
- Shared: `ManagedUserRecord`, `managedUserSelect`, `normalizeManagedUserRow`

## API Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/admin/users` | List managed users |
| POST | `/api/admin/users` | Create user (email + role) |
| GET | `/api/admin/users/[id]` | Get user detail |
| PATCH | `/api/admin/users/[id]` | Update user role |
| DELETE | `/api/admin/users/[id]` | Delete user |
| POST | `/api/auth/set-password` | First-time password setup (unauthenticated, rate limited 5/5min) |

## Related Docs

- [../../../layers/server/AUTH.md](../../../layers/server/AUTH.md) — authentication flow and session management
- [../../../layers/server/AUTHORIZATION.md](../../../layers/server/AUTHORIZATION.md) — roles, capabilities, tool access
- [../../../ACCEPTED_EXCEPTIONS.md](../../../ACCEPTED_EXCEPTIONS.md) — admin endpoints skip optimistic concurrency