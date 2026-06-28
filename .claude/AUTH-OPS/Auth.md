# Auth.md — Better Auth + Google SSO survey

> Read end-to-end from the live code (2026-06-28, dev-4). Authoritative over memory/brief.
> Surface: **Better Auth + Google Workspace SSO**, passwordless, invite-gated, domain-locked to
> `@crsfloorcovering.com`, authorization by `UserRank` (DEVELOPER + TIER_1..3). NextAuth + bcrypt retired.

---

## Doors open

Things now *possible* because identity is real Google Workspace SSO instead of local credentials.

- [ ] **Google profile name + avatar are already flowing in but unused.** `User.name` and `User.image`
  (`packages/db/prisma/schema.prisma:19,22`) are populated by Google on sign-in, yet the UI still derives
  the avatar from `email.charAt(0)` (`apps/web/modules/app-shell/components/user-menu.tsx:19`) and
  `SessionUser` drops both fields (`apps/web/server/auth/session.ts:7-11,29-33`). Low-effort win: thread
  `name`/`image` onto `SessionUser` and render the real photo + display name in `UserMenu`.
- [ ] **`hd`-locked org identity = email IS identity.** Google's `hd` hint (`better-auth.ts:35`) +
  the in-hook `endsWith` re-check (`better-auth.ts:72`) guarantee every account is a verified
  `@crsfloorcovering.com` Workspace user. No cross-domain impersonation, no unverified emails — so email
  is a safe, stable primary key for joins, actor stamping, and the invite email-match gate.
- [ ] **Google API scopes are one config line away.** The `Account` row already persists
  `accessToken` / `refreshToken` / `scope` / `idToken` (`schema.prisma:57-62`). Add scopes to
  `socialProviders.google` (`better-auth.ts:31-37`) and you can call Google APIs *as the signed-in user*:
  Calendar (push WO schedule dates as events), Drive (store generated plan-file / picking-ticket PDFs),
  Gmail (send invite or WO notifications from the company domain). The claude.ai MCP servers for
  Calendar / Gmail / Drive are already connected in this session — natural integration targets.
- [ ] **Group-based rank from Workspace.** Instead of hand-managed invites, `UserRank`
  (`packages/domain/src/management/users/rank.ts:11`) could be derived from Google Workspace group
  membership via the Admin SDK — a manager adds someone to a group, the app maps the group → rank in the
  `user.create.before` hook (`better-auth.ts:68`) rather than requiring a matching `UserInvite` row.
- [ ] **Session device / IP intelligence is captured but not surfaced.** `Session.ipAddress` and
  `Session.userAgent` exist (`schema.prisma:43-44`) but the Login Activity read selects only
  `createdAt` + `user.email` (`packages/db/src/management/user-activity/read-repository.ts:37-42`).
  Doors open: show device / browser / IP / approximate location and "last active" per session, and a
  self-serve "sign out other devices" using the same `deleteUserSessions` path
  (`packages/application/src/management/users/set-user-active.ts:60-63`).
- [ ] **Revocable sessions enable real-time admin control.** DB-backed `Session` rows
  (`schema.prisma:38-50`) mean rank-change and deactivate already revoke instantly
  (`update-user-rank.ts:66-68`, `set-user-active.ts:59-64`). Same lever supports future "force re-auth on
  permission change" or "global sign-out" features the old stateless-JWT credentials setup couldn't.
- [ ] **Passwordless removes a whole class of work.** No password reset, no bcrypt, no "forgot password",
  no credential-stuffing surface — `emailAndPassword` is disabled (`better-auth.ts:29`). MFA/2FA is
  Google's problem now (Workspace can mandate it org-wide).
- [ ] **Invite hardening + lifecycle hooks are now cheap.** The gate is a single function
  (`resolveSignupInviteRank`, `packages/application/src/management/invites/resolve-signup-invite.ts:7`);
  adding a "reject sign-in if a `User` already exists for this email" check, or an audit event on
  accept, is a localized change. Open memory TODO `prune-expired-invites-todo` (GitHub Actions cron to
  `deleteMany` expired `UserInvite` rows) fits here — invites go inert at 7d via `expiresAt`
  (`invite-rules.ts:19-27`) but the row is never deleted except by revoke.

---

## What Better Auth is + why it beats the old NextAuth

- [ ] **What it is.** Better Auth is a self-hosted TypeScript auth library. The instance is built in
  `apps/web/server/auth/better-auth.ts:22` (`betterAuth({...})`) and mounted on one catch-all route,
  `apps/web/app/api/auth/[...all]/route.ts:6` (`toNextJsHandler(auth)`) — it owns sign-in, the Google
  callback, session issuance, and sign-out. The browser talks to it via `createAuthClient()`
  (`apps/web/modules/auth/auth-client.ts:7`); login is one button calling
  `authClient.signIn.social({ provider: "google" })` (`apps/web/modules/auth/components/login-form.tsx:11`)
  and logout is `authClient.signOut()` (`apps/web/modules/app-shell/components/user-menu.tsx:47`).
