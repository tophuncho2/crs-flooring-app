# dev-4 — read-only Users + User-Activity modules + user-tier/status foundation (with cross-branch stay-off map)

> **This file is different from a normal dispatch brief.** It intentionally names the other branches and their file
> envelopes — because your job here is to **work around three sibling branches without touching their files**. The
> "Cross-branch awareness" section below is the load-bearing part: treat every path listed there as OFF-LIMITS.

## How to use this brief (receiving session, read first)
You were handed this in a fresh dev-4 worktree. It is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` (target the User/UserLoginActivity layers + the app-shell nav + a read-only list module like job-types/categories as your pattern) to do your own end-to-end research and VALIDATE this file against live code. Trust the code if it disagrees — note the discrepancy.
2. Read the Flags — open decisions to settle with the user as you work. They are NOT pre-decided.
3. Honor your mode: PLAN → produce a plan and STOP for approval. AUTO → execute. Either way, research-and-validate FIRST.
4. The user said: start scoping, form a plan, and ask questions. So in PLAN mode, surface the Flags as questions before building.

## Intent for this session
Add two **read-only** modules — **Users** and **User Activity** — backed by tables that **already exist** (`User`,
`UserLoginActivity`). Group both in the main nav rail under a new **"Users" grouping beneath the Catalog grouping**.
Then **lay the foundation for a user tier/status hierarchy** (tier 1 = highest, 2 below 1, 3 below 2, plus a
**developer** rank that can see/do everything) that will **replace the current `Role` enum**. Backend first, then
front end. **No enforcement of gating yet** — this session builds everything *up to* enforcement, nothing that gates.
"Done" = both read-only lists render via the existing engines, the nav grouping exists, and the tier/status foundation
is in place (or explicitly deferred — see Flags) — `/check` green.

### Module specifics (from the user)
- **Both modules are read-only.** Neither needs **row-open** enabled and neither needs **toolbar features**. A search
  bar is **optional/"if even needed"**. Keep **pagination** ("the whole 9").
- **User Activity** is **pure data-table display, never editable** — rows are **constantly appended** to
  `UserLoginActivity`, and it must still ride the **existing list-view engine** (a high-churn append-only table is fine
  for the engine; confirm freshness/pagination policy).
- **Users module** will *later* be upgraded so higher ranks manage it — **not this session** (read-only now).
- **Tier/status hierarchy:** redo so tier 1 outranks 2 outranks 3; add a **developer** rank (sees/does everything). Each
  rank "sees certain things" — this **indirectly** answers "can they update this" for now. A later sweep lets developers
  **toggle between rank views** for live testing — **not this session**.
- **Out of app entirely:** password resets and user creates go through the **user via the terminal** — do **not** build
  reset/create UI or flows.
- **The current `Role` enum means nothing** and is being **replaced** by what you add here.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **THE shared-file coordination point — schema + migration (read the Cross-branch section).** Your tier/status
  foundation edits `enum Role` (schema.prisma:10) and `model User` (:18–:22). A sibling branch also edits
  `packages/db/prisma/schema.prisma` (different models) and adds migrations against the **shared dev DB**. This is the
  ONE file that isn't cleanly yours. Decide WITH THE USER: (a) make your schema delta tiny and isolated to the
  `Role`/`User`/tier block, **write but do not run** the migration, and let the user sequence deploy order; or (b) defer
  the schema-touching tier foundation entirely and ship only the two read-only modules + nav this session (keeps dev-4
  **100% schema-free** and conflict-free). Your read-only modules need **no schema** either way — only the tier
  foundation does.
- ⚑ **Replace vs augment `Role`.** "Replace" could mean: swap the enum's members (tier1/tier2/tier3/developer),
  OR keep `User` and add a new `tier`/`status` field + new enum and migrate `role` data into it. Decide the migration
  shape (and the backfill from existing `CUSTOMER`/etc. values) with the user.
- ⚑ **Nav grouping shape.** User said "a **Users** grouping **under** the Catalog grouping." Decide: a brand-new
  `FlooringNavGroupId` = `"users"` rendered beneath `catalog`, vs. a sub-grouping nested inside catalog. `definitions.ts`
  currently models flat groups (`management|operations|accounting|catalog`) — confirm whether the nav rail supports
  nesting or whether "under" just means "the next group after catalog."
- ⚑ **Search bar — needed at all?** User said "bar even needed if possible" — i.e. consider dropping search on these
  read-only lists. Decide per module (Users may want name/email search; Activity probably not).
- ⚑ **Activity pagination/freshness policy.** Append-only high-churn table — pick cursor vs counted pagination and the
  list freshness preset; confirm a sane default sort (most-recent-first).
- ⚑ **What "sees certain things" means as foundation (no enforcement yet).** Define where rank→visibility will *later*
  hook in (a domain predicate? a policy table?) and stub the shape without enforcing — so the later gating sweep has a
  seam. Don't gate anything now.
- ⚑ **Read-only module pattern source.** Pick the closest existing read-only-ish list module (e.g. `job-types`,
  `categories`) and mirror its engine wiring head-to-toe rather than inventing a new shape.

## Scope
In:  Two read-only list modules (Users, User Activity) reading existing `User` + `UserLoginActivity`; new nav grouping
     for them; backend-first then front end; the tier/status hierarchy foundation that replaces `Role` (or deferred per
     Flag 1). No row-open, no toolbar features, optional search, keep pagination.
Out: Any enforcement/gating of visibility or edit-rights; any user create/reset/edit flow (terminal-only, the user does
     it); the "developer toggles rank views" live-testing feature (later sweep); upgrading the Users module to be
     rank-managed (later). And everything in the Cross-branch stay-off map below.

## ⛔ Cross-branch awareness — STAY OFF these files (three sibling branches are live)
You share `dev` with three other branches. Nothing of yours should edit a file they own. Consume shared **engines** via
their barrels (`@/engines/...`) — that's fine and expected — but **never edit an engine's source** while they're in it.

| Sibling branch is changing… | Paths that are OFF-LIMITS to you | Your relationship |
|---|---|---|
| **list-view engine + work-orders/inventory lists** | `apps/web/engines/list-view/**`; `apps/web/modules/work-orders/**`; `apps/web/modules/inventory/**` (incl. its domain/app/db list slices + the inventory API list validators/route) | You **import** `@/engines/list-view` (DataTable, pagination, toolbar) read-only for your two lists. **Do not edit any file under `engines/list-view/`.** Its contracts are being kept additive/opt-in, so consuming it as-is keeps working — pass no new props and the gutter/header render exactly as today. |
| **record-view engine + properties** | `apps/web/engines/record-view/**`; `apps/web/modules/properties/**` | You have **no record views** (read-only, no row-open), so you naturally never touch these. Keep it that way. |
| **payments + the schema/migration layer** | `apps/web/modules/payments/**`; `packages/{domain,db,application}/src/flooring/payments/**`; **and `packages/db/prisma/schema.prisma` + `packages/db/prisma/migrations/**`** | This is the **one genuine overlap.** See Flag 1. The sibling edits `FlooringPayment` + back-relations on `Entity`/`FlooringWorkOrder`; your tier work edits `Role`/`User`. Different blocks, **same file + same shared DB.** Coordinate via the user (sequence the migration deploy; expect a trivial block-merge of `schema.prisma`), or defer schema this session. |

The app-shell nav (`apps/web/modules/app-shell/navigation/definitions.ts`) and the entities/entity-types modules are
**not** owned by any sibling — the nav file is yours to edit; entities/entity-types you don't need at all.

## Files you own (do not edit anything outside this list)
- `apps/web/modules/users/**` — NEW read-only Users module (list components + controller + data request), mirroring an existing read-only list module's engine wiring.
- `apps/web/modules/user-activity/**` — NEW read-only User-Activity module (pure data-table, append-only source).
- `apps/web/app/dashboard/users/**` and `apps/web/app/dashboard/user-activity/**` — NEW list pages (no `record/` pages — no row-open).
- `apps/web/modules/app-shell/navigation/definitions.ts` — add the "Users" nav grouping + the two nav items.
- `packages/domain/src/flooring/{users,user-activity}/**`, `packages/application/src/flooring/{users,user-activity}/**`, `packages/db/src/flooring/{users,user-activity}/**` — NEW read repositories + list types/normalizers for the two read-only lists (read-only: list use cases only, no write repos/use cases).
- API list routes for the two modules under `apps/web/app/api/**` (NEW route files only — do not touch sibling routes).
- **Only if the tier foundation is in-scope (Flag 1):** `packages/db/prisma/schema.prisma` (the `Role`/`User`/tier block ONLY) + a NEW migration file under `packages/db/prisma/migrations/` (write, do not run).

## Layer-by-layer map
Schema      — `packages/db/prisma/schema.prisma:10` `enum Role`, `:18` `model User`, `:29` `model UserLoginActivity` — tables EXIST; read-only modules need no schema; tier foundation edits Role/User only (Flag 1).
Domain      — NEW `flooring/users` + `flooring/user-activity` list types/normalizers/list-config (mirror a read-only module).
Data        — NEW read repositories selecting from `User` / `UserLoginActivity`; no write repos.
Application — NEW `list-users` / `list-user-activity` use cases only.
API         — NEW list route(s) with the canonical rate-limit/auth/telemetry gauntlet; read-only (GET).
Module dir  — NEW `modules/users` + `modules/user-activity` (list-view consumers; no row-open, no toolbar features, optional search, keep pagination); edit `app-shell/navigation/definitions.ts` for the grouping.
Pages       — NEW `app/dashboard/users/page.tsx` + `app/dashboard/user-activity/page.tsx` (list only).

## Migration (only if tier foundation is in-scope this session)
Write the migration; **DO NOT run it** — the user runs all migrations. Keep the delta isolated to the `Role`/`User`/tier
block so it merges cleanly alongside the sibling's payment-FK migration; the user sequences deploy order on the shared
dev DB. If deferred (Flag 1), dev-4 stays fully schema-free this session.

## Done means
- `/check` green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
