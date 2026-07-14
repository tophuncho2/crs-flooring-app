---
name: nav-grouping
description: Master of the dashboard navigation grouping — the one shared source of truth (`FLOORING_NAV_GROUPS` + `FLOORING_NAV_ITEMS` + `FLOORING_HOME_NAV_ITEM` + `isNavItemVisible`) in `apps/web/modules/app-shell/navigation/definitions.ts` that feeds BOTH the side nav rail and the `/dashboard/home` launcher, plus the `NAV_ICONS` slug→icon map. Invoke to rename a group label, add/remove/reorder a group, move a nav item between groups, add a brand-new nav item, or change a rank gate — every edit lands in that one definitions file so the rail and home launcher never diverge. Knows the group `id` is stable/internal while the `label` is the only user-facing string, that item render order = array order within a group, and that a new item needs a matching `NAV_ICONS` entry. Editing skill, not read-only. Explicit-only — invoke on /nav-grouping.
---

# /nav-grouping

`/nav-grouping` makes you the owner of the dashboard **navigation grouping** — the groups, the items tagged into them, their order, their rank gates, and their icons. The user invokes it with a free-form intent — "rename Inventory Operations to Material Operations", "move Certificate Tracking into Management", "add a Reports item under Business operations", "gate Imports at TIER_1", "drop the empty Tracking group". Your job: ground in the live definitions file, make the edit in the ONE source of truth, and confirm both surfaces still agree.

This is an **editing** skill — it reads the definitions, makes a tight edit, and verifies. It is not a read-only audit (that's `/dig`) and it does NOT reshape the rail/home components or engine chrome (that's `/engine`).

## The model (what the nav grouping IS)

**One file is the single source of truth:** `apps/web/modules/app-shell/navigation/definitions.ts`. Both consumers import from it and apply the identical group-filter + rank-gate, so editing this file updates the rail and the home launcher **at once** — you never touch the components to change grouping.

### The four data structures (in `definitions.ts`)

- **`FlooringNavGroupId`** (union type) — the allowed group ids: `management | operations | accounting | catalog | users`. Every group id and every item's `group` must be a member; typecheck enforces it.
- **`FLOORING_NAV_GROUPS`** (`{ id, label }[]`) — the group list. **Array order = the render order of the group sections.** `id` is the internal, stable key; `label` is the **only** user-facing string. They may legitimately differ (e.g. `id: "operations"` → `label: "Material Operations"`, `id: "accounting"` → `label: "Business operations"`).
- **`FLOORING_NAV_ITEMS`** (`FlooringNavItem[]`) — the flat item list. Each item = `{ slug, name, href, group, minRank? }`. An item renders under whichever group its `group` field names; **within a group, items render in array order** (their position in this array, filtered to the group). `minRank` absent = visible to everyone.
- **`FLOORING_HOME_NAV_ITEM`** — the standalone Home entry, pinned above the grouped rail and used as the post-login landing. Kept OUT of `FLOORING_NAV_ITEMS`; its `group` is unused for render. Leave it alone unless the ask is specifically about the Home pin.

### The rank gate (shared predicate)

`isNavItemVisible(item, rank)` returns `item.minRank ? hasRankAtLeast(rank, item.minRank) : true`. This is the ONE predicate the rail, the drawer, and the home launcher all read, so per-item visibility never diverges. To gate an item, set `minRank` (a `UserRank`) — never hand-roll a visibility check in a component.

### The icon map (sibling file)

`apps/web/modules/app-shell/navigation/nav-icons.tsx` — `NAV_ICONS: Record<string, LucideIcon>`, keyed by item **slug**. Both surfaces draw from it; a missing slug falls back to a `Circle`. **Every new nav item needs a `NAV_ICONS` entry** or it renders a placeholder circle. Icons are `lucide-react` (already a dependency — no new packages).

### The two consumers (data-driven — you almost never edit these)

- **`apps/web/modules/app-shell/components/nav-rail.tsx`** — the persistent icon rail + the expanded labeled `SidePanel` drawer. Both loops iterate `FLOORING_NAV_GROUPS` and filter `FLOORING_NAV_ITEMS` by `item.group === group.id && isNavItemVisible(item, viewerRank)`.
- **`apps/web/modules/app-shell/components/home/home-launcher.tsx`** (mounted at `apps/web/app/dashboard/home/page.tsx`) — the shortcut-tile launcher. Same filter; it renders `{group.label}` as the section heading and `return null` for any group whose filtered item list is empty.

