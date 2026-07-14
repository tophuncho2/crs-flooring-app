---
name: engine-picker
description: Master of the ONE picker engine — apps/web/engines/picker (@/engines/picker), the universal selection surface (dropdowns, async-rich combos, entity→property→template cascade, filter chips). The picker-scoped child of /engine — reach for it when you rip /engine specifically for the picker part. Invoke to migrate a consumer onto the picker, extract a split-brain picker primitive into a bucket, upgrade/extend the engine, fix a picker issue triaging engine-vs-consumer, or organize the internals (incl. flattening cascade/chrome). Grounds in the live picker tree first, keeps the engine self-contained behind its barrel (the "cage"), and drives the change with git-mv + import-rewrite + /check-gauntlet. Editing skill, not read-only. Explicit-only — invoke on /engine-picker.
---

# /engine-picker

`/engine-picker <intent>` makes you the owner of the one picker engine at `apps/web/engines/picker/` (`@/engines/picker`). The user invokes it with a free-form intent — "migrate the products picker onto the async-option combo", "the segmented dropdown is split across components/ and controllers/, pull it into a bucket", "the cascade barrel is leaking deep paths", "flatten chrome into the shared buckets". Your job: ground in the live picker tree, classify the intent, and drive the change while keeping the engine self-contained behind its barrel.

This is the **picker-scoped child of `/engine`** — same technique, one engine. It is an **editing** skill: it reads, plans tightly, then makes the change. It is not a read-only audit (that's `/dig`) and not a build gauntlet (that's `/check-gauntlet`).

## The model (what the picker engine IS)

The picker engine is the **universal selection surface** — every place a user picks a value goes through it. It is one self-contained folder at `apps/web/engines/picker/`, imported everywhere as `@/engines/picker`. The root barrel `apps/web/engines/picker/index.ts` re-exports **7 buckets**: `contracts controls client async-option chrome combo filter`. **Verify against the live tree each run — buckets drift, and `cascade/`/`chrome/` are expected to flatten over time.**

- **`contracts/`** — types only, no JSX. `PickerOption` (`picker/contracts/picker-option.ts:17`) is the ONE canonical option contract; legacy alias `DropdownOption` (`picker/contracts/dropdown-option.ts:9`); plus `DropdownFeatures`.
- **`controls/`** — the raw dropdown widgets. `SelectDropdown` (static). Two sub-engines each carrying its own `contracts/`: `async-rich-dropdown/` (`AsyncRichDropdown`, props `picker/controls/async-rich-dropdown/async-rich-dropdown.tsx:29`; option alias `AsyncRichDropdownOption` `.../contracts/async-rich-dropdown-option.ts:9`) and `segmented-dropdown/`.
- **`client/`** — headless orchestration. `useAsyncRichDropdownController` (`picker/client/use-async-rich-dropdown-controller.ts:91`; input type `:14`, output `:44`); the label resolvers `usePickedOptionLabel` + `useMultiPickedOptionLabels` (`picker/client/index.ts:2`).
- **`async-option/`** — `AsyncOptionPicker` (`picker/async-option/async-option-picker.tsx:81`, props `:28`): the main consumer-facing wired combo (controller + `AsyncRichDropdown` + trigger, assembled).
- **`chrome/`** — presentation shell. `PickerList`, `PickerTrigger` (`picker/chrome/picker-trigger.tsx:21`; the label line `const label = selectedLabel ?? placeholder` at `:62`), `PickerAddButton`, `PickerEditLayout` (`picker/chrome/index.ts`).
- **`combo/entity-cascade/`** — the Entity→Property→Template cascade sub-engine. `useCascadePickerController` (`picker/combo/entity-cascade/client/use-cascade-picker-controller.ts:60`); pure rules `applyEntitySelection`/`applyPropertySelection`/`applyTemplateSelection` re-exported at `picker/combo/entity-cascade/index.ts:6`; contracts at `.../contracts/cascade-picker-contracts.ts`.
- **`filter/`** — `FilterPickerChip`, `MultiFilterPickerChip` (`picker/filter/index.ts`).

### The data-injection seams (how a consumer wires it)

The engine never reaches into a module — the consumer **supplies the data** through named seams:

- **`bucketKey`** — a stable cache-key prefix (`use-async-rich-dropdown-controller.ts:16`).
- **`searchFn` XOR `pagedSearchFn`** — the fetch function (`:21` / `:30`); exactly one.
- **`toOption: (row) => AsyncRichDropdownOption | null`** — row→option mapper (`async-option-picker.tsx:57`).
- **`selectedLabel`** — the display label for the current value.

### THE FOOTGUN — trigger label derives ONLY from `selectedLabel`

`PickerTrigger` computes its label as `selectedLabel ?? placeholder` (`picker/chrome/picker-trigger.tsx:62`) — **never from `value`**. A consumer that binds the label to a saved join name and keeps **no local picked-label state** shows **blank or stale** the moment the user selects. The fix is always: resolve the label through `usePickedOptionLabel` / `useMultiPickedOptionLabels`, not from the persisted value. (Per `entity-picker-label-contract`.)

