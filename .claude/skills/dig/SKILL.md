---
name: dig
description: Mid-session audit. Reads the current working diff + recent conversation scope, cross-checks layer boundaries (schema/domain/data/application/api/module/pages), surfaces loose ends (unfinished threads, dead code, wire mismatches, missing tests), and reports what to address before continuing. Read-only. Explicit-only — invoke only on /dig.
---

# /dig

After work has already been underway in the session, /dig is the "wait, does this all still hang together?" reflex. It re-grounds in the current state of the code — not the conversation's optimistic narrative — and produces a short, structured audit.

Common case: invoked after `/session-new` once a sweep is partway done. But /dig doesn't require /session-new to have run; it audits whatever the session is actually working on right now, even if that has drifted from the original kickoff scope.

## Hard rules

- **Read-only.** No edits, commits, migrations, builds, or test runs. For the build/typecheck/lint/test gauntlet, /check-gauntlet is the right skill.
- **Scope = current session work.** Whatever has been edited, discussed, or queued *in this session* — not necessarily the modules /session-new originally named. The session may have drifted; audit where it actually is.
- **Code on disk + git diff are the source of truth.** Do not audit against conversation memory of "what we did" when the file says otherwise.
- **Explicit-only.** Trigger on literal `/dig`. Never on phrases like "dig in", "audit this", or "check on things".

## Step 1 — Define the audit surface

Build the surface from three signals, in priority order:

1. **Working tree changes** — `git status --short` and `git diff --stat <base>...HEAD`, where `<base>` is the branch the current branch was cut from (typically `staging`/`main`). Include both committed and uncommitted changes.
2. **Files the user explicitly named** in this session's chat ("we're working on X", paths pasted in, IDE-opened files surfaced via system reminders).
3. **Cross-referenced files** pulled in by (1) — the repository a changed use case imports, the route validator a changed mutation targets, the component a changed controller renders.

If the audit surface is empty (no diff, no scope cues), say so and stop. Nothing to dig into.

## Step 2 — Layer boundary check

For each file in the audit surface, place it in its CLAUDE.md layer:

`schema → domain → data → application → outbox/relay/worker → api → module dir → pages`

Then verify:

- **Import direction.** Each layer's CLAUDE.md (root, `packages/CLAUDE.md`, `packages/application/CLAUDE.md`, etc.) names what may and may not be imported. Application doesn't import Next.js or React. Data doesn't import application. Pages don't reach into other modules' internals. Confirm by reading the actual `import` lines.
- **Cross-layer coupling that should exist actually does.** A new domain rule needs a use case that calls it. A new use case needs an API route exposing it. An API route's validator field names need to match the use case input type. A new schema column needs a migration file under `packages/db/prisma/migrations/`.
- **Module-dir hygiene.** Components/controllers under `apps/web/modules/<name>/` either belong to that module or pull from `apps/web/modules/shared/` — not directly from another module's internals.

## Step 3 — Loose-end sweep

Walk the audit surface looking for:

- **TODO / FIXME / XXX comments** added during the session. Quote them with `file:line`.
- **Orphaned code** — types, functions, exports declared by the changes but with no caller/importer. Use grep to confirm. Equally: stale comments/imports for code that's already been removed.
- **Wire-contract chain** — API validator fields ↔ use case input type ↔ front-end mutation body ↔ response key the front-end reads. If any link in that chain uses a different name, that's a bug-in-waiting.
- **Test coverage of touched code.** Use cases in `packages/application/src/.../*.ts` have tests at `packages/application/tests/.../*.test.ts`. Domain rules have tests at `packages/domain/tests/.../*.test.ts`. Were the relevant tests updated? Are new branches uncovered?
- **Schema ↔ migration parity.** If `packages/db/prisma/schema.prisma` was edited in this session, confirm a paired migration file under `packages/db/prisma/migrations/` exists. (Inspect — do not run `guard:prisma`.)
- **Memory contradictions.** Read `MEMORY.md` and pull any entries referencing the modules in scope. Cross-check the work against them — a memory says "X is immutable after insert," does the new code respect that? A memory says "we're in the middle of Y rebuild," does this fit or fork?

## Step 4 — Open threads from the conversation

Scan the session's prior turns for explicit deferrals: phrases like "we'll do X later", "circle back to Y", "skip Z for now", "we'll revisit", "ignoring for now". List each verbatim with the turn it came from. These are literal hanging items the user asked you to remember — surfacing them forces a decide-now-vs-defer-explicitly moment.

Also list any *direct questions the user asked you* that didn't get a clear answer, and any decisions framed as "let me think about it" that haven't been resolved.

## Step 5 — Output the report

Use exactly this format. Omit any section that has no entries (don't print empty headers).

```
DIG — <one-line scope summary>

═══ Audit surface ═══
- <N> files changed (<X> committed since session start, <Y> uncommitted)
- Layers touched: <schema, domain, data, ...>
- Session focus per chat: <one-line>

═══ Clean ═══
- <thing verified, with file:line if useful>

═══ Hanging ═══
⚠️ <issue title>
   Where: <file:line>
   Why it matters: <one-line>
   Suggested action: <fix now | defer explicitly | clarify with user>

═══ Layer boundary findings ═══
- ✅ <layer> — <one-line confirmation>
- ❌ <layer> — <violation>, <file:line>

═══ Test coverage ═══
- ✅ <touched code> — covered by <test file>
- ❌ <touched code> — no test updated; new branch <description>

═══ Wire contract ═══
- ✅ <flow> — validator/use-case/front-end agree
- ❌ <flow> — mismatch: <field> sent as X, expected Y

═══ Memory cross-check ═══
- ✅ <memory entry> — work aligns
- ⚠️ <memory entry> — possible contradiction: <one-line>

═══ Open threads from this session ═══
- <verbatim deferral>  → still deferred? address now?
- <unanswered user question>  → user wants an answer

═══ Recommendation ═══
- Address now: <bulleted list, or "nothing">
- Safe to continue: <yes | yes-with-caveats | no — block on X first>
```

Keep findings tight. One line of context, one line of why-it-matters. The user reads this to decide what to fix next — don't bury the lede.

## What this skill does NOT do

- Run build / typecheck / lint / test. (That's /check-gauntlet.)
- Edit code, write tests, or fix anything it surfaces.
- Re-read modules end-to-end from scratch. (That's /session-new.) /dig assumes session context is already loaded; it audits, not primes.
- Require /session-new to have been run earlier. Common case, not a prerequisite.
- Trigger on anything other than the literal `/dig` invocation.
