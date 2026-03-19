# Simple Table Test Matrix
## Reusable Coverage Template For Shared CRUD Table Domains

This matrix applies to simple table domains that share the same broad structure:
- searchable/sortable table
- create action from the table toolbar
- edit and delete row actions
- shared `BasicRecordPanel`
- shared `useUrlRecordEditor`
- route-backed create, update, and delete behavior

Current in-scope simple domains:
- `services`
- `unit-of-measures`
- `manufacturers`
- `categories`

Out of scope for this matrix:
- `properties`
- `products`
- `management-companies`
- `templates`
- `work-orders`
- `imports`
- `inventory`
- `warehouse`

Those require dedicated workflow or nested-record plans.

---

# 1. Create Flow

Every simple-table domain must test:

- open create panel from the table action
  - pass: clicking the toolbar create action opens the correct create panel
  - fail: no panel opens, wrong panel opens, or stale draft values appear

- required fields visibly marked
  - pass: required inputs render in required/error styling when empty
  - fail: required fields look optional or drift from shared styling rules

- invalid submit blocks request
  - pass: submit with empty required fields does not call the request layer
  - fail: request is sent with missing required data

- each required field tested individually
  - pass: missing each required field produces the expected error behavior
  - fail: only the “all fields empty” case is tested

- valid submit sends exact payload
  - pass: the create request contains the exact expected body and method
  - fail: wrong field names, missing normalization, or stale values are sent

- success adds row in correct sorted state
  - pass: the created row appears in the right place in client state
  - fail: row appends incorrectly, duplicates, or leaves stale ordering

- server-side error renders correctly
  - pass: route error is shown to the user and the panel remains usable
  - fail: error is swallowed, state resets incorrectly, or panel closes

---

# 2. Edit Flow

Every simple-table domain must test:

- row action opens the correct record panel
  - pass: the targeted row opens, not a different row
  - fail: wrong row draft is loaded or no panel opens

- draft loads current row values
  - pass: inputs reflect the selected row
  - fail: empty draft, stale values, or mismatched record state

- required fields enforced on save
  - pass: invalid save is blocked before request
  - fail: request fires with missing required data

- valid save sends exact PATCH payload
  - pass: request path, method, and body are correct
  - fail: wrong route, wrong id, or wrong serialized values

- success updates only target row
  - pass: the edited row updates and the rest of the table stays unchanged
  - fail: duplicate row, wrong row update, or stale selected record

- panel remains open with server error
  - pass: error notice shows and the user can correct the form
  - fail: panel closes, draft resets, or message appears in the wrong place

---

# 3. Delete Flow

Every simple-table domain must test:

- delete requires confirmation
  - pass: delete does not proceed without confirmation
  - fail: destructive action happens immediately

- cancel leaves state unchanged
  - pass: no request is sent and the row remains in place
  - fail: row disappears or request still fires

- valid delete removes row
  - pass: confirmed delete removes the row and shows success feedback
  - fail: row remains, duplicate state appears, or feedback is missing

- linked or delete-blocked errors are surfaced
  - pass: conflict or linked-record errors are shown to the user
  - fail: error is swallowed or state is partially mutated

- deleting an open record closes panel safely if success
  - pass: open panel closes only after successful delete
  - fail: panel stays bound to missing data or closes before failure is known

---

# 4. Panel Behavior

Every simple-table domain must test:

- notices clear at the correct times
- draft resets between create sessions
- save is disabled while saving
- close behavior is safe during save
- URL-backed edit state stays consistent where applicable

Minimum expected outcomes:
- old notices do not leak into a fresh create or edit action
- stale draft state does not survive into a new create flow
- repeated save clicks do not double-submit
- record selection and panel state stay aligned

---

# 5. Table Behavior

Every simple-table domain must test the minimum table interactions that can break CRUD correctness:

- search or grouping does not break row-action targeting
- edit action still opens the correct underlying row after filtering
- delete action still removes the correct underlying row after sorting or grouping
- empty-state rendering stays correct after create and delete transitions

These tests do not need to exhaustively test the shared table system in every domain.
They should confirm that domain wiring into the shared table system does not break CRUD behavior.

---

# 6. Route Validation

Every simple-table domain must test:

- POST required fields
- PATCH required fields
- optional field normalization
- decimal or number validation where relevant
- foreign key validation where relevant
- auth protection
- normalized error responses

Expected split:
- route tests prove server truth
- component tests prove the user cannot easily bypass obvious validation through the UI

---

# 7. Shared Primitive Expectations

Simple-table domains depend on these shared pieces:
- `requestJson`
- `BasicRecordPanel`
- `RecordPanelFooter`
- `useUrlRecordEditor`
- shared field-state styling

Before copying the matrix broadly, these shared pieces must have direct tests.
Domain tests should then only verify their domain-specific wiring and behavior.

---

# 8. Copy Template For New Simple Domains

When a new simple-table domain is added, implementation should follow this minimum test set:

1. route create validation
2. route update validation
3. route happy-path create or update
4. component create-flow test
5. component edit-flow test
6. component delete or confirm test
7. one server-error regression test

If the domain introduces a new field type or rule not already covered by the shared pattern, add both:
- a domain-specific route regression test
- a domain-specific UI regression test