- [ ] **Self-hosted in our own Postgres via the Prisma adapter.** `prismaAdapter(db, …)`
  (`better-auth.ts:25`) — no external identity store. Better Auth's required tables live in our schema:
  `User`, `Session`, `Account`, `Verification` (`schema.prisma:17,38,52,72`), field-named exactly as
  Better Auth expects (`schema.prisma:35-37`).
- [ ] **Passwordless Google SSO.** `emailAndPassword: { enabled: false }` (`better-auth.ts:29`); the only
  provider is Google with the `hd` company-domain lock (`better-auth.ts:31-37`). Identity = Google;
  authorization = our own `UserRank` model (unchanged from the NextAuth era).
- [ ] **DB-backed, revocable sessions + cookie-cache.** `session.cookieCache` with a 5-min `maxAge`
  (`better-auth.ts:59-61`) gives JWT-like per-request speed *without* losing revocability: the source of
  truth is the `Session` row, so deleting it logs the user out. `getSessionUser`
  (`session.ts:13-34`) reads the session and also rejects `isActive === false`
  (`session.ts:25-27`) to close the brief cookie-cache window after a deactivation.
- [ ] **Server-owned authorization fields.** `additionalFields` declares `rank` + `isActive` with
  `input: false` (`better-auth.ts:51-56`) — surfaced on the session user but never settable from client
  input.
- [ ] **Invite-gated provisioning via database hooks.** `databaseHooks.user.create.before`
  (`better-auth.ts:68`) runs only for brand-new users: re-checks the domain, calls
  `resolveSignupInviteRank` and fails closed (`APIError("FORBIDDEN")`) if there's no open invite, then
  stamps the invited `rank` onto the user (`better-auth.ts:80-87`). The `after` hook retires the invite
  via `markSignupInviteAccepted` (`better-auth.ts:90-92`).
- [ ] **Existing users bypass the gate by design.** `account.accountLinking` with `trustedProviders:
  ["google"]` (`better-auth.ts:42-47`) links a first-time Google sign-in to an existing `User` row by
  verified email — so seeded/break-glass users and anyone migrated from the old setup sign in without a
  matching invite and without resets or lockouts. This is what makes `db:upsert-owner` and the seed work.
- [ ] **Fail-closed env at boot.** The instance consumes `getAuthEnvironment()` (`better-auth.ts:20`),
  not raw `process.env`. `validateAuthEnvironment` (`apps/web/server/platform/env.ts:159-174`) zod-checks
  the four vars (`authEnvironmentSchema`, `env.ts:67-72`) and `assertProductionAuthUrl`
  (`env.ts:137-157`) requires a public https URL on deployed Railway services — a missing/blank/localhost
  value throws at server start instead of producing a silently broken auth instance.

**Concrete advantages over the retired NextAuth credentials setup**

- [ ] **No passwords at all** vs. NextAuth credentials + bcrypt hashing/storage/reset flow (all removed).
- [ ] **Verified identity by construction** — Google + `hd` lock guarantees the email; the old
  credentials path trusted whatever was typed.
- [ ] **Instant, real revocation** — deleting `Session` rows ends access now; the old stateless model
  couldn't reliably revoke mid-session.
- [ ] **Single owned endpoint + typed client** — one `[...all]` route and `authClient` calls, versus
  NextAuth's provider/callback wiring; auth logic is plain TS hooks in our codebase.
- [ ] **Deliberately *not* Better Auth's org/teams plugin** — single company, so the lean `UserInvite`
  row (`schema.prisma:83-97`) replaces team machinery that would be over-abstraction.
- [ ] **Boot-time validation** — fail-closed env (above) replaces the prior fragile `NEXTAUTH_*` setup
  (those vars are being removed from each env).

---

## Users / Login Activity / Invites pages

All three live under the **"Users"** nav group (`apps/web/modules/app-shell/navigation/definitions.ts:13,45-47`),
and all three guard with `requireManageUsersAccess()` as the first await
(`users/page.tsx:16`, `user-activity/page.tsx:16`, `invites/page.tsx:16`).

- [ ] **Who can see them.** `requireManageUsersAccess` → `canManageUsers(rank)` =
  DEVELOPER + TIER_1 only; lower ranks are redirected to `/dashboard/inventory`
  (`apps/web/server/auth/session.ts:51-59`). The nav group is hidden for everyone else via the same
  predicate (`nav-rail.tsx:74-76,124,182`). Every API route re-enforces it server-side with
  `enforceManageUsersAccess` (403) (`apps/web/server/auth/route-auth.ts:33-39`; used in
  `api/invites/route.ts:19,45`, `api/users/[id]/rank/route.ts:27`, `api/users/[id]/active/route.ts:27`).

