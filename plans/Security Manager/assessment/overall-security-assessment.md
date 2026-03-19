# Overall Security Assessment

Date: 2026-03-19

## Executive Summary

Current rating: high risk

The project has the beginnings of a workable internal security model:
- password hashing with `bcrypt`
- NextAuth-based session handling
- route-level authentication checks on many internal API endpoints
- some input validation and normalized API error handling

That said, the current system is not yet operating at a high-trust or production-hardened security level. The main reason is that several core security boundaries are still based on broad trust assumptions rather than restrictive controls. The most serious issue is that the public registration endpoint currently creates verified `ADMIN` users directly. That single flaw makes the present posture unacceptable for any environment exposed outside a tightly controlled dev setup.

## What Is Working

### 1. Authentication foundation exists

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/server/auth/auth-options.ts`
- `/Users/ottohull/builderswebapp/builderswebapp/app/api/auth/[...nextauth]/route.ts`

Notes:
- credentials authentication is wired through NextAuth
- passwords are checked with `bcrypt.compare`
- session state is carried in JWT-backed NextAuth sessions

### 2. Many protected routes enforce a session

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/server/auth/route-auth.ts`
- multiple routes under `/Users/ottohull/builderswebapp/builderswebapp/app/api/flooring`

Notes:
- the codebase consistently uses `ensureBuilderOrAdmin`, `ensureAuthenticated`, `ensureBuilderOnly`, and `ensureBuilderPanelAccess` across much of the API surface
- dashboard pages also use `requireSessionUser` or `requireToolAccess`

### 3. Basic input validation exists

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/server/http/api-helpers.ts`
- validators under `/Users/ottohull/builderswebapp/builderswebapp/features/flooring`

Notes:
- the project has started validating payloads and normalizing Prisma failures
- this lowers accidental bad-data risk, though it is not a substitute for a broader security model

## Critical Findings

### 1. Public self-registration creates verified admins

Severity: critical

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/app/api/auth/register/route.ts`

Current behavior:
- unauthenticated callers can POST email and password
- new users are created with `role: "ADMIN"`
- new users are created with `isVerified: true`

Impact:
- full privilege escalation from the public internet
- complete compromise of user management and protected business data
- no meaningful security posture is possible until this is removed or tightly gated

### 2. Authorization model is too coarse

Severity: high

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/server/auth/access-control.ts`
- `/Users/ottohull/builderswebapp/builderswebapp/server/platform/tool-subscriptions.ts`

Current behavior:
- `hasSystemAccess` is effectively `ADMIN` or `BUILDER`
- most privilege checks collapse to role-only decisions
- tool access currently resolves to full access for any system role

Impact:
- weak least-privilege enforcement
- no separation between administration, operations, and domain-specific access
- difficult to scale safely as more modules, people, and tenants are added

### 3. Builder user-management powers are effectively unrestricted

Severity: high

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/app/api/builder/users/[id]/route.ts`
- `/Users/ottohull/builderswebapp/builderswebapp/app/api/builder/users/bulk/route.ts`

Current behavior:
- builder-panel access can change user roles
- builder-panel access can verify or restrict users
- bulk endpoints can verify all users or restrict all users with no narrower guardrail
- delete operations have no self-protection or last-admin protection

Impact:
- a single builder-level session can make broad identity and authorization changes
- easy to create lockouts, privilege mistakes, or destructive auth incidents

### 4. No visible rate limiting or brute-force protection

Severity: high

Observed in:
- login and registration flow
- no rate-limiting implementation found in the application code

Impact:
- credential stuffing and password-guessing risk
- abuse risk on login, registration, uploads, and write-heavy endpoints
- denial-of-service exposure increases as the system scales

### 5. Middleware perimeter is too narrow

Severity: medium

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/proxy.ts`

Current behavior:
- middleware matcher is only `"/dashboard"`

Impact:
- API hardening depends almost entirely on each route remembering to protect itself
- easier to introduce future unprotected endpoints by omission

### 6. Upload pipeline lacks visible hardening

Severity: medium

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/app/api/flooring/product-photos/route.ts`
- `/Users/ottohull/builderswebapp/builderswebapp/server/storage/s3.ts`

Current behavior:
- uploaded file type is accepted from client-provided metadata
- no visible file-size cap
- no content inspection, malware scanning, or image validation
- returned URLs are built directly from configured endpoint and bucket path

Impact:
- storage abuse
- malicious content hosting
- oversized upload and cost amplification risk

### 7. Verification state is not a meaningful boundary yet

Severity: medium

Observed in:
- `/Users/ottohull/builderswebapp/builderswebapp/server/auth/access-control.ts`
- `/Users/ottohull/builderswebapp/builderswebapp/app/dashboard/layout.tsx`
- `/Users/ottohull/builderswebapp/builderswebapp/app/api/account/flooring-nav/route.ts`

Current behavior:
- system access is based mainly on role
- verification checks are bypassed for system roles
- registration already marks accounts verified

Impact:
- the verification flag does not currently provide real security value
- account lifecycle controls are incomplete

## Overall Maturity Assessment

Security maturity today: early foundation, not hardened

Assessment by area:
- authentication: moderate foundation, not production hardened
- authorization: weak
- privilege management: weak
- API protection consistency: moderate
- secrets handling: partial
- file-upload security: weak
- monitoring and auditability: partial
- operational resilience against abuse: weak

## Recommended Security Program

### Phase 1: Immediate containment

Do first:
- remove or lock down public registration immediately
- stop automatic creation of `ADMIN` accounts from unauthenticated requests
- require an explicit bootstrap mechanism for the first privileged user
- add login and registration rate limiting
- add stricter guards around user role changes, verification changes, and bulk user actions

### Phase 2: Authorization redesign

Build next:
- define a real permission model beyond `ADMIN` and `BUILDER`
- separate identity administration from operational tool usage
- move from broad role checks to permission checks per capability
- document which roles can read, create, update, delete, approve, upload, and administer

### Phase 3: Platform hardening

Add:
- security headers and CSP
- central API policy enforcement
- audit logs for auth events, role changes, verification changes, and destructive actions
- session hardening and token lifetime review
- secure upload validation and size limits
- environment validation for required secrets at startup

### Phase 4: Trustworthy scale

Required for high-confidence operation:
- tenant or domain isolation strategy if multiple organizations will use the system
- periodic access reviews
- incident response playbooks
- backup and restore validation
- dependency and vulnerability scanning in CI
- security-focused test coverage for authz regressions

## Target State

To meet the stated goal of being scalable, trustworthy, safe, reliable, and highly protected, this project should target:
- deny-by-default authorization
- least privilege by capability, not just by role name
- no public privilege-escalation paths
- auditable changes to access and data
- abuse controls on every authentication and write-heavy path
- secure defaults for storage, sessions, secrets, and deployment

## Immediate Conclusion

The project is not yet at a high-security operating level.

The architecture is recoverable and already has a usable base, but the current identity and privilege controls contain critical gaps that must be corrected before the system can be considered trustworthy in production. The first milestone is not adding more security features. It is removing the existing privilege-escalation path and replacing the current broad trust model with explicit, least-privilege controls.
