# Shared Features Plan
## Shared Patterns, Why They Matter, Current State, and What Still Needs To Be Centralized

This document explains the shared features and shared architecture patterns in the system, why they matter, what currently exists, and what still needs to be moved into shared structures.

This is important because shared patterns reduce duplication, reduce drift, improve maintainability, and help the system scale cleanly over time.

---

# 1. Purpose

The system is growing into a structured internal platform, not just a collection of pages.

As that happens, repeated logic and repeated UI patterns must be centralized.

If they are not shared:
- files become large
- behavior drifts between modules
- bugs get fixed in one place but not another
- future modules take longer to build
- the app becomes harder to reason about

Shared features are one of the main tools for keeping the system clean.

---

# 2. Why Shared Features Matter

## 2.1 They reduce duplication
When multiple modules do the same thing:
- loading records
- opening panels
- saving rows
- rendering editors
- showing notices

that logic should not be rewritten each time.

## 2.2 They reduce drift
Without shared patterns:
- templates behave one way
- work orders behave another
- properties behave another
- management companies behave another

That creates inconsistency and maintenance overhead.

## 2.3 They make the system easier to scale
A shared pattern means new modules can be added faster and more safely.

## 2.4 They declutter the project
Yes, this was one of the major benefits of the refactor.

Shared code helped:
- remove repeated modal/form logic
- reduce repeated request handling
- reduce repeated item editor logic
- separate orchestration from rendering

That is one of the clearest architectural improvements in the system so far.

---

# 3. Shared Features Currently In The System

## 3.1 Shared record panels
The system now has reusable record panel patterns for major modules.

Examples include:
- template record panel
- work-order record panel
- property record panel
- management company record panel

These are important because they move the UI toward a reusable record-based database model.

## 3.2 Shared material row editor
Material rows are handled using a shared editor pattern.

This matters because material rows appear in multiple places:
- templates
- work orders
- later possibly inventory-linked views

## 3.3 Shared service row editor
Service rows are also handled using a shared editor pattern.

This is important for the same reason:
- consistent row behavior
- consistent field structure
- less repeated form code

## 3.4 Shared child collection handling
The system now has a shared child-collection hook pattern.

This is important because child collections repeat the same lifecycle:
- load rows
- add row
- save row
- delete row
- refresh rows

Centralizing this removed repeated logic from template and work-order panels.

## 3.5 Shared request helper
The app uses shared request handling utilities for frontend calls.

This is important because it standardizes:
- fetch behavior
- JSON handling
- error behavior

## 3.6 Shared notices
Success and error notices are shared.

That helps keep messaging and user feedback consistent.

## 3.7 Shared table controls
The app already has shared patterns for:
- table shell
- column visibility
- grouping
- sorting
- filtering

These are a major part of the internal database-style UX.

## 3.8 Shared URL-backed panel opening
Top-level panel state is starting to move into shared URL-backed behavior.

This is important because it supports:
- refresh-safe record opening
- better history behavior
- less hidden page-local state

---

# 4. What Shared Features Actually Do For The Project

Shared features currently help with:
- decluttering component files
- removing repeated fetch/mutation logic
- standardizing row editing behavior
- making major domains feel more consistent
- reducing one-off UI implementations
- preparing the system for future modules

This is one of the reasons the refactor improved the architecture in a meaningful way instead of only changing folder names.

---

# 5. What Still Needs To Be Shared

The system is cleaner now, but it is not fully shared yet.

The following areas still need stronger centralization.

## 5.1 Record controller hooks
Some page-level clients still hold too much orchestration.

What should be shared:
- work-order controller hook
- template controller hook
- property controller hook
- management company controller hook

These should own:
- list fetching
- save/delete orchestration
- normalization
- open/close record state

UI components should mostly render.

## 5.2 Linked record navigation
Nested linked-record behavior is not fully centralized yet.

What should become shared:
- open linked record
- close linked record
- stack behavior
- URL state
- history behavior

This is one of the most important remaining frontend architecture tasks.

## 5.3 Record field rendering
Some record fields are still rendered ad hoc inside panels.

What should be shared:
- read-only field display
- editable field wrappers
- standard field layouts
- status field display patterns
- summary block patterns

## 5.4 Summary and totals components
Totals, counts, and record summary areas should become more reusable.

Examples:
- item count summaries
- analytics summary blocks
- totals sections
- status summaries

