# Navigation Shell

> **Scope:** App shell that wraps every dashboard page. Header, navigation, user menu, layout slots.
> **Location:** `apps/web/modules/app-shell/`

## Rules

1. The navigation shell wraps every page. It is never conditionally rendered.
2. The header bar (logo, global icons, user menu) is always visible.
3. Primary navigation renders module links. Routing is URL-based.
4. Active navigation state is derived from the current URL segment — no local state toggles.
5. The shell does not fetch data. It renders chrome and delegates content to view engines.
6. Layout slots are filled by view engines (list view, record view) via composition.
7. The tools menu supports drag-and-drop reordering of navigation items.

## Contract

### Layout Structure

```
┌─────────────────────────────────────────┐
│  Header Bar                             │
│  ┌─────────┬──────────────┬──────────┐  │
│  │  Logo   │  Module Nav  │ User Menu│  │
│  └─────────┴──────────────┴──────────┘  │
├─────────────────────────────────────────┤
│                                         │
│  Content Slot (filled by view engine)   │
│                                         │
└─────────────────────────────────────────┘
```

### Header Controls

`HeaderControls` receives from the dashboard layout:
- `email` and `role` — for user menu display
- `canUseTools` — whether user has system access
- `tools` — list of tools with `isUnlocked` status per role
- `initialVisibleFlooringSlugs` — persisted nav visibility
- `initialOrderedFlooringSlugs` — persisted nav order

### Navigation State

`useFlooringNavigationState` manages:
- Visible navigation items (user can hide/show)
- Ordered navigation items (user can reorder via drag-and-drop)
- Tool unlock status (role-based gating)
- Builder panel access (OWNER/ADMIN only)

### User Menu

- Avatar button with email and role display.
- "Admin Panel" link (visible to OWNER/ADMIN only, navigates to `/dashboard/builder`).
- Warehouse link.
- Logout action.

## Structure

```
modules/app-shell/
├── components/
│   ├── header-controls.tsx    ← Top-level header composition
│   ├── header-nav.tsx         ← Module navigation links
│   ├── tools-menu.tsx         ← Drag-and-drop tool reordering
│   ├── user-menu.tsx          ← Avatar dropdown with role display
│   └── dashboard-error-state.tsx ← Full-page error fallback
├── hooks/
│   └── use-navigation-state.ts ← Navigation visibility + ordering state
└── navigation/
    └── definitions.ts          ← FLOORING_NAV_ITEMS, FlooringNavItem type
```

Dashboard layout entry point: `apps/web/app/dashboard/layout.tsx`
- Calls `requireSessionUser()` for auth gate
- Calls `getUserToolContext(role)` for tool access
- Passes tool context + nav preferences to `HeaderControls`

## Anti-Patterns

1. **Do not** conditionally render the shell — it wraps all dashboard pages unconditionally.
2. **Do not** derive active nav state from local state — use the URL segment.
3. **Do not** fetch data in the shell — it is purely presentational chrome.
4. **Do not** hardcode navigation items — use `definitions.ts` as the source of truth.
5. **Do not** gate navigation visibility with custom logic — use `canOpenItem()` from the navigation hook.

## Related Docs

- [LIST_VIEW_ENGINE.md](LIST_VIEW_ENGINE.md) — fills the content slot for list pages
- [RECORD_VIEW_ENGINE.md](RECORD_VIEW_ENGINE.md) — fills the content slot for record pages
- [../cross-cutting/AUTHORIZATION.md](../cross-cutting/AUTHORIZATION.md) — role-based nav gating
