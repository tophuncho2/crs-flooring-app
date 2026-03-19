# Overall System Schema Assessment
## Prisma Manager Review Of Schema, Validation, And Scalability

Assessment date:
- 2026-03-19

Scope reviewed:
- [prisma/schema.prisma](/Users/ottohull/builderswebapp/builderswebapp/prisma/schema.prisma)
- `prisma/migrations/*`
- `features/flooring/*/validators.ts`
- `server/http/api-helpers.ts`
- representative Prisma mutation/query paths in `features/`, `app/api/`, and `server/`

---

# 1. Executive Assessment

The schema is already beyond prototype quality.
It has:
- a real operational domain model
- mostly explicit foreign keys
- reasonable use of `Restrict`, `SetNull`, and `Cascade`
- useful workflow indexes on the hottest order tables
- a transaction pattern for the more dangerous multi-step mutations

The main risk is not that the schema is too small.
The main risk is drift between:
- the Prisma schema
- the live route behavior
- the custom validation layer
- the remaining legacy/raw-SQL paths

The system can scale, but it needs stricter Prisma-manager discipline in a few places before it should be considered schema-mature.

Current overall rating:
- schema foundation: strong
- validation foundation: moderate
- migration/drift posture: moderate risk
- long-term scalability posture: promising but not yet hardened

---

# 2. What Is Already Strong

## 2.1 The schema reflects real business workflow
The model is not generic or placeholder-driven.
The system has clear entities for:
- properties and management companies
- templates and work orders
- work-order and template child rows
- inventory, imports, locations, sections, and cut logs
- analytics as a distinct persisted concern

That is the right starting point for a scalable internal operations platform.

## 2.2 Relationship intent is mostly explicit
The schema generally uses the correct relational language:
- `Restrict` for records that should not disappear casually
- `SetNull` where history or optional linkage matters
- `Cascade` where a parent truly owns children

This is one of the biggest signs that the data model is being treated seriously.

## 2.3 Workflow-critical indexes exist
The work-order tables already include useful hot-path indexes such as:
- `propertyId + status`
- `status + scheduledFor`
- `createdAt`
- `updatedAt`
- foreign-key indexes on linked entities

That gives the system a credible base for operational table performance.

## 2.4 Multi-step writes are using transactions in important paths
Templates, work orders, template sync, and destructive product deletion already use transactions in the places where correctness matters most.

This is necessary for a schema that is starting to carry real workflow state.

## 2.5 The project already has supporting planning documents
Prisma work is not isolated from architecture.
The presence of:
- [DATA_MODEL_PLAN.md](/Users/ottohull/builderswebapp/builderswebapp/plans/DATA_MODEL_PLAN.md)
- [POSTGRES_BLUEPRINT.md](/Users/ottohull/builderswebapp/builderswebapp/plans/prismamanager/POSTGRES_BLUEPRINT.md)
- [prismamanager/README.md](/Users/ottohull/builderswebapp/builderswebapp/plans/prismamanager/README.md)

means the project already has the right planning shape for disciplined schema evolution.

---

# 3. Main Risks And Weaknesses

## 3.1 There is schema-to-runtime drift in the warehouse section/location area
This is the single clearest schema integrity warning in the repo today.

The Prisma schema models:
- `FlooringSection`
- `FlooringLocation.sectionId`

But the live routes still use raw SQL that assumes:
- a legacy `flooring_location.section` text column
- a separate ad hoc `flooring_section_registry` table created at runtime

This means the running behavior is not fully aligned with the canonical Prisma schema.

Why this matters:
- schema reviews can become misleading
- migrations become riskier
- referential integrity is weaker than the Prisma model implies
- future developers can easily change one side and break the other

This should be treated as a priority Prisma-manager cleanup item.

## 3.2 Validation is custom and useful, but not yet uniform or fully centralized
The app has a solid custom validation base in `server/http/api-helpers.ts` and the domain validators.
That is good.

But validation currently has these limits:
- rules are spread across many files
- uniqueness checks are sometimes form-side only
- enum normalization is domain-specific rather than standardized
- cross-record validation lives mostly in mutation logic instead of a reusable domain-validation layer

The current approach works, but it will become harder to scale cleanly as more domains are added.

## 3.3 Some important domain invariants are not yet enforced strongly enough at the schema boundary
Examples:
- no clear database-level guard that `isComplete` and `status` stay consistent
- no database-level check constraints on numeric fields such as quantities, costs, cuts, and stock counts being non-negative where required
- no explicit uniqueness around template tags by property if that is intended to be a business identifier
- no explicit guard that analytics totals remain aligned to valid work-order states

Not every rule belongs in the database, but some of these do.

