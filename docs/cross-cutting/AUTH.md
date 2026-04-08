# Authentication

> **Scope:** Identity resolution — how users prove who they are. Session management, token contents, login flow.
> **Location:** `apps/web/server/auth/auth-options.ts`, `apps/web/server/auth/session.ts`

## Rules

1. Authentication uses NextAuth with a single CredentialsProvider (email + password).
2. Sessions are JWT-based. Token contains `id`, `email`, `role`, and `isVerified`.
3. `requireSessionUser()` is the structural enforcement point — called in Server Component layouts to gate all `/dashboard/*` routes.
4. Session resolution never hits the database after login — all data is in the JWT.
5. CONTRACTOR and CUSTOMER roles are rejected at login (`hasSystemAccess()` check).

## Contract

### Login Flow

```
LoginForm (signIn("credentials", { email, password }))
  → NextAuth CredentialsProvider:
    1. Normalize email (trim, lowercase)
    2. Rate-limit: 10 attempts / 10 min per IP
    3. prisma.user.findUnique({ where: { email } })
    4. bcrypt.compare(password, user.password)
    5. hasSystemAccess(user.role) — reject CONTRACTOR/CUSTOMER
    6. Verification: OWNER/ADMIN bypass, BUILDER must be isVerified
    7. prisma.userLoginActivity.create()
    8. Return { id, email, role, isVerified }
  → JWT callback stores id, role, isVerified in token
  → Session callback populates session.user
  → Client redirects to /dashboard/inventory
```

### Session Resolution

```typescript
type SessionUser = {
  id: string
  email: string
  role: Role
  isVerified: boolean
}

requireSessionUser(): Promise<SessionUser>
  // 1. getServerSession(getAuthOptions())
  // 2. No user → redirect("/login")
  // 3. !hasSystemAccess → redirect("/login")
  // 4. !isVerified && !canBypassVerification → redirect("/login?restricted=1")
```

### `getSessionUser()` vs `requireSessionUser()`

- `getSessionUser()` — returns `SessionUser | null`. Used in API routes where auth failure returns a Response.
- `requireSessionUser()` — returns `SessionUser`. Used in Server Components where auth failure redirects.

## Patterns

- Dashboard layout (`app/dashboard/layout.tsx`) calls `requireSessionUser()` — structural gate for all dashboard pages.
- API routes use `applyRoutePolicy()` which internally calls `getSessionUser()`.
- Login activity tracked via `UserLoginActivity` model on every successful login.

## Anti-Patterns

1. **Do not** check authentication in individual page components — rely on the layout gate.
2. **Do not** store sensitive data beyond id/email/role/isVerified in the JWT.
3. **Do not** call the database during session resolution — JWT is self-contained.
4. **Do not** use `getSessionUser()` in Server Components — use `requireSessionUser()` which redirects.

## Related Docs

- [AUTHORIZATION.md](AUTHORIZATION.md) — what authenticated users are allowed to do
- [../execution/ROUTE_POLICY.md](../execution/ROUTE_POLICY.md) — API route auth enforcement
