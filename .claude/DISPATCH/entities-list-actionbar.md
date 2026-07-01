# entities-list-actionbar — Migrate the Entities list view onto the ListActionBar toolbar engine

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` (scope it to the entities module list view) to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval. AUTO mode → execute. Either way, research-and-validate BEFORE acting.

---

## Intent for this session

Migrate the entities list view's legacy `ListToolbar`/`ListToolbarBottomRow`/`ListToolbarCell` chrome onto the shared `ListActionBar` engine, mirroring the already-migrated products and job-types clients head-to-toe. This is a pure frontend toolbar-chrome swap — no backend, no schema, no other module is touched. Done = the entities list renders the `[Entities][x of x entities][Clear] … [Filter ▾][Search ▾][+ Entity]` header band with `/check` green.

---

## ⚑ Flags — decisions to make / potential gaps

⚑ **1. Controller upgrade vs leave nav inline.** The canonical pattern (job-types controller `apps/web/modules/job-types/controllers/list/use-job-types-list-controller.ts:7–18`) exposes `openCreate`/`openEntity` via `useRecordEntryNavigation("/dashboard/entities")` and the client imports them from the controller. Currently entities-client.tsx wires `useRouter` (line 19/44), `buildRecordCreateHref` (line 20), and `useRecordEntryNavigation` (line 45, destructures `returnTo`) inline. Settle with the user: upgrade the controller to canonical shape and strip the inline nav, or leave nav inline for this pass.

⚑ **2. StateSearchControl classification — CRITICAL.** `StateSearchControl` (entities-client.tsx lines 141–146) renders visually as a text input (it uses `SearchControl` under the hood) but it is a precision 2-char state-CODE attribute filter, not free-text search. It belongs in the **Filter menu**, not the Search menu. Do not let its visual similarity fool you. Confirm this placement before wiring.

⚑ **3. No Sort tool for entities.** Entities has no sort capability today; job-types similarly omits Sort. Confirm with the user that Sort stays out of scope for this pass before finalizing the plan.

⚑ **4. `handleStateChange` double-normalization (optional simplify).** `handleStateChange` (entities-client.tsx lines 86–90) calls `normalizeAddressState` explicitly, but `StateSearchControl` already normalizes internally. This is a pre-existing redundancy — optional to remove during this pass. Flag for user decision rather than silently touching it.

⚑ **5. EntityTypeMultiSelect panel-in-panel z-index.** `EntityTypeMultiSelect` (entities-client.tsx lines 167–173) embeds its own `AnchoredPanel` ("+ Add type"). When this sits inside an open `ToolbarMenuButton` popover (Filter menu), the inner panel must clear the outer panel's z-index stack. Mirrors products' `CategoryFilterChip` pattern, so it is structurally safe — but verify in the browser that the Add-type picker renders above the Filter menu overlay after migration.

⚑ **6. Engine-migration convention reminders.**
- Mirror canonical folder structure head-to-toe.
- Defer alignment tests and modules/shared doc cleanup.
- **DO NOT COMMIT** — the user always commits.
- Prepare a commit message of ≤17 words for the user to use.

---

## **HARD RULE — Search bars go in the SEARCH menu ONLY. Filter menu = filter pickers/chips only. Prior sessions have misplaced free-text search bars into the Filter menu. Do not repeat that.**

---

## Scope

**In:**
- Replace the legacy `ListToolbar`/`ListToolbarBottomRow`/`ListToolbarCell` card in `apps/web/modules/entities/components/list/entities-client.tsx` with `ListActionBar` + `ToolbarMenuButton` (Filter + Search) + `ListCreateButtonPortal`.
- Split `hasActiveFilters` into `hasActiveFilterTool` and `hasActiveSearchTool` for per-menu active dots.
- Delete the now-empty husk files under `apps/web/modules/entities/components/list/toolbar-controls/` (see Files section).
- Optionally upgrade the entities list controller to canonical nav shape (Flag ⚑1).

**Out:**
- Engine primitive files — consume only, never edit.
- Reference clients `products-client.tsx` and `job-types-client.tsx` — read only.
- Entity-types picker files under `apps/web/modules/entity-types/components/picker/` — shared, out of bounds.
- Engine-wide message/pageError block extraction into a shared primitive — NOT this session's job; move the existing inline blocks as-is.
- Any other module still on legacy `ListToolbar` (work-orders, imports, properties, inventory, templates) — leave them untouched.
- Backend, API, application, domain, schema layers — zero changes.

---

## Files you own (do not edit anything outside this list)

| File | Why |
|---|---|
| `apps/web/modules/entities/components/list/entities-client.tsx` | Primary target — toolbar chrome replacement |
| `apps/web/modules/entities/controllers/list/use-entities-list-controller.ts` | Upgrade to expose `openCreate`/`openEntity` (if Flag ⚑1 approved); otherwise read-only |
| `apps/web/modules/entities/components/list/toolbar-controls/add-hub-button.tsx` | Delete — replaced by `ListCreateButtonPortal` |
| `apps/web/modules/entities/components/list/toolbar-controls/sub-controls/entities-clear-all.tsx` | Delete — engine owns clear |
| `apps/web/modules/entities/components/list/toolbar-controls/sub-controls/entities-row-count.tsx` | Delete — engine owns count |
| `apps/web/modules/entities/components/list/toolbar-controls/entities-list-search.tsx` | Delete — `SearchControl` wired directly in client |

After deletion: `toolbar-controls/sub-controls/` and `toolbar-controls/` become empty — remove both folders.

**Read-only references (validate against, do not edit):**
- `apps/web/modules/products/components/list/products-client.tsx` — per-tool active flags, Filter-chip, Search-with-bars; message/pageError block at ~241–253
- `apps/web/modules/job-types/components/list/job-types-client.tsx` — canonical single-Search shape
- `apps/web/modules/job-types/controllers/list/use-job-types-list-controller.ts:7–18` — canonical controller nav pattern

**Engine primitives (consume only, do not edit):**
- `apps/web/engines/list-view/toolbar/action-bar/list-action-bar.tsx`
- `apps/web/engines/list-view/toolbar/action-bar/toolbar-menu-button.tsx`
- `apps/web/engines/list-view/toolbar/action-bar/list-create-button-portal.tsx`
- `apps/web/engines/list-view/toolbar/search/state-search-control.tsx`

**Stable — do not touch:**
- `apps/web/modules/entities/components/list/entities-table.tsx` — DataTable, 11 cols, pagination
- `apps/web/app/dashboard/entities/page.tsx` — RSC, seeds `initialEntityTypeRefs`; `initialEntityTypeRefs` stays in props, passed through to `EntityTypeMultiSelect` seedRefs

---

## Layer-by-layer map

Only the Module dir layer has work. Backend untouched.

### Module dir — `apps/web/modules/entities/`

**`components/list/entities-client.tsx` — full toolbar replacement**

Current state (validate line numbers against live code before acting):
- Line 4: imports `ListToolbar`, `ListToolbarBottomRow`, `ListToolbarCell` — remove these
- Lines 19–20: inline `useRouter`, `buildRecordCreateHref` — move to controller (Flag ⚑1) or keep
- Lines 45: `useRecordEntryNavigation` destructures `returnTo` — same decision
- Lines 86–90: `handleStateChange` with optional double-normalization (Flag ⚑4)
- Lines 98–103: single combined `hasActiveFilters` — split into `hasActiveFilterTool` + `hasActiveSearchTool`
- Lines 112–184: hand-built `<div className="mx-4 rounded-xl border …">` card — remove entire block
- Lines 130–132: hand-crafted blue "Entities" label span — replaced by `ListActionBar label="Entities"`
- Lines 134–183: `<ListToolbar>` block — replaced by `<ListActionBar>` + two `<ToolbarMenuButton>` children
- Lines 141–146: `StateSearchControl` → **Filter menu** (not Search)
- Lines 167–173: `EntityTypeMultiSelect` with `editable`/`selectedIds`/`seedRefs` → **Filter menu** body; keep all three props
- Line 137: `EntitiesListSearch` wrapping free-text `SearchControl` → **Search menu** body (unwrap; wire `SearchControl` directly)
- Lines 175–180: `AddHubButton` → replaced by `ListCreateButtonPortal label="Entity" onClick={openCreate}`

Target shape after migration:

```tsx
// Before the wrapper div:
<ListCreateButtonPortal label="Entity" onClick={openCreate} />