### Users — `/dashboard/users`

- [ ] **What it does.** Paginated, read-mostly list of all users with two inline interactive controls per
  row (`apps/web/modules/users/components/list/users-client.tsx:29-31,92-100`).
- [ ] **Action 1 — change rank.** Inline `<select>` → `updateUserRankRequest` →
  `PATCH /api/users/[id]/rank` → `updateUserRankUseCase`
  (`packages/application/src/management/users/update-user-rank.ts:23`). Rules: actor must
  `canManageUsers`; the *new* rank and the *current* rank must both be strictly below the actor
  (`canInviteRank` checked twice, `update-user-rank.ts:46`); optimistic-concurrency via
  `expectedUpdatedAt` (409 on mismatch, `update-user-rank.ts:55-63`; the route requires it,
  `api/users/[id]/rank/route.ts:34-36`). On success it revokes the target's sessions so the new rank
  applies immediately (`update-user-rank.ts:66-68`).
- [ ] **Action 2 — deactivate / reactivate.** Toggle → `setUserActiveRequest` →
  `PATCH /api/users/[id]/active` → `setUserActiveUseCase`
  (`packages/application/src/management/users/set-user-active.ts:22`). Flips `User.isActive` and, when
  deactivating, **deletes the user's `Session` rows for instant lockout** (`set-user-active.ts:59-64`).
  Self-deactivate is blocked (`USER_SELF_DEACTIVATE`, `set-user-active.ts:34-40`); can't act on a user
  not strictly below you (`set-user-active.ts:51-57`).
- [ ] **UI mirror of the rules.** `assignableRanks` / `canEditRank`
  (`apps/web/modules/users/rank-presentation.ts:13,20`) show only strictly-below ranks in the select and
  lock DEVELOPER rows — a UI mirror of the server's `canInviteRank`, not the enforcement point.

### Login Activity — `/dashboard/user-activity`

- [ ] **What it does.** Read-only, most-recent-first, counted-pagination list of sign-ins. Pure viewer —
  no actions (`apps/web/app/dashboard/user-activity/page.tsx`; client takes only `initialPage`,
  `page.tsx:41`).
- [ ] **Source = live `Session` rows, not a history table.** `listUserLoginActivityForListView`
  reads `session` (`packages/db/src/management/user-activity/read-repository.ts:27-43`): each session
  row is a sign-in, `createdAt` is the login time, the joined user supplies the email. **Caveat
  documented in the repo:** sessions are current/active (deleted on logout / expiry / revocation), so
  this reflects *live* sessions, **not** an all-time login log — the legacy append-only
  `UserLoginActivity` table was retired (`read-repository.ts:20-26`).

### Invites — `/dashboard/invites`

- [ ] **What it does.** Manager surface to create and revoke invites; pending list shows open invites
  only (`apps/web/modules/invites/components/list/invites-client.tsx:30-32`).
- [ ] **Action 1 — create.** Email + rank form → `createInviteRequest` → `POST /api/invites` →
  `createInviteUseCase` (`packages/application/src/management/invites/create-invite.ts:15`). Re-checks
  `canManageUsers` + `canInviteRank` (strictly below, `create-invite.ts:19-34`), lowercases the email,
  sets `expiresAt = now + INVITE_EXPIRY_MS` (**7 days**), inserts one `UserInvite` row
  (`create-invite.ts:36-50`). The rank `<select>` only offers `assignableRanks(actorRank)`
  (`invites-client.tsx:35,127-131`).
- [ ] **Action 2 — revoke.** Per-row revoke → `revokeInviteRequest` → `DELETE /api/invites/[id]` →
  `revokeInviteUseCase` — deletes the row, which closes the gate for that email immediately
  (`packages/application/src/management/invites/revoke-invite.ts:8-18`). **Revoke is the only delete
  path.**
- [ ] **Invite semantics — email-match, no token, no link, no email sent.** An invite is one
  `UserInvite` row (email + rank + 7-day `expiresAt`, `schema.prisma:87-97`); single-use via `acceptedAt`
  (stamped by the `after` hook, never deleted). The success toast just tells the manager to send the
  invitee to the `/login` URL (`invites-client.tsx:79-81`; `loginUrl` derived from `BETTER_AUTH_URL` in
  `invites/page.tsx:20`). The signup gate matches on the open invite for that email
  (`findOpenInviteByEmail`, `packages/db/src/management/invites/read-repository.ts:56-66`).