## 5.5 Domain option loaders
Option-loading logic is still more page-specific than it should be.

What should become shared:
- domain query functions that return option sets
- panel-level option loading
- reusable reference-data loaders

## 5.6 Status display systems
Status labels and status color behavior still appear in multiple places.

These should be centralized so:
- the same status looks the same everywhere
- label rules stay consistent
- workflow changes are easier to apply

## 5.7 Audit/logging helpers
As audit logging is added, event creation should become shared.

Examples:
- template synced
- work order sent
- inventory shortage detected
- order marked complete

## 5.8 Environment/config access
Config should become more shared and explicit under server-side config modules.

Examples:
- Postgres env config
- Redis env config
- queue naming config
- storage config
- Railway-related runtime config

These are not “shared variables” in the frontend sense, but they are shared configuration responsibilities and should live centrally.

---

# 6. What Should Be Switched To Shared Variables Or Shared Constants

There are several categories of values that should be centralized as shared constants or shared config.

## 6.1 Status values
- work-order statuses
- shortage markers
- vacancy statuses
- any future send/export statuses

## 6.2 Queue names
- send-work-order
- inventory-sync
- document-generation
- notifications

## 6.3 Navigation slugs
- flooring route slugs
- menu labels
- tool keys

## 6.4 Domain field labels
- common table labels
- common form labels
- common summary labels

## 6.5 Environment-driven runtime config
- queue prefix
- service URLs
- storage bucket names
- Redis configuration
- database connection mode

## 6.6 Shared validation rules
- required fields
- status transition constraints
- item row rules
- service row rules

---

# 7. What Should Stay Local Instead Of Shared

Not everything should be shared.

The following should usually stay domain-local:
- domain-specific field order
- domain-specific labels that are not reused elsewhere
- highly specific business actions
- unique workflow-only panel sections
- unique analytics displays for one module

The goal is not to force everything into one shared bucket.
The goal is to share repeated patterns and keep unique behavior local.

---

# 8. Signs A Feature Should Be Shared

A feature probably should be shared if:
- it appears in 2 or more domains
- it has the same lifecycle in multiple places
- it has the same UI interaction in multiple places
- it should behave consistently across modules
- it is easy to drift or copy incorrectly

Examples:
- child-row editors
- record-panel wrappers
- linked-record open behavior
- request helpers
- status formatting

---

# 9. Signs A Feature Should Not Be Shared Yet

Something probably should stay local if:
- it exists in only one domain
- the behavior is still changing rapidly
- the business logic is unique
- forcing reuse would make the shared layer messy

Shared code should reduce complexity, not hide it.

---

# 10. Current Shared Architecture Maturity

## What is already in a good direction
- shared material/service editors
- shared notices
- shared child collection handling
- shared table infrastructure
- shared record-panel direction

## What is partially there
- URL-based panel state
- linked-record behavior
- panel stack behavior
- page/controller extraction

## What still needs major work
- full linked-record system
- full controller hook extraction
- field-level shared rendering system
- config centralization for Redis/workers/queues

---

# 11. Why This Matters For Future Apps

This matters beyond this one project because future internal systems will face the same problem:
- repeated records
- repeated child tables
- repeated panel patterns
- repeated status models
- repeated queue/config needs

If shared features are designed properly now, they become a reusable approach for future internal builds.

That means:
- faster development
- less duplication
- cleaner maintenance
- more consistent UX

---

# 12. Recommended Next Shared-Feature Priorities

Priority order:

1. Extract remaining controller hooks
2. Centralize linked-record navigation
3. Centralize status display and labels
4. Centralize runtime config modules
5. Move option loaders into reusable query helpers
6. Add reusable record summary blocks
7. Add shared audit/logging event helpers

---

# 13. Definition Of Success

Shared features will be considered successful when:
- large client files shrink meaningfully
- new modules are faster to build
- repeated UI behavior is consistent
- route/page logic becomes thinner
- navigation feels unified
- status and workflow rules do not drift
- infrastructure config is centralized instead of scattered

---

# 14. Reusable Standard For Future Apps

For future internal systems:

1. Identify repeated UI patterns early
2. Share infrastructure config early
3. Share table and panel patterns early
4. Keep domain-specific logic local
5. Move repeated lifecycle logic into hooks/services
6. Use shared features to reduce clutter, not just to “reuse code”

---

This file should be updated as more repeated patterns are centralized and as the shared architecture becomes more mature.
