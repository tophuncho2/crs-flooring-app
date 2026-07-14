---
name: entity-picker
description: Master of the shared entity picker (EntityTypePicker) — the single type→entity combo used everywhere an entity is selected (payments, products, imports, properties, entities→properties create, and the work-orders/properties/templates list filters) — and the label-binding contract every consumer must honor. Invoke to wire the picker onto a NEW consumer correctly, audit an existing consumer for the blank/stale trigger-label bug or wiring drift, or fold a forked copy of the combo/presentation/options-request back onto the one shared source. Knows the footgun cold — PickerTrigger derives its label ONLY from `selectedLabel`, never from `value`, so a consumer that binds the label to the saved join name with no local picked-label state shows nothing on select. Editing skill, not read-only. Explicit-only — invoke on /entity-picker.
---

# /entity-picker

`/entity-picker` makes you the owner of the **shared entity picker** — the `EntityTypePicker` type→entity combo and the **label-binding contract** every place that consumes it must satisfy. The user invokes it with a free-form intent — "wire the entity picker onto the new contacts form", "audit payments' entity picker for the label bug", "the import picker goes blank on select", "fold this copied combo back onto the shared one". Your job: ground in the one shared machinery, classify the task, and drive the consumer (or the shared source) to correctness.

This is an **editing** skill — it reads, classifies, then makes the change. It is not a read-only audit (that's `/quick-report`/`/dig`) and not a whole-module plan (that's `/session-new`). The picker's *engine chrome* (`@/engines/picker` — `PickerList`, `PickerTrigger`, the async controller) belongs to `/engine`; **this skill owns the entity-domain picker built on top of it and the consumer contract end to end.**

## The model (what the entity picker IS)

One shared combo, consumed in many places, behind a strict label contract. There is exactly **one** of each of these — never fork them (`[[consolidate-shared-not-per-module]]`):

- `apps/web/modules/entities/components/picker/entity-type-picker.tsx` — **the combo.** A split-pane `AnchoredPanel`: a multi-select type **rail** on the left (internal type-narrowing, never lifted to consumers) and the entity **list** on the right. `handleEntitySelect` (~`:95-106`) fires `onChange(raw.id)` **and** `onOptionSelected(raw)` then closes.
- `apps/web/modules/entities/components/picker/entity-option-presentation.ts` — **the "set once" reference.** `entityOptionLabel` (the title + the on-select trigger label) and `toEntityOption` (title + 2 subtitle lines). Canonical sort is alphabetical by `entity`, enforced server-side.
- `apps/web/modules/entities/components/picker/entity-create-menu.tsx` — the ⋮ **create-new** affordance (built on `RecordCreateMenu`, opens `EntityQuickCreateModal`). Optional per consumer.
- `apps/web/modules/entities/data/entity-options-request.ts` + `apps/web/app/api/entities/options/route.ts` — the options query key + async search + GET route.
- `packages/domain/src/management/entities/types.ts` + `normalizers.ts` — `EntityOption`. **`.entity` is the display name**; it also carries `types[]` and `fullAddress`.
- `apps/web/modules/entity-types/components/picker/entity-type-rail.tsx` — the combo's left pane (also the entities list filter). Same component, two homes.

Engine deps the skill **uses but never restructures** (defer to `/engine`): `@/engines/picker` (`PickerList`, `PickerTrigger`, `useAsyncRichDropdownController`) and `@/engines/common` (`AnchoredPanel`, `CellChip`).

### The label-binding contract (the crown jewel)

`PickerTrigger` renders `selectedLabel ?? placeholder` (`apps/web/engines/picker/chrome/picker-trigger.tsx:62`) — **it derives the label ONLY from `selectedLabel`, never from `value`.** On select the combo updates the id via `onChange` but does **not** touch the label. So **a consumer that binds `selectedLabel` to the saved join name (e.g. `entityName`) with no local picked-label state shows a blank/stale label on select** — the exact bug this skill exists to kill (`[[entity-picker-label-contract]]`).