- [ ] **Strictly-below + DEVELOPER-script-only (the rule behind all three pages).** One predicate
  `canInviteRank` (`packages/domain/src/management/invites/invite-rules.ts:10-15`) gates invite,
  rank-change, and deactivate: `RANK_ORDER[target] > RANK_ORDER[inviter]`
  (`packages/domain/src/management/users/rank.ts:21-26`). So a TIER_1 can't act on another TIER_1, and
  **no app path can create or edit a DEVELOPER**. DEVELOPER is minted only by
  `npm run db:upsert-owner -- <email>` (`packages/db/scripts/owner-recovery.js:21-51`) or the seed
  (`packages/db/scripts/system-user-seed.js:52-84`); otto is the sole DEVELOPER and can't self-demote.

---

## Platform tips & advice

- [ ] **Swap a nav icon → browse lucide.dev.** All rail icons are one map:
  `NAV_ICONS` in `apps/web/modules/app-shell/components/nav-rail.tsx:45-63`. Pick a name on
  https://lucide.dev, add the import to the `lucide-react` block (`nav-rail.tsx:6-27`), and point the
  slug at it — no new package, deploy-safe (`nav-rail.tsx:43-44`).
- [ ] **Quick fix available: Invites has no icon.** `definitions.ts:46` defines slug
  `flooring-invites`, but `NAV_ICONS` (`nav-rail.tsx:45-63`) has **no entry** for it — so Invites renders
  the fallback `Circle` (`nav-rail.tsx:137,199`). Add e.g. `"flooring-invites": MailPlus` (or `UserPlus`)
  to the map and import it. (Users = `Users`, Login Activity = `History`.)
- [ ] **Google Cloud Console — register every redirect URI.** APIs & Services → Credentials → the OAuth
  2.0 Client → **Authorized redirect URIs**: each signing-in base URL needs
  `<BETTER_AUTH_URL>/api/auth/callback/google`. Server-side auth-code flow means **Authorized JavaScript
  origins are NOT required.** New env or new local port → add its URI here first, or sign-in 400s.
- [ ] **Google Cloud Console — add API scopes when you want Google data.** To pull calendar/drive/gmail,
  enable the API in the Console, add the scope under the OAuth consent screen, then list it in
  `socialProviders.google` (`better-auth.ts:31-37`). Tokens land in `Account`
  (`schema.prisma:57-62`) for server-side calls.
- [ ] **Railway — the four env vars per environment.** `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`,
  `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (`env.ts:34-41,67-72`). main / staging / dev each have their
  own `.env`; dev-1..3 share dev's. Generate a fresh secret per env with `openssl rand -base64 32`
  (min 16 chars, `env.ts:69`). On a deployed service, `BETTER_AUTH_URL` **must be public https** or the
  prod-URL assert throws at boot (`env.ts:137-166`).
- [ ] **Railway — `RAILWAY_ENVIRONMENT_NAME` flips the prod URL guard.** The https assert only runs when
  that var is set (`env.ts:162-166`), so local `next start` on localhost is fine; deployed services get
  the strict check. It also gates the rate-limit Redis requirement on staging/main
  (`env.ts:89-98`).
- [ ] **Multi-port local dev.** Each worktree `.env` sets its own `PORT` + `BETTER_AUTH_URL`
  (dev-4 = `3004` → `http://localhost:3004`). Register `http://localhost:<port>/api/auth/callback/google`
  in the Google client for each port you run. `.env` is per-worktree/gitignored — never committed.
- [ ] **Break-glass / bootstrap, not a UI.** Restore the owner with
  `npm run db:upsert-owner -- otto@crsfloorcovering.com` (`owner-recovery.js`); bootstrap seeded users
  from `SEEDED_ADMIN_EMAIL` / `SEEDED_BUILDER_EMAIL` / `SEEDED_OWNER_<n>_EMAIL`
  (`system-user-seed.js:3-22`). Both run against the worktree `.env`'s `DATABASE_URL` — **confirm the
  target env first** (dev = `zephyr.proxy.rlwy.net`; staging/main have their own).
- [ ] **Pending rollout — don't forget the migration.** Better Auth cutover is dev-verified; staging/main
  still need migration `20260628150000_user_management_and_nextauth_teardown` applied **after** the code
  deploy. The user runs migrations; Claude only authors them.
- [ ] **Housekeeping cron worth adding (memory `prune-expired-invites-todo`).** A GitHub Actions cron to
  `deleteMany` expired `UserInvite` rows — invites go inert at 7d (`invite-rules.ts:19-27`) but the row
  lingers until revoke; a scheduled prune keeps the table clean.
- [ ] **Stale doc to fix later (not in scope here).** `apps/web/server/CLAUDE.md` still says auth is
  "NextAuth / flat role model / `hasCapability()`" — outdated; the live model is Better Auth + `UserRank`.
</content>
</invoke>
