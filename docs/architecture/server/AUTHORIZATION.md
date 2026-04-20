# Authorization

> **Scope:** Roles, capabilities, and tool access. What authenticated users are allowed to do.
> **Location:** `apps/web/server/auth/access-control.ts`, `apps/web/server/platform/tool-access.ts`


## Rules

1. Authorization is flat — no role hierarchy, no inheritance. Each role has an explicit `Set<Capability>`.
2. Every capability check is a direct set lookup via `hasCapability(role, capability)`.
3. Tool access is purely role-based via `isToolUnlocked(role, slug)`.
4. `canEditRole()` always returns false — role editing is not exposed in the UI.
5. Governance users (OWNER/ADMIN) bypass the `isVerified` check.

## 5 Roles

| Role | System Access | Governance | Tool Access |
|------|:------------:|:----------:|:-----------:|
| **OWNER** | Yes | Yes | All tools + admin |
| **ADMIN** | Yes | Yes | All tools |
| **BUILDER** | Yes | No | All tools |
| **CONTRACTOR** | No | No | None |
| **CUSTOMER** | No | No | None |

## 11 Capabilities

| Capability | OWNER | ADMIN | BUILDER |
|-----------|:-----:|:-----:|:-------:|
| `system.access` | Y | Y | Y |
| `governance.access` | Y | Y | - |
| `builderPanel.access` | Y | Y | - |
| `users.manage` | Y | Y | - |
| `tool.admin` | Y | - | - |
| `workOrders.read` | Y | Y | Y |
| `workOrders.write` | Y | Y | Y |
| `workOrders.delete` | Y | Y | Y |
| `workOrders.allocate` | Y | Y | Y |
| `workOrders.syncTemplate` | Y | Y | Y |

CONTRACTOR and CUSTOMER have zero capabilities.

## Tool Access Policy

4 tools, all requiring OWNER, ADMIN, or BUILDER:

| Tool Slug | Roles |
|-----------|-------|
| `products` | OWNER, ADMIN, BUILDER |
| `templates` | OWNER, ADMIN, BUILDER |
| `properties` | OWNER, ADMIN, BUILDER |
| `warehouse` | OWNER, ADMIN, BUILDER |

## Key Functions

| Function | Purpose |
|----------|---------|
| `hasCapability(role, cap)` | Core lookup — checks `ROLE_CAPABILITIES` map |
| `isToolUnlocked(role, slug)` | Checks `TOOL_ACCESS_POLICY` for the role |
| `getUserToolContext(role)` | Returns all tools with `isUnlocked` per role |
| `hasSystemAccess(role)` | Shorthand for `system.access` capability |
| `hasGovernanceAccess(role)` | Shorthand for `governance.access` capability |
| `canAccessBuilderPanel(email, role)` | Gate for `/dashboard/builder` |
| `canManageUsers(email, role)` | Gate for user CRUD operations |
| `canBypassVerification(email, role)` | OWNER/ADMIN skip `isVerified` check |
| `ensureCapability(cap, request)` | Route-level enforcement — returns 403 Response on failure |

## Anti-Patterns

1. **Do not** build role hierarchies — each role's capabilities are explicit and flat.
2. **Do not** check roles directly (`if role === "ADMIN"`) — use `hasCapability()`.
3. **Do not** gate features by user ID — gate by role and capability only.
4. **Do not** add capabilities without updating the `ROLE_CAPABILITIES` map for all roles.

## Related Docs

- [AUTH.md](AUTH.md) — how users authenticate before authorization
- [ROUTE_POLICY.md](ROUTE_POLICY.md) — where authorization is enforced
- [../../module-anatomy/shared/NAVIGATION_SHELL.md](../../module-anatomy/shared/NAVIGATION_SHELL.md) — UI navigation gating
