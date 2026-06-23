# remove-template-record-create-button — Remove the "+ Template" create button inside the TEMPLATES RECORD view and cleanly unthread its dead handler chain

## How to use this brief (receiving session, read first)
You were handed this file in a fresh dev-N worktree. This brief is a high-confidence map, NOT a substitute for reading the code.
1. FIRST run `/newsession` to do your own end-to-end research and VALIDATE this brief against the live code. Trust the code over this file if they disagree — and note the discrepancy.
2. Read the Flags below — those are the open decisions/gaps to settle (with the user) as you work. They are deliberately NOT pre-decided.
3. Honor your mode:
   - PLAN mode  → produce a plan and STOP for approval.
   - AUTO mode  → execute the work.
   Either way, research-and-validate BEFORE acting.

## Intent for this session
Remove the "+ Template" create button that lives inside the TEMPLATES RECORD view, next to the primary-section controllers, and unthread its now-dead handler chain from panel → hub view → hub controller. The SEPARATE list-view "+ Template" button is a legitimate, tested, independent chain and must remain fully untouched.

## ⚑ Flags — decisions to make / potential gaps
- ⚑ How far to unthread: remove just the button action object, or fully remove the dead `onNewTemplate` prop (panel ~lines 19-24), its pass-through in the TemplateHubView (~line 83), and the `newTemplate` callback + its return/export in the hub controller (~lines 129-134, 152)? Research shows no other consumer, so a full clean unthread is viable — confirm the depth with the user before ripping the prop/callback.
- ⚑ E2E test (`templates-smoke.spec.ts:16`): the `getByRole("button", { name: "+ Template" })` click targets the RECORD-view button and will fail once it's removed. Decide remove-vs-redirect: drop that step, or redirect it to the list-view create button, so `/check` stays green. The same spec's independent "Create Template" action (~line 50) stays.

## Scope
In:  Removing the record-view "+ Template" create button and unthreading its dead `onNewTemplate`/`newTemplate` handler chain; fixing the e2e test step that clicks it.
Out: The templates LIST-view "+ Template" create button and its `openCreate()` chain; the "Sync to Work Order" action in the same record-view actions array (it STAYS); payments, job-types, warehouse, work-orders modules; shared engines.

## Files you own (do not edit anything outside this list)
- `apps/web/modules/templates/components/record/template-record-panel.tsx` — remove the action object (key `"new-template"`, label `"+ Template"`, onClick `onNewTemplate`) at ~lines 61-75 inside the actions array passed to `RecordPrimarySectionInstance`; optionally drop the now-dead `onNewTemplate` prop + JSDoc (~lines 19-24). Keep the "Sync to Work Order" action.
- `apps/web/modules/templates/components/record/<TemplateHubView file>` — the record-view hub view that destructures `newTemplate` from the controller (~line 55) and threads it to the panel as `onNewTemplate` (~line 83). Verify the exact filename during `/newsession`; optionally remove the pass-through.
- `apps/web/modules/templates/controllers/record/use-template-hub-controller.ts` — optionally remove the dead `newTemplate` useCallback (router.push to `/dashboard/templates/new`, ~lines 129-134) and its return/export (~line 152).
- `apps/web/tests/e2e/templates-smoke.spec.ts` — fix the line-16 `+ Template` button click (remove or redirect per the flag).

## Layer-by-layer map
- **Module directory (record-view component)** — `template-record-panel.tsx` holds the button as an action object in the array passed to `RecordPrimarySectionInstance`. Grep confirms `"new-template"` appears ONLY in this file. Remove the object; optionally drop the `onNewTemplate` prop.
- **Module directory (record-view hub view)** — the TemplateHubView destructures `newTemplate` from `useTemplateHubController` and passes it down as `onNewTemplate` (~line 83). This is the only pass-through.
- **Controller (record)** — `use-template-hub-controller.ts` defines the `newTemplate` useCallback (router.push `/dashboard/templates/new`) and returns it. Grep confirms `onNewTemplate`/`newTemplate` appear ONLY in this panel↔hub-view↔hub-controller chain — no other consumer, so a full clean unthread is safe.
- **Tests (e2e)** — `templates-smoke.spec.ts:16` clicks the record-view `+ Template` button; this breaks after removal. The independent "Create Template" action (~line 50) is unaffected.
- **DO NOT TOUCH** — list-view create button lives at `apps/web/modules/templates/components/list/toolbar-controls/add-template-button.tsx`, wired to `openCreate()` in `templates-client.tsx` (~line 185). Zero coupling to the record-view button.

## Done means
- /check green (build + typecheck + lint + test)
- Commit message ≤17 words ready (DO NOT COMMIT — the user commits)