// Wrapper:
<div className="mx-4">
  {/* message/pageError blocks moved here, out of old card */}

  <ListActionBar
    label="Entities"
    rowCount={rows.length}
    total={total}
    rowCountLabel="entities"
    hasActiveFilters={hasActiveFilters}   // combined gate — keep broad
    onClearAll={handleClearAll}
  >
    <ToolbarMenuButton
      label="Filter"
      icon={SlidersHorizontal}
      active={hasActiveFilterTool}        // state OR entityTypeIds
    >
      {/* StateSearchControl — precision state-CODE filter, NOT free-text search */}
      <StateSearchControl … />
      {/* EntityTypeMultiSelect — type-id filter picker */}
      <EntityTypeMultiSelect editable selectedIds={…} seedRefs={…} />
    </ToolbarMenuButton>

    <ToolbarMenuButton
      label="Search"
      icon={Search}
      active={hasActiveSearchTool}        // searchQuery only
    >
      {/* Single free-text SearchControl — no NumberSearchTabBody (no entity number field) */}
      <SearchControl placeholder="Search entity" … />
    </ToolbarMenuButton>
  </ListActionBar>

  <EntitiesTable … />   {/* directly below action bar, outside any card */}
</div>
```

Add lucide imports: `Search`, `SlidersHorizontal`.

**Active-dot split (products is the template):**
```ts
const hasActiveFilterTool = !!stateCode || entityTypeIds.length > 0;
const hasActiveSearchTool = !!searchQuery;
const hasActiveFilters = hasActiveFilterTool || hasActiveSearchTool; // keep for onClearAll gate
```

**`controllers/list/use-entities-list-controller.ts` (lines 1–15)**

Current state: minimal stub returning only `message`/`pageError`. Navigation (`useRouter`, `buildRecordCreateHref`, `useRecordEntryNavigation`) is inline in the client.

Canonical upgrade (if Flag ⚑1 approved — mirror job-types controller lines 7–18):
```ts
const { openCreate, openRecord: openEntity } = useRecordEntryNavigation("/dashboard/entities");
// expose openCreate, openEntity from controller hook
```
Then remove `useRouter`, `buildRecordCreateHref`, `useRecordEntryNavigation` from the client, import `openCreate`/`openEntity` from the controller instead.

---

## Migration

None — this is frontend-only, no schema change.

---

## Done means

- `/check` green (build + typecheck + lint + test)
- Entities list renders `[Entities][x of x entities][Clear] … [Filter ▾][Search ▾][+ Entity]` header band
- Filter menu contains: `StateSearchControl` (state-CODE filter) + `EntityTypeMultiSelect` (type-id picker)
- Search menu contains: single free-text `SearchControl` only (no number bar — entities have no number field)
- Per-menu active dots: Filter lights on state or entityTypeIds; Search lights on searchQuery
- `ListCreateButtonPortal label="Entity"` replaces `AddHubButton`
- `toolbar-controls/` folder and its `sub-controls/` subfolder deleted (empty husks)
- `EntitiesTable` renders directly below `ListActionBar`, outside any card wrapper
- `initialEntityTypeRefs` prop flows through to `EntityTypeMultiSelect seedRefs` unchanged
- `apps/web/app/dashboard/entities/page.tsx` untouched
- Commit message ≤17 words ready — **DO NOT COMMIT** (user commits)