### The cage (picker's slice of the dependency rules)

The whole point of one folder is that a bug triages instantly as **engine vs consumer**. That only holds if the boundary holds:

- **Depends outward only** on `@/engines/common` + shared primitives (`@/components/*`, `@/types`, `@/transport`, …). Nothing they own reaches back in.
- **Never imports from `apps/web/modules/*`** — module data comes through the injection seams above, never a direct import.
- **Never imports a sibling engine** — no `@/engines/list-view`, no `@/engines/record-view`. Siblings never depend on each other.
- **No re-export indirection** — do NOT re-export picker symbols back out through `@/components` or `@/controllers`. That split-across-two-trees debt was retired (`side-panel-retirement`).
- **Consumers import only `@/engines/picker`** (the barrel) — never a deep path like `@/engines/picker/combo/entity-cascade/...`.
- The boundary is **convention-only** today. You are the enforcement.

### Consumers

34 files across 15 modules. There is **no folder-for-folder mirror**: each module owns a thin data-bound wrapper at `modules/<m>/components/picker/<entity>-picker.tsx`. Representative: `apps/web/modules/products/components/picker/product-picker.tsx:84`.

## Hard rules

- **Ground before you touch.** Do the Step 1 read every time — re-read the live picker tree (buckets drift; `cascade/`/`chrome/` are expected to flatten). Never act on the model above without confirming it against the live folder.
- **Self-contained behind the barrel or it's not done.** Every symbol the change moves or adds lands in one picker bucket, exported through `picker/index.ts`, with consumers importing `@/engines/picker`. No new deep-path imports, no re-export shims through `@/components`/`@/controllers`.
- **Preserve history on every move.** `git mv` (never delete-then-recreate) so blame survives; rewrite consumer imports with a scripted `perl -pi`/`sed` path swap; then run `/check-gauntlet` as the punch-list — report real error counts, never claim green from reading.
- **Stay in the cage.** If a change would make the picker import from `modules/*`, stop and convert to a data-injection seam. If it would import a sibling engine (`@/engines/list-view`/`record-view`) or re-export out through `@/components`/`@/controllers`, stop. Cascade **validity** (referential auto-link correctness) belongs to application/data — never move cascade rules into `packages/domain` (`cascade-ux-vs-validity`).
- **Don't build a one-consumer base.** Assemble existing picker machinery for a new need (`MultiFilterPickerChip` composed the existing parts — there is no `AsyncMultiOptionPicker` base). Pressure-test any new abstraction that would serve a single caller (`pressure-test-over-abstraction`).
- **Tight, reviewable diff; defer polish.** Keep the diff to the move + import rewrites + genuinely-dead-code deletion. No new engine alignment test, no chasing `modules/shared` doc leftovers mid-sweep.
- **DO NOT COMMIT.** Provide a commit message of ≤17 words; the user commits. Schema changes (rare here) get their own commit. Drive the plan and surface open questions in your response — don't multiple-choice.
- **Explicit-only.** Trigger on the literal `/engine-picker`. Not on "the picker is broken", "fix the dropdown", "look at the pickers".

## Step 1 — Ground in the live picker tree

Before classifying the intent, read the current reality:

1. **`ls apps/web/engines/picker/`** — which buckets exist right now (confirm the 7 above; note any flattening of `cascade/`/`chrome/`).
2. **`apps/web/engines/picker/index.ts`** + each relevant bucket's `index.ts` — the actual public surface and how the buckets are wired.
3. **The sub-engine barrels** — `controls/async-rich-dropdown/`, `controls/segmented-dropdown/`, `combo/entity-cascade/index.ts` — to see what each sub-engine still exports and whether it still earns its own folder.
4. **The consumers** — `grep -rl "@/engines/picker"` across `apps/web/modules/` and `apps/web/app/` to size the blast radius (expect ~34 files / 15 modules) and to spot deep-path leaks.
5. **Relevant memory** — `picker-engine`, `cascade-picker-engine`, `cascade-ux-vs-validity`, `picker-unify-and-combo-redesign`, `entity-picker-label-contract`, `multiselect-filter-chip-epic`, `side-panel-retirement`. Treat as context — verify against the code, don't trust blindly.

State what you found in one tight block (buckets present, target bucket layout, consumer count) before proposing the change.

## Step 2 — Classify the intent and apply the playbook

Match the ask to one of these. They compose — a migration often contains an extraction.

### A. Migrate a consumer onto the picker
The module drops its bespoke selection widget and consumes the engine. Add a thin data-bound wrapper at `modules/<m>/components/picker/<entity>-picker.tsx` that supplies `bucketKey` + `searchFn`/`pagedSearchFn` + `toOption` + `selectedLabel` to `AsyncOptionPicker` (or `FilterPickerChip`/`MultiFilterPickerChip` for a list filter). **Wire `selectedLabel` through `usePickedOptionLabel`/`useMultiPickedOptionLabels`** so the trigger doesn't blank on select (the footgun). Repoint imports to `@/engines/picker`; delete the bespoke widget the engine now owns. Wiring/auditing the shared entity-type consumer specifically → `/picker-entity-and-type`.

