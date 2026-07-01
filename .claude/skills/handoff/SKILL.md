---
name: handoff
description: Writes a handoff prompt for the next Claude session — a self-contained brief that lets a fresh session pick up exactly where this one left off. Pulls from the current session's context (what was done, decided, and left open) and weaves in any hints the user gives about what to emphasize. Output is a ready-to-paste prompt, longer than /report but still tight and checklisted. Use only on explicit `/handoff`.
---

# /handoff

The user's prompt after `/handoff` is **optional hints** about what the next session needs to know or do — areas to emphasize, threads to carry, things to warn the new session about. Your job: mine this session's context plus those hints and produce a **ready-to-paste handoff prompt** that lets a fresh Claude session resume with zero re-discovery.

Think of it as the forward-looking cousin of `/report`: same terse, checklisted house style, but aimed at the *next session* instead of the current question — so it carries more state (what's done, what's decided, what's still open) and is allowed to be longer.

## Hard rules

- **Write the prompt, don't narrate.** The output IS the text the user will paste into the next session. Address it to that future session ("You are picking up…"), not to the current user. No meta-commentary about the handoff itself.
- **Ground in real context.** Pull from what actually happened this session — files touched, decisions made, commands run, open questions surfaced. Cite real `path:line` and exact names where it helps the next session act. Never invent state or pad with generic advice. Code and conversation are the source of truth, not memory.
- **Lead with hints.** Whatever the user flagged after `/handoff` is the priority — make sure it lands prominently in the brief. If they gave no hints, infer the most likely next step from where the session ended.
- **Tight, not terse.** Longer than `/report` because it carries state, but still checklisted and scannable — no rambling prose. If it runs past roughly a screen and a half, you're including things the next session doesn't need.
- **Carry the open loops.** Explicitly list what was left unfinished, undecided, or unverified — that's the highest-value part of a handoff. Don't bury or omit it.
- **Carry constraints, don't restate CLAUDE.md.** The next session already loads CLAUDE.md (DO NOT COMMIT, layer-at-a-time, commit-message format) — don't re-state those. Note only the *in-flight* constraints specific to this work that the next session must keep.
- **Explicit-only.** Trigger only on literal `/handoff`. Never on "hand off", "handoff this", etc.

## Output shape

````
```
HANDOFF — <one-line subject of the next session>

## Context
<2–4 lines: what this session was doing and where it ended>

## Done
- [x] <thing completed, with path:line / name>
- [x] <thing completed>

## Open / next
- [ ] <unfinished or next step — the most important first, hints emphasized>
- [ ] <decision still pending>
- [ ] <thing to verify>

## Watch out
- <in-flight constraint / blocker — a PENDING decision awaiting sign-off, a sacred file, a dispatch file-ownership boundary>
- <sequencing fact — a pending deploy, a script that must be run, an UNRUN migration to apply after deploy, a shared dev-DB sibling caveat>

## Key files
- `path` — <why it matters>
```
````

Wrap the whole brief in a fenced block so the user can copy it in one go. Drop any section that's genuinely empty (e.g. no `Watch out`), but never drop **Open / next** — a handoff with nothing open isn't a handoff.

**Watch out** carries concrete facts, never a default reassurance — the *specific* in-flight constraint or sequencing step this work leaves behind (e.g. "migration 20260701… UNRUN, apply after deploy", "run `bin/backfill.sh` before the next import", "dev-1 shares the dev DB with sibling sub-branches"), not generic advice. Git / push / migration *verification* is `/confirm`'s job — don't re-verify it here; just record the forward-looking sequencing fact.

## What this skill does NOT do

- Edit code or run the work — it only writes the brief.
- Answer a targeted question — that's `/report`.
- Produce a full layered plan — that's `/newsession`.
- Address the current user instead of the next session.
- Invent progress or state that didn't happen this session.
- Commit, push, or promote anything.
- Trigger on anything other than the literal `/handoff` invocation.