A correct consumer holds the picked label locally. Three valid patterns live in the code, **ranked — prefer #1**:

1. **id-match guard (best — `payments`).** Local `entityPick {id,label}`; render `entityPick.id === draft.entityId ? entityPick.label : entityName`. Auto-falls-back to the saved name on discard/step with no reset. See `apps/web/modules/payments/components/record/primary/payment-primary-fields-section.tsx:84-93,172-184`.
2. **form-state label (create forms).** Picked label written into form state on select (`entityLinkLabel` via `onLink`). See `apps/web/modules/entities/components/record/properties/primary/entity-select-section.tsx` + `property-hub-create-client.tsx:52-68`.
3. **`seen`-tracker reset (imports/products/properties).** Local `pickedLabel` + a render-time `seen` tracker that resets it when the saved name changes; `selectedLabel={value ? (pickedLabel ?? savedName) : null}`. **Use the render-time tracker, NOT `useEffect`+`setState`** — the repo lint `react-hooks/set-state-in-effect` errors on the latter.

Whichever pattern: wire `onOptionSelected`, reset the picked label on clear, `value`-guard the label so clear returns to the placeholder, and pass SSR `initialOptions` when the consumer has them.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time. The picker surface drifts (the combo merged type+entity; `EntityType→EntityIdentifier` rename is flagged future). Never act on the model above without confirming it against the live files.
- **One shared machinery — never fork it.** The combo, `entity-option-presentation.ts`, the options request/route, and `EntityOption` are single-source. A consumer that needs a new behavior gets a new **prop**, not a copy. If you find a fork, consolidating it back is the task (`[[consolidate-shared-not-per-module]]`, `[[pressure-test-over-abstraction]]`).
- **Every consumer holds the picked label.** Wire `onOptionSelected`, hold the label locally, **prefer the id-match guard (#1)**. Never bind `selectedLabel` straight to the saved join name with nothing else — that is the bug.
- **Reset on clear + `value`-guard.** On clear (`onChange(null)` / `onOptionSelected(null)`) clear the local label; render `selectedLabel={value ? … : null}` so a cleared picker shows the placeholder, not a stale name.
- **Render-time reset, never `useEffect`+`setState`.** When a consumer needs the "reset on record swap/save" behavior, use the render-time `seen`-tracker idiom (the same one `apps/web/engines/picker/chrome/picker.tsx` uses) — the repo lint rejects setState-in-effect.
- **The engine chrome is `/engine`'s, not yours.** If a fix would change `PickerList`/`PickerTrigger`/the async controller themselves, stop and hand to `/engine`; this skill changes the entity combo and its consumers only.
- **DO NOT COMMIT.** Per project CLAUDE.md the user commits — you provide a commit message ≤17 words. The user runs migrations (this skill rarely touches schema; if `EntityOption`'s read changes shape, author the migration, don't run it).
- **Drive, don't multiple-choice.** Lay out the wiring, surface genuine open questions (which label pattern, is this a fork) in your response, then execute.
- **Explicit-only.** Trigger on the literal `/entity-picker`. Not on "the picker is broken", "look at the entity dropdown", "which picker does X".

## Step 1 — Ground in the live picker surface

Read the actual files before deciding anything:

1. **The shared machinery** — `entity-type-picker.tsx`, `entity-option-presentation.ts`, `entity-options-request.ts`, `app/api/entities/options/route.ts`, the `EntityOption` type, and `entity-type-rail.tsx` (the model above). Confirm `handleEntitySelect` still fires both `onChange` + `onOptionSelected`, and that `PickerTrigger` still labels off `selectedLabel` only.
2. **The target consumer(s)** — for an install, the form/filter section you're wiring into; for an audit, the consumer reported broken. Trace its `value` / `onChange` / `onOptionSelected` / `selectedLabel` / clear path.
3. **Memory** — `[[entity-picker-label-contract]]`, `[[picker-unify-and-combo-redesign]]`, `[[picker-engine]]`, `[[consolidate-shared-not-per-module]]`.

State what you found in one tight block (shared machinery intact?, target consumer(s), which label pattern they use today) before acting.

## Step 2 — Classify the task

- **Install** — wire the picker into a new consumer that has none. Output is the wired section + chosen label pattern.
- **Audit / fix** — an existing consumer shows a blank/stale label or other drift. Diagnose against the contract, fix in place.
- **Consolidate** — a forked copy of the combo / presentation / options request exists; fold both onto the one shared source and converge.

## Step 3 — Wire or fix the consumer

Drive the per-consumer checklist; every box must be satisfied:

- `value={…}` — the selected entity id (draft field or filter state).
- `onChange={(id) => …}` — write the id; **on `null`, also clear the local picked label.**
- `onOptionSelected={(opt) => …}` — capture `opt?.entity` (and id) into the local label state. **Required.**
- `selectedLabel={…}` — render from the local picked label, **guarded on `value`** (prefer the id-match guard #1; fall to #2 for create-only forms, #3 when a saved-name reset is needed).
- `initialOptions` — pass the SSR-loaded seed when the consumer has one.
- `placeholder` / `ariaLabel` / `disabled` — set per the form's conventions.
- **Create affordance** — add `EntityCreateMenu` only if the consumer should create-and-link inline; mirror `entity-picker-section.tsx`.

For **consolidate**, `git mv`-free: rewrite the fork's imports to the shared modules, delete the fork, converge any prop the fork added onto the shared component, then run `/check-gauntlet` as the punch-list.

## Step 4 — Verify

- Run `/check-gauntlet` (build → typecheck → lint → test). Typecheck catches a missing/renamed prop; lint catches a `useEffect`+`setState` reset slipping back in.
- Manual matrix per touched consumer:
  - **Create flow** (no saved name): pick → trigger shows it immediately; clear → placeholder returns.
  - **Existing record**: saved entity shows on load; reselect a **different** entity → label tracks the new pick immediately; save → label persists (no flicker to the old name).
  - **Record swap** (steppers): step to a neighbor → label shows the neighbor's entity, not the previous record's.

## Step 5 — Report (per project CLAUDE.md)

Headline + TL;DR + the per-consumer contract table; open questions in the response; end with the ≤17-word commit message. Do not commit.

```
ENTITY-PICKER — <consumer> — <install | audit/fix | consolidate>

═══ Grounding ═══
Shared machinery intact: <yes/no>   Target consumer(s): <paths>   Label pattern today: <id-match | form-state | seen-tracker | none/BROKEN>

═══ Wired / Fixed ═══
- <path> — <what changed>   Label pattern: <#1 id-match | #2 form-state | #3 seen-tracker>

═══ Per-consumer contract ═══
prop              | status
value             | ✅/❌
onChange (+clear) | ✅/❌
onOptionSelected  | ✅/❌
selectedLabel     | ✅ value-guarded / ⚠️ unguarded / ❌ bound to saved name
initialOptions    | ✅/⚠️ n/a
clear → placeholder | ✅/❌

═══ Check ═══
build <…> · typecheck <…> · lint <0 errors> · test <…>

═══ Open questions ═══
- <label-pattern choice / suspected fork / engine-chrome change needed, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Act on the model in this file without re-reading the live picker files first.
- Restructure the picker **engine chrome** — `PickerList`, `PickerTrigger`, `useAsyncRichDropdownController`, `AnchoredPanel`. That's `/engine`.
- Own the **option-row palette chip** (`CellChip` recolor) — that's `/column-color`.
- Own the standalone **`EntityTypeMultiSelect` chips** form surface (payments/entities type selection) — a related sibling, lightly out of scope; left for a future type-picker skill.
- Do whole-module work (that's `/session-new`) or read-only audits (that's `/quick-report`/`/dig`).
- Perform the future `EntityType → EntityIdentifier` rename — that's `/full-rename`.
- Fork the combo, presentation, or options request per consumer (extend with a prop instead).
- Add supporting files beyond this SKILL.md, commit the change, or run migrations.
- Trigger on anything but the literal `/entity-picker` invocation.
