# Admin Control Panel — Decomposition Audit

> Generated 2026-04-06 via full codebase audit.

---

## 1. Admin Panel Entry Point

### Gear Icon / Access Link

**File:** `apps/web/modules/app-shell/components/user-menu.tsx`

The "Admin Panel" button appears in the user avatar dropdown menu (top-right). Visible only to OWNER and ADMIN roles:

```typescript
const isGovernanceUser = role === "ADMIN" || role === "OWNER"
const hasBuilderPanelAccess = isGovernanceUser
```

Clicking navigates via `router.push("/dashboard/builder")` — standard URL push, not a modal.

### Route & Page

**File:** `apps/web/app/dashboard/builder/page.tsx` (15 lines)

```typescript
export default async function BuilderPage() {
  const user = await requireSessionUser()
  if (!canAccessBuilderPanel(user.email, user.role)) {
    redirect("/dashboard/inventory")
  }
  return <BuilderUsersPanel />
}
```

- Server Component gates access via `canAccessBuilderPanel()` (checks `builderPanel.access` capability).
- No server-side data fetching — all data is fetched client-side on mount.
- No `layout.tsx` specific to the builder section.
- Renders `<BuilderUsersPanel />` with zero props.

---

## 2. `modules/builder/` — Complete File Inventory

**Single file:**

| File | Exports | Imports From |
|------|---------|-------------|
| `modules/builder/components/users-panel.tsx` (397 lines) | `BuilderUsersPanel` (default) | `@builders/domain` (date formatting), `modules/shared/engines/common/transport/http` (`requestJson`), `modules/shared/engines/common/transport/mutation` (`withMutationMeta`), `modules/shared/engines/common/display/dashboard-card-title` |

No engine integration. No controller. No data/ directory. No views/ directory. Entirely self-contained custom component.

---

## 3. `BuilderUsersPanel` Deep Dive

### 3.1 State (11 variables)

| State | Type | Initial | Purpose |
|-------|------|---------|---------|
| `users` | `UserRow[]` | `[]` | All OWNER/ADMIN/BUILDER users |
| `activityRows` | `ActivityRow[]` | `[]` | Recent login activity |
| `loadingUsers` | `boolean` | `true` | Users table loading |
| `activityLoading` | `boolean` | `false` | Activity table loading |
| `message` | `string` | `""` | Success banner |
| `error` | `string` | `""` | Error banner |
| `savingUserIds` | `Set<string>` | `new Set()` | IDs of users with in-flight mutations |
| `viewerCanManageUsers` | `boolean` | `false` | Viewer has `users.manage` capability |
| `selectedUser` | `UserRow \| null` | `null` | Modal detail view target |
| `activityError` | `string` | `""` | Activity-specific error |
| `sectionsOpen` | `{users: boolean, activity: boolean}` | `{users: true, activity: false}` | Collapsible section state |
| `activityLoaded` | `boolean` | `false` | One-time flag for initial activity load |

### 3.2 Data Fetching

**Users (on mount):**
```
useEffect(() => void loadUsers(), [])
→ GET /api/builder/users
→ Response: { users: UserRow[], viewerCanManageUsers: boolean }
```

**Activity (polling when section expanded):**
```
useEffect(() => {
  if (!sectionsOpen.activity) return        // stop when collapsed
  if (!activityLoaded) void loadActivity()  // one-time initial load
  const timer = setInterval(() => void loadActivity(), 10_000)  // 10s polling
  return () => clearInterval(timer)
}, [activityLoaded, activityRows.length, sectionsOpen.activity])
→ GET /api/builder/users/activity
→ Response: { activity: ActivityRow[] }
```

### 3.3 Table Rendering

**Columns:**

| Column | Content | Editable? |
|--------|---------|-----------|
| Email | `user.email` | No |
| Role | Badge + "PENDING APPROVAL" subtext if BUILDER && !isVerified | No |
| Status | `<select>` dropdown: "Verified" / "Pending Approval" | **Yes (inline)** — immediate save, no dirty state |
| Created | `formatStableDate(user.createdAt)` | No |

**Row click:** Opens modal with user details (`setSelectedUser(user)`). NOT URL navigation.

