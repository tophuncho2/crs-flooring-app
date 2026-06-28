# Auth Redesign — Better Auth + Google Workspace SSO

**One-liner:** Retire the pre-historic NextAuth-v4 credentials setup and the `isVerified`
band-aid. Replace with **Better Auth** (self-hosted, lives in our own Postgres) using
**Google Workspace SSO**, **invite-only + rank-scoped**, **passwordless**. Employees-only
now; outside-email access is architected to be additive later, not a rebuild.

# ✅ CHECKLIST — read this first

### Decisions (locked)
- [x] **Library:** Better Auth — self-hosted, data stays in our Postgres via Prisma. (NOT a hosted SaaS like Clerk; NOT NextAuth/Auth.js — that's maintenance-mode now.)
- [x] **Sign-in:** Google Workspace SSO, domain-locked to `@companyname` (one-line `hd` setting, enforced server-side).
- [x] **Onboarding:** invite-only. A manager generates a rank-scoped invite link; the invitee signs in with Google → active.
- [x] **Passwords:** none. No password column, no reset flow, no bcrypt.
- [x] **`isVerified`:** removed. Google verifies identity; the invite authorizes access.
- [x] **Rank:** kept exactly as-is — `UserRank` stays the domain authority; the guards we already shipped (`canManageUsers`, `requireManageUsersAccess`, `enforceManageUsersAccess`) are unchanged.
- [ ] **Outside / non-Workspace users:** deferred. Add a 2nd provider (email+password or magic-link) only when actually needed; the invite table already carries them.

### Pros
- [x] **Passwordless** → the biggest source of pre-historic pain (reset, verify, hashing) simply *deletes*. Smaller attack surface.
- [x] **Automatic offboarding** → when IT disables someone's Google account, their access to this app dies the same instant. No orphaned credentials.
- [x] **Inherits Google's security** → MFA, password policy, anomaly detection, account recovery — we maintain none of it.
- [x] **We still own all data** → users/sessions live in our Postgres, Prisma-native. No vendor lock-in.
- [x] **Actively-maintained standard** → low abandonment risk (the thing that killed Lucia and stalled NextAuth).
- [x] **Sessions become revocable** → DB-backed + cookie-cache; we can kill a session instantly, and login history is native (retires the hand-fed `UserLoginActivity`).
- [x] **Rank work preserved** → no rework of the recent UserRank epic.

### Cons / costs
- [ ] **It's a migration of the security core** → the login path on a live system; needs disciplined cutover (test in dev, keep a rollback).
- [ ] **New dependency owns the auth tables** → `user` / `session` / `account` / `verification` (all in our DB, but Better Auth-shaped).
- [ ] **Session model changes** → JWT → DB-backed + cookie-cache (this is an upgrade, but it's a change to the auth plumbing).
- [ ] **Single identity provider** → if Google SSO is down, nobody logs in. Rare; acceptable for an internal tool. (A fallback provider removes this later.)
- [ ] **Outside users can't log in** until the 2nd provider is added (intentional for v1).
- [ ] **Up-front Google Cloud setup** → one OAuth client + redirect URIs per environment.

### Doors this opens (the upside of going Google-native)
- [ ] **Calendar** → push work orders / installs onto crews' Google Calendars (we already track `scheduledFor` + `timeOfDay`).
- [ ] **Gmail send-as** → email WO confirmations, picking tickets, invoices from the company domain.
- [ ] **Drive** → file the PDFs we already generate (plan files, picking tickets) into shared Drive folders.
- [ ] **Workspace Directory / Admin SDK** → sync/auto-suggest who should have an account.
- [ ] **Future auth features** → magic links, passkeys, 2FA, more social providers = Better Auth plugins, no rebuild.
- [ ] **Contractor/customer access** → flip on a second provider later; additive.

### What you should know (facts + risk)
- [x] **Scalable — not a concern.** Cookie-cache gives JWT-like per-request speed (no DB read on normal requests) while keeping revocability; Redis (the one we just wired up) can be the shared session store across instances; horizontal-scale friendly. Wildly overprovisioned for an internal tool.
- [x] **Existing users are safe.** Their rows stay (same email); first Google sign-in links the `account`. **Nobody is forced to reset and nobody is locked out.**
- [x] **Domain lock is enforced server-side** — Better Auth rejects any Google token whose hosted-domain claim isn't `@companyname`.
- [x] **Branch scope:** dev-4 is dedicated to this until it's done. Build + test fully in dev (which has its own Redis and will have its own Google client) before promoting.

----------------------------------------------------------------------------------------

# 🟦 PLATFORM WORK (Google Cloud + other platforms)

Do these before/alongside the code work. **You own these; I'll guide.**

### Google Cloud
- [ ] Use the existing Google Cloud project (or create one) for the company.
- [ ] **OAuth consent screen → User Type = Internal.** This auto-restricts the app to your Workspace (only `@companyname` accounts can ever consent).
- [ ] Create an **OAuth 2.0 Client ID** (type: Web application).
- [ ] Add **Authorized redirect URIs**, one per environment:
  - `http://localhost:3000/api/auth/callback/google` (local dev)
  - `https://<dev-domain>/api/auth/callback/google`
  - `https://<staging-domain>/api/auth/callback/google`
  - `https://<main-domain>/api/auth/callback/google`
- [ ] Copy the **Client ID** + **Client Secret**.
- [ ] *(Later, only when building integrations)* enable Calendar / Gmail / Drive APIs and add their scopes — not needed for sign-in.

### Google Workspace Admin
- [ ] Confirm every employee is on an `@companyname` address.
- [ ] Confirm the internal OAuth app is permitted (internal apps are allowed by default; verify no org policy blocks it).

### Railway (env vars — per environment: dev, staging, main, + local `.env`)
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `BETTER_AUTH_SECRET` (long random string; distinct per env)
- [ ] `BETTER_AUTH_URL` = that environment's public base URL (must match the redirect URI host)
- [ ] *(reuse)* the Redis URL we already wired can back shared sessions.

### DNS / domains
- [ ] Each environment's `BETTER_AUTH_URL` and redirect URI must match its real public URL.

----------------------------------------------------------------------------------------

# 🟩 CODE WORK (what needs to happen, by layer)

### Install
- [ ] `npm i better-auth` + run its CLI to generate the Prisma schema additions and the auth instance scaffold.
- [ ] Configure the Better Auth instance: Prisma adapter, Google social provider with `hd: "companyname.com"`, session cookie-cache, (optional) Redis secondary storage, `rank` as an additional user field.

### Schema (you run the migration)
- [ ] Add Better Auth tables: `user`, `session`, `account`, `verification`.
- [ ] Reconcile our `User`: **keep `rank`**; **drop `password` + `isVerified`**.
- [ ] Add a lean **`UserInvite`** table (`email`, `rank`, `token`, `invitedBy`, `expiresAt`, `acceptedAt`). *(Deliberately NOT the org/teams plugin — we're a single company; that'd be over-abstraction.)*
- [ ] `AppMutationReceipt.userId` stays valid (still a string id).
- [ ] Retire `UserLoginActivity` in favor of native `session` rows (re-point the Login Activity page at sessions). *(Or keep the table fed by a hook if we want the exact current columns — decide at build time.)*
- [ ] Data migration: existing users keep rows; `account` link is created on first Google login.

### Auth engine (`apps/web/server/auth/`)
- [ ] Replace NextAuth (`auth-options.ts`, `app/api/auth/[...nextauth]/route.ts`) with the Better Auth handler (`/api/auth/[...all]`).
- [ ] Rewrite `session.ts` (`getSessionUser` / `requireSessionUser` / `requireManageUsersAccess`) on Better Auth's session API — **keep the `SessionUser{ id, email, rank }` shape and the rank guards.**
- [ ] Rewrite `route-auth.ts` (`authorizeRouteAccess`, `enforceManageUsersAccess`) on the Better Auth session — rank logic unchanged.
- [ ] Sign-in hook: enforce domain = `@companyname` **and** a matching open invite (employees-only + invite-only).

### Domain / Data / Application
- [ ] Retire the `authenticate-credentials` use case (no passwords).
- [ ] New use cases (layered as usual): `createInvite` (manager-gated, rank-scoped), `acceptInvite`, plus `changeUserRank` / `deactivateUser`.
- [ ] Invite read/write repositories.

### API
- [ ] Better Auth mounts its own auth routes.
- [ ] Add invite endpoints (create [manager-gated] / accept) through the canonical gauntlet (rate-limit, telemetry, idempotency).

### Module / UI
- [ ] Login page → single **"Sign in with Google"** button; remove the email/password form.
- [ ] Users page → **invite** (rank-scoped) + **change rank** + **deactivate** actions, gated to DEVELOPER + TIER_1 (gate already exists).
- [ ] Remove any password UI.

### Cutover
- [ ] Wire config + secrets per env.
- [ ] Migrate data.
- [ ] **Test the full invite → Google sign-in → active flow end-to-end in dev** before promoting.
- [ ] Promote dev → staging → main with the rank-gating + auth swap together; keep a rollback path.

### Deferred (pre-architected, not built now)
- [ ] Outside/non-Workspace users → enable a 2nd provider (email+password or magic-link); the `UserInvite` table already carries them.
- [ ] Google Calendar / Gmail / Drive → request extra scopes when those features are built; the OAuth foundation is already laid.
