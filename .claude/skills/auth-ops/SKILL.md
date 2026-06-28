---
name: auth-ops
description: Operational runbook + helper-command skill for the Better Auth + Google SSO auth surface — invite/revoke a user, promote/demote rank, deactivate/reactivate, break-glass DEVELOPER recovery (db:upsert-owner), the ad-hoc delete-user script, the four env vars per env, Google Cloud OAuth redirect-URI management, multi-port local dev, and invite semantics. Reach for it to run or explain an auth operation, not to edit the auth code (that's /newsession). Read-only on the repo — it never edits source or migrations and never commits; its one side effect is the documented break-glass/delete scripts it runs against the env's own DB. Explicit-only — invoke on /auth-ops.
---

# /auth-ops

`/auth-ops <what you want to do>` operates and explains the live auth surface: **Better Auth + Google Workspace SSO**, passwordless, invite-gated, domain-locked to `@crsfloorcovering.com`, with authorization by `UserRank`. Reach for it to invite or revoke a user, change a rank, deactivate/reactivate, restore the owner via break-glass, wire env vars + Google Cloud redirect URIs, or set up multi-port local dev — and to answer "how does X work / who can do Y" about auth.

This is a **runbook + helper-command** skill. It runs the documented operational commands (e.g. `npm run db:upsert-owner`) and guides the UI/console steps; it does **not** edit the auth code, the migrations, or commit. To *change* how auth behaves, hand off to `/newsession` over `apps/web/server/auth` + `packages/{domain,application,db}/src/management`.

## The auth surface (terms before rules)

- **Identity** = Google SSO only. `emailAndPassword` is **disabled** (`apps/web/server/auth/better-auth.ts:26`). No password column, no reset flow. Sign-in is the shared `/login` URL + "Continue with Google".
- **Domain lock** = `@crsfloorcovering.com`, enforced twice: Google's `hd` hint (`better-auth.ts:32`) and the in-hook `endsWith` re-check (`better-auth.ts:69`).
- **Invite gate** = the `user.create.before` hook (`better-auth.ts:65`) runs **only for brand-new users**; it calls `resolveSignupInviteRank(email)` and fails closed with no open invite. Existing users link to Google via `accountLinking` (`better-auth.ts:39`) and **bypass the gate**. The `after` hook calls `markSignupInviteAccepted` (`better-auth.ts:88`) to retire the invite.
- **Invite semantics** = **email-match, no token, no link, no email sent.** An invite is one `UserInvite` row (email + rank + 7-day `expiresAt`). Single-use via `acceptedAt` (stamped by `updateMany`, never deleted). The only delete path today is **revoke**. The "invite link" is just the `/login` URL.
- **Authorization** = `UserRank` (`DEVELOPER, TIER_1, TIER_2, TIER_3`). Lower `RANK_ORDER` = higher privilege. **Management** (invite / change-rank / deactivate / see Users + Login Activity) requires `canManageUsers` = **DEVELOPER + TIER_1**.
- **Strictly-below rule** = one predicate `canInviteRank` (`packages/domain/src/management/invites/invite-rules.ts:10`) gates invites, rank-change, AND deactivate: an actor may only act on a rank **strictly below** their own (`RANK_ORDER[target] > RANK_ORDER[inviter]`). So a TIER_1 cannot act on another TIER_1, and **DEVELOPER is script-only/immutable** — no app path creates or edits a DEVELOPER. The UI mirror is `assignableRanks`/`canEditRank` (`apps/web/modules/users/rank-presentation.ts`).
- **Deactivate** = `User.isActive=false` **and** delete the user's `Session` rows for instant lockout (`set-user-active.ts`). `getSessionUser` rejects `isActive===false` (`apps/web/server/auth/session.ts:25`) to cover the brief cookie-cache window.
- **Login Activity** = live `Session` rows (current/active sessions), **not** a historical login log — there is no all-time login history table.
- **The four env vars (per env)** = `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (read directly in `better-auth.ts:20-31`).

## Hard rules

- **DEVELOPER is script-only.** There is **no in-app path** to create, grant, or edit a DEVELOPER — the strictly-below rule forbids it. The only ways to mint/restore one are `npm run db:upsert-owner -- <email>` or the seed. Never attempt it through the UI or an API route.
- **Never strand the sole DEVELOPER.** otto (`otto@crsfloorcovering.com`) is the only DEVELOPER; the rule means he can't self-demote. Before any destructive user op, confirm you are not removing or demoting the last DEVELOPER.
- **The break-glass and delete scripts mutate the live DB.** They act on whatever `DATABASE_URL` the worktree `.env` points at (dev = `zephyr.proxy.rlwy.net`; staging/main have their own). **State the target env and confirm before running** — this is outward-facing and hard to reverse.
- **The user runs migrations; Claude only authors SQL.** Rolling auth out to staging/main needs migration `20260628150000_user_management_and_nextauth_teardown` applied **after** the code deploy — surface that, don't run it.
- **DO NOT COMMIT.** The user commits. After any change, give a commit message ≤17 words. `.env` edits are per-worktree local config, not part of any commit.
- **Read-only on the repo.** This skill does not edit auth source, modules, or migrations. A behavior change is a `/newsession` hand-off, not an `/auth-ops` action.
- **Drive, don't poll.** Make the sound operational call and state it; surface a genuine open question (which env, which email) in the response — don't multiple-choice routine steps.
- **Explicit-only.** Trigger on the literal `/auth-ops`. Not on "fix auth", "add a user", "invite someone".

## Step 1 — Orient (state of the world)

Before acting, confirm the surface against the code — never from memory. The canonical files:

- `apps/web/server/auth/better-auth.ts` — auth instance, hooks, `hd` lock, `additionalFields` (`rank` + `isActive`), `baseURL = process.env.BETTER_AUTH_URL`.
- `apps/web/server/auth/session.ts` — `getSessionUser` (rejects `isActive===false`), `requireManageUsersAccess`.
- `apps/web/server/auth/route-auth.ts` — `authorizeRouteAccess`, `enforceManageUsersAccess`.
- `packages/domain/src/management/{invites/invite-rules.ts,users/rank.ts}` — `canInviteRank` (strict `>`), `RANK_ORDER`, `canManageUsers`.
- `packages/application/src/management/{invites,users}/` — `createInviteUseCase`, `listInvitesUseCase`, `revokeInviteUseCase`, `updateUserRankUseCase`, `setUserActiveUseCase`, `resolveSignupInviteRank`, `markSignupInviteAccepted`.
- `apps/web/app/api/invites/*` + `apps/web/app/api/users/[id]/{rank,active}/route.ts` — the routes.
- `packages/db/scripts/owner-recovery.js` (`db:upsert-owner`) + `system-user-seed.js` — passwordless DEVELOPER bootstrap.

## Step 2 — Invite or revoke a user

**Invite (the normal path — UI):** sign in as DEVELOPER/TIER_1 → `/dashboard/invites` → create form → email + a rank **strictly below yours** → submit. The invitee then opens `/login` and signs in with Google; the gate provisions them at the invited rank and retires the invite. No link or email is sent — you tell them to sign in.

- **Behind the UI:** `POST /api/invites` → `createInviteUseCase` (`packages/application/src/management/invites/create-invite.ts`). It re-checks `canManageUsers` + `canInviteRank`, lowercases the email, sets `expiresAt = now + INVITE_EXPIRY_MS` (7 days), and inserts one `UserInvite` row. There is **no** secret token.
- **Revoke:** `/dashboard/invites` → revoke on the pending row → `DELETE /api/invites/[id]` → `revokeInviteUseCase`. Revoke is the only delete path for invites.
- **Caveat:** inviting an **already-existing** user is a harmless no-op today (existing users bypass the gate via `accountLinking`) — the row just expires unused. (Hardening this is a Checklist-2 item.)

## Step 3 — Change rank / deactivate / reactivate

All three obey the strictly-below rule and require DEVELOPER/TIER_1.

- **Change rank:** `/dashboard/users` → inline rank `<select>` (only ranks `assignableRanks(you)` strictly below you appear) → `PATCH /api/users/[id]/rank` → `updateUserRankUseCase`. OCC lives in the use case via `expectedUpdatedAt`; on success it **revokes the target's sessions** so the new rank takes effect immediately.
- **Deactivate:** `/dashboard/users` → deactivate button → `PATCH /api/users/[id]/active` → `setUserActiveUseCase`. Flips `isActive=false` **and** deletes the user's `Session` rows (instant lockout). Self-deactivate is blocked.
- **Reactivate:** same control flips `isActive=true`. The user signs in again with Google.
- **Forbidden by design:** acting on a peer (same rank) or anyone above you → 403; touching a DEVELOPER → no UI path at all.

## Step 4 — Break-glass DEVELOPER + ad-hoc delete

**Mint/restore a DEVELOPER (the only way):**

```
npm run db:upsert-owner -- otto@crsfloorcovering.com
```

`packages/db/scripts/owner-recovery.js` upserts a `User` row at rank `DEVELOPER`, `isActive=true`, `emailVerified=true`. Passwordless — the owner then signs in with Google (account-linking attaches to this row; an existing row bypasses the invite gate). Runs against the worktree `.env`'s `DATABASE_URL` — **confirm the target env first.** `system-user-seed.js` (`npm run db:seed`) is the bootstrap equivalent.

**Delete users (script-only — there is no delete-user UI):** the ad-hoc pattern used this session is a one-off Prisma-client script — `prisma.user.deleteMany({ where: { email: { in: [...] } } })` — run with `DOTENV_CONFIG_PATH=../../.env`. **Never delete the last DEVELOPER.** State the env + the exact emails and confirm before running; this is destructive and hard to reverse.

## Step 5 — Env vars, Google Cloud OAuth, multi-port local dev

**The four env vars, per environment** (each of main / staging / dev has its own `.env`; dev-1…3 share dev's):

| Var | Role |
|---|---|
| `BETTER_AUTH_URL` | this env's base URL (drives `baseURL` + the OAuth callback) |
| `BETTER_AUTH_SECRET` | session signing secret (unique per env) |
| `GOOGLE_CLIENT_ID` | the Google OAuth client |
| `GOOGLE_CLIENT_SECRET` | its secret |

**Google Cloud OAuth client (redirect URIs):** in the Google Cloud Console → APIs & Services → Credentials → the OAuth 2.0 Client, every base URL that signs in must have its callback registered under **Authorized redirect URIs**: `<BETTER_AUTH_URL>/api/auth/callback/google`. Server-side auth-code flow means **Authorized JavaScript origins are NOT needed.**

**Multi-port local dev:** each worktree `.env` sets its own `PORT` + `BETTER_AUTH_URL` (dev-4 = `3004`, so `http://localhost:3004`). Each port needs its own redirect URI registered: `http://localhost:<port>/api/auth/callback/google`. These `.env` edits are per-worktree local config (often gitignored) — not part of any commit.

## Step 6 — Report

Report per CLAUDE.md: a headline + what you did or explained + the affected env, in the block below. End with a ≤17-word commit message only if a file actually changed (rare for this skill).

```
═══ AUTH-OPS — <operation> ═══
Surface  Better Auth + Google SSO · domain @crsfloorcovering.com · rank-gated (DEVELOPER+TIER_1)
Target   <env: dev / staging / main · DATABASE_URL host>

Action   <what ran or what to do in UI/console>
Result   ✅ done / ⚠️ needs user step (migration, console, .env) / ❌ blocked

Watch    <strictly-below · DEVELOPER script-only · don't strand otto · migration pending on staging/main>
Open     <which env / which email / "none">
```

## What this skill does NOT do

- Does **not** edit the auth code, the rank rules, the modules, or the migrations — a behavior change hands off to `/newsession` over `apps/web/server/auth` + `packages/*/src/management`.
- Does **not** run migrations (the user runs those) or apply `20260628150000` to staging/main — it only flags that it's pending.
- Does **not** commit, and does **not** treat `.env` edits as committable repo changes.
- Does **not** create or edit a DEVELOPER through any app/API path — DEVELOPER is `db:upsert-owner`/seed only.
- Does **not** delete the last DEVELOPER or self-demote otto.
- Is **not** the build gauntlet (`/check`), the cross-worktree sync (`/dev-sync`), or the promotion gate (`/diff-merge`).
- Does **not** trigger on anything but the literal `/auth-ops`.