**Status dropdown behavior:**
- Disabled if `!viewerCanManageUsers` OR `!user.canRestrict` OR saving in flight
- `event.stopPropagation()` prevents row click from firing
- On change: immediately calls `updateUser(userId, { isVerified: value === "verified" })`
- No confirmation, no dirty state tracking
- Non-BUILDER rows show "Governance role. Managed outside panel." text instead of dropdown

### 3.4 Modal Detail View

Triggered by row click. Fixed overlay with click-outside-to-close.

**Content:**
- Email, Level (role), Status (Verified/Pending), Created date
- Delete button (only if `viewerCanManageUsers`):
  - Disabled if `!user.canDelete` (shows "Delete Blocked")
  - No confirmation dialog — direct call to `deleteUser(userId)`
  - Shows "Deleting..." while in flight

### 3.5 Mutations

**Update user (PATCH):**
```
PATCH /api/builder/users/{id}
Body: { isVerified: boolean, mutation: { idempotencyKey: uuid } }
Response: { user: UserRow }
→ Replaces user in local array by ID
```

**Delete user (DELETE):**
```
DELETE /api/builder/users/{id}
Body: { mutation: { idempotencyKey: uuid } }
Response: { success: true }
→ Filters user from local array, closes modal
→ Success message: "User deleted. They can be added back through an account request or admin-created account."
```

No optimistic updates — waits for server confirmation for both operations.

---

## 4. API Routes — Builder/Users

### User Routes

| Route | Method | Capability | Rate Limit | Idempotency | OCC | Delegation |
|-------|--------|-----------|------------|-------------|-----|------------|
| `/api/builder/users` | GET | `users.manage` | 100/60s (query default) | No | No | `listManagedUsers(actor)` |
| `/api/builder/users/[id]` | PATCH | `users.manage` | 30/10min | Yes (receipts) | **No** | `updateManagedUser(actor, id, input)` |
| `/api/builder/users/[id]` | DELETE | `users.manage` | 20/10min | Yes (receipts) | **No** | `deleteManagedUser(actor, id)` |
| `/api/builder/users/activity` | GET | `users.manage` | 100/60s (query default) | No | No | `listManagedUserActivity()` |

All use `applyRoutePolicy()` (modern pattern). None use deprecated `requireRouteAccess()`.

**Notable:** User PATCH/DELETE do NOT use optimistic concurrency control (`assertExpectedUpdatedAt`) — this is documented in `docs/patterns/ACCEPTED_EXCEPTIONS.md` as Exception 1 (admin-only endpoints skip OCC).

### Other Builder Routes (unit-of-measures)

| Route | Method | Capability | Tool Slug | Note |
|-------|--------|-----------|-----------|------|
| `/api/builder/unit-of-measures` | GET | `system.access` | `products` | Unrelated to users |
| `/api/builder/unit-of-measures` | POST | `unitOfMeasures.edit` | `products` | Unrelated to users |
| `/api/builder/unit-of-measures/[id]` | PATCH | `unitOfMeasures.edit` | `products` | Unrelated to users |
| `/api/builder/unit-of-measures/[id]` | DELETE | `unitOfMeasures.edit` | `products` | Unrelated to users |
| `/api/builder/unit-of-measures/[id]/primary/section` | PATCH | `unitOfMeasures.edit` | UoM slug | Unrelated to users |

These are NOT part of the admin panel decomposition — they are unrelated builder configuration routes.

---

## 5. `server/builder/users.ts` — 5 Exported Functions

| Function | Prisma Calls | Governance | Notes |
|----------|-------------|------------|-------|
| `listManagedUsers(actor)` | `user.findMany({ role: in [OWNER, ADMIN, BUILDER] })` | Computes `viewerCanManageUsers` flag | Normalizes each row via `normalizeManagedUserRow()` |
| `normalizeManagedUserUpdateInput(body)` | None | Rejects `role` field, validates `isVerified` type | Pure validation |
| `updateManagedUser(actor, id, input)` | `user.findUnique()`, `user.update()` | `assertGovernedUserUpdate()` | Only BUILDER role editable |
| `deleteManagedUser(actor, id)` | `user.findUnique()`, `user.delete()` | `assertGovernedUserDelete()` | Hard delete, BUILDER only |
| `listManagedUserActivity()` | `userLoginActivity.findMany({ take: 200 })` | **None** (route-layer only) | No actor param, no inline governance |

### `listManagedUserActivity()` — Removal Analysis