Because both skip empty groups, moving every item OUT of a group hides it — but leave no dead group in `FLOORING_NAV_GROUPS`: **remove the emptied group entry AND its `FlooringNavGroupId` union member** so the type carries no orphan.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — re-read `definitions.ts`; the groups/items/gates drift. Never act on the model above without confirming it against the live file.
- **One source of truth.** Every grouping edit lands in `definitions.ts` (and `nav-icons.tsx` for a new item's icon). NEVER fork the grouping or a visibility check into `nav-rail.tsx` / `home-launcher.tsx` — that's exactly the divergence the shared file prevents.
- **`id` is internal, `label` is user-facing.** A rename request touches the `label` only. Do NOT rename a group `id` just to match a new label — the id is referenced by every item's `group` field, and label/id mismatch is already normal in this file. Rename an id only if explicitly asked, and then update every `group:` referencing it + the union member together.
- **Order is array order.** To reorder groups, reorder `FLOORING_NAV_GROUPS`. To reposition an item within a group, physically move its line among the other items of that group. Moving an item between groups but leaving it in an odd array slot makes it render at the wrong spot in the new group — reposition the line, don't just retag it.
- **A new item is four things.** `slug` (unique), `name`, `href` (a real `/dashboard/...` route), `group` (an existing `FlooringNavGroupId`), optional `minRank` — PLUS a `NAV_ICONS` entry keyed by the slug. Miss the icon and it renders a placeholder circle.
- **Rank gates go through `minRank` + `isNavItemVisible`.** Never add an ad-hoc visibility conditional in a component. Ranks are the `UserRank` ladder (see the `module-rank-gating` memory); a nav gate is only the surface hint, not the API's authority.
- **No migration, no schema.** Nav config is code. This skill never touches Prisma, the DB, or any layer below `apps/web`.
- **Run `/check-gauntlet` before done.** Typecheck proves a removed union member left no dangling `group:` and a new `group` is a valid id. Check `apps/web/tests/modules/app-shell/navigation-visibility.test.ts` — it asserts specific `minRank` gates; keep it green (adjust only if a gate genuinely changed).
- **DO NOT COMMIT.** The user commits. Provide a commit message ≤17 words. **Drive, don't multiple-choice** — surface a genuine open question (an item's new position, whether a rename also wants a reorder) in the response, then execute.
- **Explicit-only.** Trigger on the literal `/nav-grouping`. Not on "fix the nav", "the menu is wrong", "add a page to the dashboard".

## Step 1 — Ground in the live definitions

Before editing, read the current reality:

1. **`definitions.ts`** — the four structures (`FlooringNavGroupId`, `FLOORING_NAV_GROUPS`, `FLOORING_NAV_ITEMS`, `FLOORING_HOME_NAV_ITEM`) + `isNavItemVisible`. Note the target group's id/label and the target item's current `group` + array position.
2. **`nav-icons.tsx`** — the `NAV_ICONS` map, if the ask adds an item (need a new icon) or removes one (the entry becomes dead — leave it or prune, but don't break the map).
3. **The consumers** (only if the ask is about *rendering*, not grouping) — `nav-rail.tsx` and `home-launcher.tsx` to confirm the shared filter still covers the change; both already skip empty groups.
4. **Memory** — `module-rank-gating-foundation` (the `minRank` + `isNavItemVisible` seam, the `/dashboard/home` HomeLauncher). Treat as context; verify against code.

State what you found in one tight block (target group/item, current group + position, whether an icon is needed) before making the edit.

## Step 2 — Classify the task and edit

Match the ask to one of these (they compose — a move often wants a reorder):

- **A. Rename a group label** — edit the `label` in `FLOORING_NAV_GROUPS`. Leave the `id` and every item's `group` untouched.
- **B. Move an item between groups** — change the item's `group` to the target id, AND reposition its line among that group's other items so render order reads naturally.
- **C. Add / remove / reorder a group** — add/remove the `{ id, label }` entry in `FLOORING_NAV_GROUPS` and the matching `FlooringNavGroupId` union member together; reorder = reorder the array. Removing a group requires that no item still references its id (move or delete those items first).
- **D. Add a new nav item** — add the `{ slug, name, href, group, minRank? }` line to `FLOORING_NAV_ITEMS` at its intended position, AND add a `NAV_ICONS[slug]` icon.
- **E. Change a rank gate** — add/edit/remove the item's `minRank`. Update `navigation-visibility.test.ts` only if the asserted gate genuinely changed.

## Step 3 — Verify

- **`/check-gauntlet`** (or at minimum the typecheck it wraps) — green proves no dangling group id, no invalid `group`, no orphaned union member. Report real counts, don't claim green from reading.
- **`navigation-visibility.test.ts`** stays green (or reflects the intended gate change).
- **Sanity (optional, via `/run`):** open the side nav drawer + `/dashboard/home` and confirm the group label, item placement, and that no empty group renders.

## Step 4 — Report (per project CLAUDE.md)

Headline + TL;DR in the chat; a small table for the before→after grouping. Open questions in the response. End with a commit message — but **do not commit**.

```
NAV-GROUPING — <intent in one line>   (task: <A rename | B move | C group | D add | E gate>)

═══ Grounding ═══
Target: <group/item>   Was: <group + position>   Icon needed: <yes/no>

═══ Change ═══
| Structure | File | Before | After |
|---|---|---|---|
| FLOORING_NAV_GROUPS | definitions.ts | <label/id> | <label/id> |
| FLOORING_NAV_ITEMS  | definitions.ts | group=<x> | group=<y> (repositioned) |
| NAV_ICONS           | nav-icons.tsx  | — | <slug>: <Icon> |

═══ Verify ═══
/check-gauntlet: <PASS | N errors>   navigation-visibility.test: <pass>   Empty groups: <none>

═══ Open questions ═══
- <item position / rename-also-reorder / icon choice, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Act on the model above without re-reading the live `definitions.ts` first.
- Fork the grouping data or a visibility conditional into `nav-rail.tsx` / `home-launcher.tsx` — grouping lives ONLY in `definitions.ts`.
- Rename a group `id` on a label-rename ask, or leave an orphan `FlooringNavGroupId` member / a `group:` pointing at a removed id.
- Add a nav item without a `NAV_ICONS` entry, or point an item at a route that does not exist.
- Reshape the rail/drawer/launcher components, the `SidePanel` chrome, or any engine surface — that's **/engine** (and its `/engine-lv`, `/engine-rv` children).
- Enforce a rank at the API/data layer — a nav `minRank` is only the surface hint; the real gate is `requireRankAtLeast`/`enforceRankAtLeast` (see the `module-rank-gating` memory), not this skill.
- Touch schema, migrations, the DB, or any layer below `apps/web`.
- Commit, or multiple-choice the user through a change it can drive.
- Trigger on anything but the literal `/nav-grouping` invocation.
