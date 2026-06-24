# payments-link-work-orders-entities — add a nullable work-order link and a nullable single-entity link to a payment, pickable in the payments record view, with the linked entity's type(s) shown read-only

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` (target the payments module across every layer: schema → domain → data → application → api → module dir → pages) to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode: PLAN mode → produce a plan and STOP for approval. AUTO mode → execute. Either way, research-and-validate BEFORE acting.

Source-of-truth context lives in `.claude/DEVELOPER-PLANS/ENTITY-PAYMENTS.md`. Cite it. Two things from it bind this session:
- **The money axes / design.** A payment links to **exactly one entity**; the entity's type(s) are a **lookup off that entity** (read-only on the payment). A payment also has **its own type** (its money category) which is **separate-in-concept** from the entity's type array — "entity-type classifies the party, payment-type classifies the money." **You are NOT building the payment-type field this session** — just keep the two concepts un-conflated in anything you name or model.
- **The three rules that must hold** (ENTITY-PAYMENTS.md §"The three rules"):
  1. **Material outflow payments link to import/inventory, never directly to a work order** — so the WO link MUST stay **optional/nullable**; never make it required.
  2. **Adjustment cost is allocation-only — keep it out of the company running balance** (not in scope here, but don't model anything that fights it).
  3. **Cost/freight flows automatically** import→staged→inventory→adjustment (not in scope here).

## Intent for this session
Give `FlooringPayment` a **nullable, single** `entityId` FK and a **nullable, single** `workOrderId` FK. In the payments **record view only**, let the user pick the linked work order and the linked entity, and **display the linked entity's type(s) read-only** (reuse the existing entity-type chip). "Done" = a payment can be linked to one WO and one entity from its record view, the entity's type chips render read-only there, every other module's UI is untouched, and `/check` is green. This is **payments-UX-only**: from the work-orders or entities modules you would not know a payment is linked.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ **Entity link is nullable BUT exactly one (not array).** Model as a single nullable `entityId` String? + `Entity?` relation — mirror `Property.entityId` (schema.prisma:113-114, `onDelete: SetNull`). Do NOT use the `EntityEntityType` m2m join — that's entity↔type, not payment↔entity.
- ⚑ **WO link is nullable, single, now; array deferred.** Model `workOrderId` String? + `FlooringWorkOrder?` relation, `onDelete: SetNull`. Do NOT build an array link, but don't add a `@@unique` or anything that would preclude a future `payment[]` back-relation becoming a join table. Keep it OPTIONAL forever (rule #1 above).
- ⚑ **Entity type(s) are a READ-ONLY lookup off the picked entity** — they are NOT stored on the payment and NOT a picker. The display source is the linked entity's `entityTypes` → `{ type, color }`, surfaced by extending the payment **detail read** to `include` the entity + its types. Reuse `EntityTypesArrayPicker` with `editable={false}` (renders chips only, no trigger/✕) seeded from the entity's `EntityTypeRef[]`, OR map straight to `CellChip` (`@/engines/common`) per ref. Decide which; the array picker is the lighter reuse.
- ⚑ **Chip-on-create gap.** `EntityOption` (the picker's option shape, `packages/domain/src/management/entities/types.ts:42-52`) carries NO type info — only id/name/address. So immediately after picking an entity on the **create** face, you cannot show its type chips without a fetch. Decide: (a) show entity-type chips only on the **detail** face after save (simplest — the detail read hydrates them); or (b) fetch types on pick. Recommend (a). Surface this to the user.
- ⚑ **No payment-type field this session.** Deferred per the user + ENTITY-PAYMENTS.md §Design. Do not add it. Keep it conceptually separate from entity-type in any naming.
- ⚑ **NO list-column changes.** `components/list/table/payments-list-columns.ts` stays exactly as-is. Entity type(s) show in the RECORD VIEW only. (The deferred payment-type is what would later land in list columns — not now.)
- ⚑ **Back-relation naming on `Entity` / `FlooringWorkOrder`.** Adding the FKs requires Prisma back-relation fields on both models (`payments FlooringPayment[]`). These are **schema-only** — they add zero UI to those modules (payments-UX-only holds). Pick names (`payments`) and confirm no collision. This is the ONLY edit those two models get; do NOT touch their module UI/data/application/pages.
- ⚑ **Migration is nullable, no backfill.** Existing payment rows have no link → both columns NULL is correct. `flooring_payment` columns have **NO `@map`** (they're camelCase in the DB) so the FK columns + their FK constraints + indexes MUST double-quote the camelCase identifiers (`"entityId"`, `"workOrderId"`) — see the precedent migration `20260622150000_payment_actor_columns/migration.sql`. WRITE the migration; do NOT run it.
- ⚑ **API route + `_validators.ts` are in your envelope and MUST be edited.** The create/update validators parse the body field-by-field (`apps/web/app/api/payments/_validators.ts:68-86`), so `entityId`/`workOrderId` won't flow through unless you add `optionalString` parsing for them. The mutation helpers send `{ ...input }` so the form fields ride along automatically once `PaymentForm` grows them (`apps/web/modules/payments/data/mutations.ts:13-31`). Decide whether to validate that the ids exist (P2003 FK violation net) or let the DB FK reject — match how Property handles its `entityId`.
- ⚑ **How the WO/entity pickers fit the single primary section.** Payments has exactly ONE record section (the primary fields section). The pickers go inside `PaymentPrimaryFieldsSection` as new `<CellAt><FormField>` rows. They bind through the same `onFieldChange(field, value)` setter the existing fields use — `setLocalValue((prev) => ({ ...prev, [field]: value }))`. Both pickers need a `selectedLabel` (pre-resolved name) so the trigger shows the current link after reload — thread that label from the detail record (extend the detail read/`Payment` type to carry the linked entity name + WO label, or resolve via `onOptionSelected`). Decide the label-hydration path.

## Scope
In:
- Schema: add nullable `entityId` + `workOrderId` FKs to `FlooringPayment` (+ the back-relation fields on `Entity` and `FlooringWorkOrder`). Write the matching migration file.
- Domain: extend `PaymentForm` / `Payment` / `PaymentDetail` with the two FK ids (+ whatever read-only label/type-ref fields the record view needs to render the picker trigger labels and the entity-type chips); extend `toPaymentForm`, `EMPTY_PAYMENT_FORM`, normalizer input/output; add any FK-id validation rules if chosen.
- Data: extend the create/update write-repo input shapes to carry the FK ids; extend the **detail read** to `include`/`select` the linked entity (+ its `entityTypes`, reusing the `entityTypesSelect` fragment) and the linked work order (label fields), and the normalizer to project them.
- Application: thread the FK ids through `create-payment` / `update-payment` use-case inputs + types; surface the linked entity/WO + entity types in `get-payment` detail.
- API: parse + thread the FK ids in `apps/web/app/api/payments/_validators.ts` and the `route.ts` / `[id]/route.ts` handlers.
- Module UI: add the work-order picker, the entity picker, and the read-only entity-type chip display to `PaymentPrimaryFieldsSection` (consumed by both detail + create clients); wire them through `use-payment-primary-section.ts`'s `createLocalValue` + `saveSection` and the create controller. Pickers/chip are **imported** from other modules/engines (read-only reuse) — do NOT fork them.
- `/check` green.

Out:
- Any work-orders module UI/controllers/data/application/pages, and any entities or entity-types module UI/controllers/data/application/pages. You only ADD schema back-relation fields to the `Entity` and `FlooringWorkOrder` Prisma models — nothing else in those models' stacks.
- The record-view, picker, list-view, and common engines (`apps/web/engines/**`) — pure consumer, import only.
- The inventory and properties modules.
- Payments LIST columns (`components/list/table/payments-list-columns.ts`) — untouched.
- The payment's own type field — deferred, not built.
- Imports/inventory → payments linking — deferred, not built.

## Files you own (do not edit anything outside this list)
- `packages/db/prisma/schema.prisma` — add nullable `entityId` + `workOrderId` to `FlooringPayment` (~:444-461) + the back-relation field on `Entity` (~:92-107) and `FlooringWorkOrder` (~:546-590). Schema-only on those two models.
- `packages/db/prisma/migrations/<new>/migration.sql` — WRITE the ADD COLUMN + AddForeignKey + CreateIndex migration. Do NOT run it.
- `packages/domain/src/flooring/payments/**` — types.ts (`PaymentForm`/`Payment`/`PaymentDetail`/`EMPTY_PAYMENT_FORM`/`toPaymentForm`), normalizers.ts, form-rules.ts, errors.ts, index.ts.
- `packages/db/src/flooring/payments/**` — read-repository.ts (detail select/include + normalizer projection), write-repository.ts (create/update input + data), index.ts.
- `packages/application/src/flooring/payments/**` — create-payment.ts, update-payment.ts, get-payment.ts, types.ts (use-case input/result), errors.ts, index.ts.
- `apps/web/modules/payments/**` — record view (`components/record/**`, `controllers/record/primary/use-payment-primary-section.ts`, `data/mutations.ts`). NO list-column changes.
- `apps/web/app/dashboard/payments/**` — the record page loader (only if a prop change is needed).
- `apps/web/app/api/payments/**` — `route.ts`, `[id]/route.ts`, `_validators.ts` (parse + thread the FK ids).

## Layer-by-layer map
(real path:line)

Schema —
- `FlooringPayment` standalone, NO FKs yet: `packages/db/prisma/schema.prisma:444-461`. Add `entityId String?` + `entity Entity? @relation(fields:[entityId], references:[id], onDelete: SetNull)` and `workOrderId String?` + `workOrder FlooringWorkOrder? @relation(..., onDelete: SetNull)`, plus `@@index([entityId])` / `@@index([workOrderId])`.
- Copy the nullable-FK shape from `Property.entityId`: `schema.prisma:113-114` (`Entity? @relation(..., onDelete: SetNull)`) and its `@@index([entityId])` at `:130`.
- Back-relations: `Entity` model `:92-107` (add `payments FlooringPayment[]`), `FlooringWorkOrder` model `:546-590` (add `payments FlooringPayment[]`). Schema-only.
- Reuse-by-import (do NOT edit): entity-type select fragment `entityTypesSelect` at `packages/db/src/management/entities/read-repository.ts:18-23` — `{ entityType: { select: { id, type, color } } }`, ordered by type. This is the shape the chips consume.

Domain —
- `PaymentForm` (`amount`/`direction`/`paymentDate`), `Payment`, `PaymentDetail`, `EMPTY_PAYMENT_FORM`, `toPaymentForm`: `packages/domain/src/flooring/payments/types.ts:47-75` (form ~:47-52; `EMPTY_PAYMENT_FORM` :53; `toPaymentForm` below it; `PaymentDetail = Payment & { previousPayment, nextPayment }`). Add the two nullable FK ids to `PaymentForm` + `Payment`, seed `EMPTY_PAYMENT_FORM` with `null`/`""`, map them in `toPaymentForm`. Add read-only fields for the entity name + WO label + `entityTypes: EntityTypeRef[]` to `Payment`/`PaymentDetail` (so the record view can hydrate trigger labels + chips). `EntityTypeRef` already exists in `@builders/domain` (used by the array picker).
- Validation: `packages/domain/src/flooring/payments/form-rules.ts` (`validatePaymentForm`, `describePaymentFormIssues`) — add FK-id rules only if you decide to validate ids client-side; otherwise leave (DB FK + API net cover it).
- Normalizer: `packages/domain/src/flooring/payments/normalizers.ts:1-36` (`normalizePayment`, input shape ~:1-15). Extend the input shape + output to carry the FK ids + the projected entity name / WO label / entity-type refs.
- Barrel: `packages/domain/src/flooring/payments/index.ts`.

Data —
- Detail read is the key change: `getPaymentDetailById` / `getPaymentById` use `findUnique({ where: { id } })` with **NO explicit select** (`packages/db/src/flooring/payments/read-repository.ts:91-97, 134-152`) → currently returns scalar columns only. Add an `include`/`select` that pulls `entity: { select: { id, entity, entityTypes: entityTypesSelect } }` and `workOrder: { select: { id, workOrderNumber, ... label fields } }`, then project them in the normalizer. The list read (`listPaymentsForListView` :74-82) does NOT need the relations (no list-column changes) — leave it.
- Write: `CreatePaymentRecordInput` / `UpdatePaymentRecordInput` + the prisma create/update data (`packages/db/src/flooring/payments/write-repository.ts:40-46 create, :56-64 update`). Add `entityId?` / `workOrderId?` to both; in create set `entityId: input.entityId ?? null` etc.; in update guard with `if (input.entityId !== undefined) data.entityId = input.entityId` (so undefined ≠ clear-to-null vs. explicit null = clear — decide the semantics, match Property).
- Barrel: `packages/db/src/flooring/payments/index.ts`.

Application —
- Use-case input types `Omit<...,"createdBy"|"updatedBy">`: `packages/application/src/flooring/payments/types.ts:1-10`. The FK ids flow through automatically once the write-repo input grows them (the `Omit` keeps them). Confirm.
- `create-payment.ts:15-36` and `update-payment.ts:16-56` open `withDatabaseTransaction`, validate, then call the write-repo. No row-lock needed (payment is the aggregate, no children). Add a P2003 (FK violation) → `PaymentExecutionError` net if you validate ids; mirror the existing P2025 not-found net.
- `get-payment.ts:25-28` (`getPaymentDetailUseCase`) resolves neighbors — it now also returns the linked entity/WO + entity types via the extended detail read.
- NO outbox/relay in payments (confirmed none today) — do not add any.

Module dir —
- `PaymentPrimaryFieldsSection` (`apps/web/modules/payments/components/record/primary/payment-primary-fields-section.tsx:29-116`): the single field section. Add `<CellAt><FormField label="Work Order">` + `<FormField label="Entity">` picker rows and a read-only `<FormField label="Type(s)">` chip row after the Date field. Bind via the existing `onFieldChange` setter. Show the chip row only when an entity is linked (and only on the detail face — see chip-on-create flag).
- Pickers to IMPORT (read-only reuse, do NOT edit):
  - `WorkOrderPicker` — `apps/web/modules/work-orders/components/picker/work-order-picker.tsx` (props: `value`, `onChange`, `onOptionSelected`, `selectedLabel`, `disabled`, `ariaLabel`, …; also exports `formatWorkOrderOptionTitle`). Real consumer to copy: `apps/web/modules/inventory/components/record/adjustments/adjustment-picker-stack.tsx:50-57`.
  - `EntityPicker` — `apps/web/modules/entities/components/picker/entity-picker.tsx:45-119` (props: `value`, `onChange`, `onOptionSelected`, `selectedLabel`, `disabled`, `ariaLabel`, `initialOptions`, …). Real consumer to copy: `apps/web/modules/properties/components/record/primary/entity-picker-section.tsx:79-88`.
  - Entity-type read-only chips — `EntityTypesArrayPicker` with `editable={false}` (chips only, no trigger): `apps/web/modules/entities/components/record/primary/entity-types-array-picker.tsx:36-117`, real read-only usage `apps/web/modules/properties/.../entity-picker-section.tsx:92-94`. Or map refs directly to `CellChip` from `@/engines/common` (`apps/web/engines/common/badges/cell-chip.tsx`). NOTE: these picker/chip files live in modules listed Out-of-bounds — **importing them is allowed** (they're the canonical cross-module pickers per `apps/web/modules/CLAUDE.md` `components/picker/` convention); **editing them is not.**
- Controller: `use-payment-primary-section.ts:35-67` (`useSingleSectionRecordController<Payment, PaymentForm>`). Extend `createLocalValue` (:42-45) to seed the FK ids + read-only labels/chips from the record; the FK ids ride through `saveSection`'s `localValue` → `updatePaymentRequest` automatically.
- Create controller: `payment-create-client.tsx:34-51` (`useSingleSectionCreateController<PaymentForm>`, seeds `EMPTY_PAYMENT_FORM`). FK ids flow through `createPaymentRequest(localValue, key)`.
- Mutations: `apps/web/modules/payments/data/mutations.ts:13-31` send `{ ...input }` → no change needed once `PaymentForm` grows the ids (but verify).
- API: `apps/web/app/api/payments/_validators.ts:68-86` — add `entityId: optionalString(body.entityId,"entityId")` + `workOrderId` to `validateCreatePaymentInput` and the `if ("entityId" in body)` branch to `validateUpdatePaymentInput`. Wire into `route.ts` (POST) + `[id]/route.ts` (PATCH) via the standard mutation gauntlet (already in place).

Pages —
- `apps/web/app/dashboard/payments/record/page.tsx:14-44` loads via `getPaymentDetailUseCase(paymentId)` and hands `PaymentDetail` to `PaymentDetailClient`; no-id → `PaymentCreateClient`. Likely no change unless you add a prop; the extended detail data flows through `initialPayment` automatically.

## Migration (if schema changes)
Write the migration; DO NOT run it. The user runs all migrations (`db:deploy` only applies pre-written files — it does not generate them). New FKs are nullable; no backfill needed (existing rows stay NULL).
- Template to mirror: header-comment style + `ALTER TABLE "flooring_payment" ADD COLUMN "entityId" TEXT;` / `ADD COLUMN "workOrderId" TEXT;` (double-quoted camelCase — `flooring_payment` has NO `@map`, per `20260622150000_payment_actor_columns/migration.sql`), then `CREATE INDEX`, then `ALTER TABLE ... ADD CONSTRAINT "flooring_payment_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "entity"("id") ON DELETE SET NULL ON UPDATE CASCADE;` and the same for `workOrderId` → `"flooring_work_order"("id")`. AddForeignKey/CreateIndex shapes: see `20260624140000_create_entity_entity_type/migration.sql`.
- Name it with a fresh timestamped dir under `packages/db/prisma/migrations/`.

## Done means
- `/check` green (build + typecheck + lint + test). Watch the build-before-typecheck order (stale `dist/` trap on cross-package type changes — rebuild `packages/*` before typecheck).
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits). e.g. `feat(payments): link nullable work-order + single entity FKs, record-view pickers, read-only entity-type chips`