- **Only consumer:** `/api/builder/users/activity` GET route
- **Only writer:** `server/auth/auth-options.ts` (login callback creates records)
- **Can be deleted cleanly:** Yes — no other code reads activity. The function, its API route, and the UI polling can all be removed together.
- **Keep the model and write:** Yes — `UserLoginActivity` is an audit trail. The write on login should stay. Only the read/display UI is being removed.
- **`onDelete: SetNull`** on userId confirms activity records survive user deletion.

---

## 6. `server/auth/user-governance.ts` — Governance Rules

| Function | What It Does | Key Constraints |
|----------|-------------|-----------------|
| `resolveGovernedVerification(role, input, fallback)` | Computes effective `isVerified` | Non-BUILDER → always true. BUILDER → input if provided, else fallback. |
| `assertGovernedUserUpdate({ actor, target })` | Permission gate for updates | Actor must have `users.manage`. Target must be BUILDER role. |
| `assertGovernedUserDelete({ actor, target })` | Permission gate for deletes | Same as update. |
| `normalizeManagedUserRow(user, actor)` | Transforms DB row → API row | Computes `canRestrict`, `canDelete` (both: canManage && isBuilder), `canEditRole` (always false), conditionally hides `isVerified` for non-builders. |

**FLO-30 dependency question:** These functions should move to `packages/domain/` (they are pure business rules with no I/O). However, the new Users module can be built against the current locations and migrated later — the controller's API calls are route-based, not import-based.

---

## 7. Database Schema — UserLoginActivity

```prisma
model UserLoginActivity {
  id         String   @id @default(uuid())
  userId     String?
  userEmail  String
  loggedInAt DateTime @default(now())
  user       User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  @@index([loggedInAt])
  @@index([userEmail])
}
```

- Written by: `server/auth/auth-options.ts` only (on successful login)
- Read by: `server/builder/users.ts:listManagedUserActivity()` only
- `userId` nullable + `onDelete: SetNull` → activity survives user deletion
- **Decision:** Keep model + keep write. Remove read UI + read function + read API route.

---

## 8. Navigation & Routing

**Current state:**
- URL: `/dashboard/builder` — flat page, no subdirectories
- No `layout.tsx` in builder section
- Gear icon → user menu dropdown → "Admin Panel" button → `router.push("/dashboard/builder")`

**Target state:**
- `/dashboard/builder/users` — list view (engine instance)
- `/dashboard/builder/users/[id]` — record view (engine instance)
- `/dashboard/builder` page should redirect to `/dashboard/builder/users`

**Route structure to create:**
```
app/dashboard/builder/
├── page.tsx                    ← Redirect to /dashboard/builder/users
└── users/
    ├── page.tsx                ← List view (Server Component → Client)
    └── [id]/
        └── page.tsx            ← Record view (Server Component → Client)
```

---

## 9. What Can Be Deleted / Modified / Created

### Files to DELETE Entirely

| File | Reason |
|------|--------|
| `modules/builder/components/users-panel.tsx` | Replaced by engine-driven module |
| `app/api/builder/users/activity/route.ts` | User Activity feature removed |

### Files to MODIFY

| File | Change |
|------|--------|
| `app/dashboard/builder/page.tsx` | Replace `<BuilderUsersPanel />` with `redirect("/dashboard/builder/users")` |
| `server/builder/users.ts` | Remove `listManagedUserActivity()` export. Keep remaining 4 functions. |
| `modules/app-shell/components/user-menu.tsx` | Change "Admin Panel" nav target from `/dashboard/builder` to `/dashboard/builder/users` (or keep as-is if redirect handles it) |

### Files to CREATE

**Module structure:**
```
modules/users/
├── controller/
│   ├── use-users-list-controller.ts         ← Composes useConfiguredTableState
│   └── use-user-primary-controller.ts       ← Primary section (useRecordSectionController)
├── data/
│   └── server-records.ts                    ← Server-side query for SSR (list + single user)
├── components/
│   ├── list/
│   │   ├── users-client.tsx                 ← Client wrapper with controller hook
│   │   └── users-table.tsx                  ← Column definitions + config
│   └── record/
│       ├── user-detail-client.tsx           ← Client wrapper for record view
│       └── user-primary.tsx                 ← Primary section form (email, role, status, created)
```

