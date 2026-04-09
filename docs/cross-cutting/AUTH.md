```markdown
# Authentication

> **Scope:** Identity resolution — how users prove who they are. Session management, token contents, login flow.
> **Location:** `apps/web/server/auth/auth-options.ts`, `apps/web/server/auth/session.ts`

## Rules

1. Authentication uses NextAuth with a single CredentialsProvider.
2. Sessions are JWT-based. Token contains `id`, `email`, `role`, and `isVerified`.
3. `requireSessionUser()` is the structural enforcement point — called in Server Component layouts to gate all `/dashboard/*` routes.
4. Session resolution never hits the database after login — all data is in the JWT.
5. CONTRACTOR and CUSTOMER roles are rejected at login (`hasSystemAccess()` check).
6. No self-registration. Users are created exclusively by OWNER/ADMIN via the admin panel.
7. New users are created with `password: null` and `isVerified: false`. Password is set on first login.

## Contract

### Login Flow (Email-First, Three-Step)

```
Step 1 — Email check:
  LoginForm submits signIn("credentials", { email, password: "" })
  → NextAuth CredentialsProvider authorize():
    1. Normalize email (trim, lowercase)
    2. Rate-limit: 10 attempts / 10 min per IP
    3. prisma.user.findUnique({ where: { email } })
    4. User not found → throw "USER_NOT_FOUND"
    5. User found, password is null → throw "PASSWORD_SETUP_REQUIRED"
    6. User found, password set, bcrypt.compare("", hash) fails → throw "INVALID_CREDENTIALS"
  → Client reads error code:
    - USER_NOT_FOUND → show error, stay on email step
    - PASSWORD_SETUP_REQUIRED → show set-password form (Step 2a)
    - INVALID_CREDENTIALS → show password field (Step 2b)

Step 2a — First-time password setup (new user):
  LoginForm submits POST /api/auth/set-password { email, password }
  → setUserPasswordUseCase:
    1. Find user by email
    2. Verify password is null (one-shot — rejects if already set)
    3. Hash password with bcrypt
    4. Set password + isVerified: true (atomic)
  → Rate limit: 5 attempts / 5 min per IP
  → On success: auto-signs in with new password

Step 2b — Normal login (returning user):
  LoginForm submits signIn("credentials", { email, password })
  → authorize():
    1-3. Same as Step 1
    4. bcrypt.compare(password, user.password)
    5. hasSystemAccess(user.role) — reject CONTRACTOR/CUSTOMER
    6. canBypassVerification check — OWNER/ADMIN bypass, BUILDER must be isVerified
    7. prisma.userLoginActivity.create()
    8. Return { id, email, role, isVerified }
  → JWT callback stores id, role, isVerified in token
  → Session callback populates session.user
  → Client redirects to /dashboard/inventory
```

### Error Codes from authorize()

| Code | Meaning | Client Action |
|------|---------|---------------|
| `USER_NOT_FOUND` | Email not in system | Show error, stay on email step |
| `PASSWORD_SETUP_REQUIRED` | User exists, no password set | Show set-password form |
| `INVALID_CREDENTIALS` | Wrong password (or empty password probe for existing user) | Show password field |
| `ACCOUNT_RESTRICTED` | User has password but isVerified: false | Show restricted message |
| `RATE_LIMITED` | Too many attempts | Show rate limit message |

### Set-Password Endpoint

```
POST /api/auth/set-password (unauthenticated)
  - Rate limit: 5 attempts / 5 min per IP
  - Input: { email, password } (min 8 characters)
  - Only works for users with password IS NULL
  - Sets password + isVerified: true atomically
  - Returns { ok: true }
```

### User Lifecycle

```
1. OWNER/ADMIN creates user via admin panel → { email, role, password: null, isVerified: false }
2. User visits login → enters email → PASSWORD_SETUP_REQUIRED
3. User sets password → { password: hashed, isVerified: true }
4. Subsequent logins → normal email + password flow
```

### OWNER Provisioning

OWNERs are created via CLI only:
```bash
npm run db:upsert-owner -- email password
```
This sets `role: "OWNER"`, `isVerified: true`, and hashes the password. No UI path exists for creating OWNERs.

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
5. **Do not** allow self-registration — users are created by OWNER/ADMIN only.
6. **Do not** set passwords during user creation — password is set by the user on first login.

## Related Docs

- [AUTHORIZATION.md](AUTHORIZATION.md) — what authenticated users are allowed to do
- [../execution/ROUTE_POLICY.md](../execution/ROUTE_POLICY.md) — API route auth enforcement
```