### B. Extract a split-brain picker primitive into a bucket
1. **Find every piece** of the widget across `components/`, `controllers/`, and any module — grep the symbol names, not just the folder.
2. **Decide the bucket**: raw widget → `controls/` (its own sub-engine folder with `contracts/` if independently reusable); wired combo → `async-option/`; shell → `chrome/`; headless state → `client/`; types → `contracts/`; filter chip → `filter/`.
3. **`git mv`** the split halves into the one chosen bucket.
4. **Wire the barrel** — `export *` for the bucket/sub-engine; switch internal references to relative imports.
5. **Rewrite consumers** to `@/engines/picker` with a path swap; **delete the emptied husk folders**.
6. `/check-gauntlet` until green.

### C. Upgrade / extend the picker
Add to the **right bucket** (types → `contracts/`, controller/hook → `client/`, widget → `controls/`, wired combo → `async-option/`, shell → `chrome/`, chip → `filter/`). Keep `contracts/` JSX-free. Export through the bucket barrel so it reaches `@/engines/picker`. Assemble existing machinery before minting a new base — do not generalize for one consumer.

### D. Fix a picker issue (triage engine-vs-consumer first)
That's what the cage is for. If the bug is in the engine, fix it inside the folder and confirm no consumer relied on the broken behavior. If a consumer is misusing the engine — deep-importing, reaching past a seam, or the **blank/stale trigger-label footgun** — fix the consumer (and if the misuse was *possible*, tighten the barrel so it can't recur). The label footgun on a specific consumer → `/picker-entity-and-type`. A cascade **validity** bug (wrong auto-link/clear semantics) is application/data's job, not this skill.

### E. Organize the internals
Bucket hygiene: every file under exactly one bucket; barrels in sync with the tree; relative imports internally; no deep-path leaks from consumers. **Flatten `cascade/`/`chrome/` (or any sub-engine) back into the shared buckets once it stops earning its separation**, and fix the barrel. Keep the public surface minimal.

## Step 3 — Execute and verify

- Make the moves with `git mv`; rewrite importers with a scripted path swap; keep the diff scoped to the move + rewrites + genuinely-dead-code deletion.
- Run **`/check-gauntlet`** (or at minimum the typecheck it wraps) as the punch-list — do not claim green from reading. Report real error counts.
- If you reshaped a bucket, promoted, or dissolved a sub-engine, update the **status of the `picker-engine` memory** (and `cascade-picker-engine` if the cascade folder moved) plus the `MEMORY.md` index line.

## Step 4 — Report (per project CLAUDE.md)

- **Headline + counts + TL;DR in the chat**; use a table for the file-by-file detail (what moved where, which barrels changed, consumer count repointed).
- **Open questions go in the response**, not deferred silently — bucket-home calls, sub-engine promote/dissolve decisions (flatten `cascade`/`chrome`?), footgun exposure, anything genuinely ambiguous.
- **End with a commit message ≤17 words** — but **do not commit**.

```
ENGINE-PICKER — <intent in one line>   (task <A–E>)

═══ Grounding ═══
Buckets: <contracts controls client async-option chrome combo filter>   Consumers: <N files / M modules>   Flatten-watch: <cascade/chrome status>

═══ Change ═══
| File / symbol | From | To (bucket) | Barrel | Consumers repointed |
|---|---|---|---|---|
| ... | components/... | picker/<bucket>/... | + export | <N> |

═══ Verify ═══
/check-gauntlet: <✅ PASS | ❌ N errors>   Husks deleted: <list>   Cage intact: <✅ / ⚠️ note>   Footgun: <selectedLabel resolved via hook ✅ / n-a>

═══ Open questions ═══
- <bucket-home / promote-dissolve / footgun exposure, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Act on the model in this file without re-reading the live `apps/web/engines/picker/` tree first (buckets drift; `cascade`/`chrome` may have flattened).
- Own the shared **`EntityTypePicker` consumer** or the per-consumer label-binding contract — wiring, auditing, or fixing the blank-label footgun **on a consumer** defers to **`/picker-entity-and-type`**. This skill owns the ENGINE primitives/internals.
- Cross engine boundaries — moves that touch `@/engines/common`, promote/dissolve a sub-engine at the fleet level, or reshape barrels **across** engines defer to the parent **`/engine`**.
- Move cascade **validity** into the engine — referential auto-link/clear correctness is the application/data layer's job (`cascade-ux-vs-validity`); the engine holds only the client-UX cascade rules.
- Mint a one-consumer base abstraction — assemble existing machinery instead (`pressure-test-over-abstraction`; `MultiFilterPickerChip` had no new base).
- Let the picker import from `modules/*` (convert to a data-injection seam), import a sibling engine, or let a consumer deep-import past the barrel.
- Add alignment tests or chase `modules/shared` doc leftovers mid-sweep (deferred polish).
- Run a read-only audit (that's `/dig`) or broad module priming (that's `/session-new`).
- Commit the change. Provide a ≤17-word commit message; the user commits.
- Trigger on anything but the literal `/engine-picker` — not "the picker is broken" or "fix the dropdown".