**Route structure:**
```
app/dashboard/builder/users/
├── page.tsx                                 ← List page (SSR → users-client)
└── [id]/
    └── page.tsx                             ← Record page (SSR → user-detail-client)
```

**API routes:**
```
app/api/builder/users/route.ts               ← Keep as-is (GET list)
app/api/builder/users/[id]/route.ts          ← Keep as-is (PATCH, DELETE)
app/api/builder/users/[id]/primary/section/
    └── route.ts                             ← NEW: PATCH for section-based save (record view)
```

The existing `/api/builder/users` routes stay — they already follow the execution engine pattern. A new section route may be needed if the record view uses section-based save (which the engine requires).

---

## 10. Decomposition Sequence

### Step 1: Remove User Activity feature
- Delete `app/api/builder/users/activity/route.ts`
- Remove `listManagedUserActivity()` from `server/builder/users.ts`
- Remove activity state, polling effect, and activity UI from `users-panel.tsx` (or defer to step 6 when the whole file is deleted)
- Keep `UserLoginActivity` model and the write in `auth-options.ts`

### Step 2: Create canonical module structure
- Create `modules/users/` with `controller/`, `data/`, `components/list/`, `components/record/` directories

### Step 3: Create list view
- `modules/users/data/server-records.ts` — server query wrapping `listManagedUsers()`
- `modules/users/controller/use-users-list-controller.ts` — composes `useConfiguredTableState`
- `modules/users/components/list/users-table.tsx` — column config: Email, Role, Status (read-only badge), Created
- `modules/users/components/list/users-client.tsx` — client wrapper
- `app/dashboard/builder/users/page.tsx` — SSR page

### Step 4: Create record view
- `modules/users/controller/use-user-primary-controller.ts` — composes `useRecordSectionController`
- `modules/users/components/record/user-primary.tsx` — fields: email (read-only), role (read-only for non-BUILDER, or always read-only), isVerified (toggle for BUILDER), created (read-only)
- `modules/users/components/record/user-detail-client.tsx` — client wrapper
- `app/dashboard/builder/users/[id]/page.tsx` — SSR page
- May need: `app/api/builder/users/[id]/primary/section/route.ts` for section-based save

### Step 5: Wire routes & navigation
- Update `app/dashboard/builder/page.tsx` to redirect to `/dashboard/builder/users`
- Optionally update user-menu.tsx nav target

### Step 6: Delete old panel
- Delete `modules/builder/components/users-panel.tsx`
- Delete `modules/builder/` directory if empty
- Verify no other imports reference the deleted file

### Step 7: Verify
- List view: navigates, searches, sorts, paginates
- Record view: loads user, shows fields, saves verification toggle, deletes with confirmation
- Governance: BUILDER-only editing, OWNER/ADMIN immutable, role editing blocked
- Activity write still works on login (audit trail preserved)

---

## 11. Governance Rules — Record View Requirements

The record view must enforce:

| Rule | Detail |
|------|--------|
| **BUILDER users are editable** | `isVerified` field toggleable. Delete allowed. |
| **OWNER/ADMIN users are read-only** | All fields display-only. No save button. No delete. Show "Governance role" indicator. |
| **Role is never editable** | `canEditRole` always false. Display as read-only badge. |
| **Delete requires BUILDER target** | Delete button hidden/disabled for non-BUILDER. |
| **Delete needs confirmation** | Current panel has NO confirmation — the new record view MUST add a confirmation prompt per engine pattern. |
| **Self-governance prevention** | `assertGovernedUserUpdate/Delete` checks `canManageUsers(actor)` — a BUILDER cannot govern themselves since they lack `users.manage`. |
| **Verification semantics** | BUILDER: reflects actual `isVerified`. Non-BUILDER: always shows as "Verified" (computed, not stored). |

---

## 12. Decomposition Dependencies

| Dependency | Blocks Users Module? | Recommendation |
|-----------|:-------------------:|----------------|
| **FLO-30** (move governance to packages) | **No** | Build against current `server/builder/` and `server/auth/` locations. FLO-30 migrates backend imports later — the API layer doesn't change. |
| **FLO-43** (remove self-registration) | **No** | Independent. No shared components with admin panel. |
| **FLO-44** (email-first login) | **No** | Independent. No shared components with admin panel. |
| **NEW-3, NEW-4** (schema migrations) | **No** | Needed for FLO-43/44, not for Users module. Current schema works. |