## 3.4 Enum lifecycle is partly cleaned up, but not fully standardized
The schema still shows transitional signals:
- `Role` still contains older values while most logic uses `ADMIN` and `BUILDER`
- work-order lifecycle appears to still be stabilizing
- some route and validator normalization logic exists because enum semantics are not yet fully finalized

This is manageable now, but enum drift becomes expensive later because it touches schema, validation, UI labels, and analytics.

## 3.5 Raw SQL usage is justified in some places, but governance is not yet strict enough
Raw SQL is not inherently bad.
The issue is that it is currently being used for:
- legacy compatibility
- runtime table creation
- bypassing Prisma-managed relation shape

That combination increases the chance of drift.

Prisma manager guidance should require one of the following for each raw-SQL path:
- it exists because Prisma cannot model the operation cleanly
- it is temporary and has a retirement plan
- it is documented as a canonical exception

## 3.6 Query design is decent, but some page-level loaders are still broad
The codebase has many targeted `select` clauses, which is good.
But there are also several page/detail loaders that fetch many option lists and related data together.

This is not a crisis at current size.
It is a scale warning:
- initial page loads will become heavier
- option tables will become bottlenecks
- “load everything for the editor” patterns will age poorly

## 3.7 Schema ownership is strong in the flooring domain and weaker outside it
The flooring area has clear structure.
Other areas such as auth, account preferences, builder admin, and shell preferences are smaller but less formally modeled as domain systems.

That is fine for now, but Prisma-manager scope should eventually cover them with the same rigor:
- lifecycle rules
- retention rules
- uniqueness rules
- access boundaries

---

# 4. Validation Assessment

## 4.1 Current validation quality
Current validation quality is good enough for an internal app moving toward production.

Strengths:
- required vs optional parsing is explicit
- decimals are normalized centrally
- state abbreviations are normalized
- enum parsing exists for work-order status and vacancy
- request errors are translated into user-facing responses

## 4.2 Current validation gaps
The main gaps are not syntax-level.
They are semantic.

Examples:
- little evidence of reusable cross-entity validation policies
- limited shared validation for referential business rules
- no single validation inventory for “what the schema expects” vs “what the UI accepts”
- incomplete normalization of identifiers, URLs, emails, and phone fields
- no clear standard for max lengths across text fields

## 4.3 What “great” looks like here
To make schema validation great:
- use one consistent parsing and validation approach everywhere
- centralize domain invariants that are stronger than simple field parsing
- define which rules belong in validators, mutations, and DB constraints
- add durable tests for validation edge cases and invariant failures

---

# 5. Scalability Assessment

## 5.1 What supports scale today
- normalized relational structure
- explicit child tables instead of blobs
- many foreign-key indexes
- generated business numbers for templates and work orders
- transaction use in critical workflows

## 5.2 What will limit scale if left alone
- schema drift between Prisma and raw SQL
- inconsistent validation ownership
- broad option-loading patterns
- incomplete check constraints on numeric and state correctness
- lack of a formal migration review checklist attached to each schema change

## 5.3 Most important scalability principle for this repo
The biggest scalability win will not come from adding more tables.
It will come from tightening discipline around the existing ones:
- one canonical schema
- one validated write path
- one migration process
- one clear rule for when raw SQL is allowed

---

# 6. Priority Recommendations

## Priority 1: Eliminate Prisma drift in sections and locations
Do first:
- decide whether `FlooringSection` is canonical
- remove runtime creation of ad hoc registry tables
- stop relying on legacy `flooring_location.section` string storage if `sectionId` is the real model
- migrate routes to the Prisma-managed relation model

## Priority 2: Define schema-level invariant boundaries
Document and then enforce which rules belong in the database.

Start with:
- non-negative quantity/cost/cut checks where appropriate
- completion/status consistency rules
- business-identifier uniqueness rules that are meant to be durable

## Priority 3: Standardize validation ownership
Create a Prisma-manager validation standard:
- field parsing layer
- domain invariant layer
- DB constraint layer
- UI-only convenience normalization layer

## Priority 4: Add a migration review rubric
Every schema change should answer:
- what data moves
- what constraints change
- what indexes change
- what runtime code must change with it
- what rollback risk exists

## Priority 5: Audit raw SQL and broad queries
Inventory all raw SQL paths and classify them as:
- acceptable canonical exception
- temporary compatibility bridge
- migration debt to remove

Then review heavy page-detail queries for option-loading and over-fetch risk.

---

# 7. Prisma Manager Verdict

The system already has a real schema worth protecting.
That is the good news.

The next level is not “add more schema.”
The next level is:
- remove schema drift
- formalize validation boundaries
- tighten invariants
- make migration discipline explicit

If those are done, this system’s schema can move from “strong internal app foundation” to “great and scalable operational data model.”
