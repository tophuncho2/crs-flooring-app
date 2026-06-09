---
name: whattests
description: Ultra-short, checklisted inventory of tests with a few-words gloss of what each one is for. The test-focused sibling of /report — locates the tests for a layer, a module, or a single symbol and lists each with a real path cite, so you can see what's covered and sharpen your own test instincts. Read-only recon; never runs or edits tests. Use only on explicit `/whattests`.
---

# /whattests

The user's prompt after `/whattests` names a **test scope** — a full layer (`domain`, `application`, `web`, `relay`, `worker`), some slice of one (a module, feature, or folder), or one thing (a single file or symbol). Your job: locate the matching tests, then return a **terse checklist where each line names a test and describes in a few words what it's for**. This is a learning aid and a coverage map, not a plan and not a test run.

Think of it as `/report` aimed at the test suite: read the minimum to be right, gloss each test in a few words, cite a real path.

## Where the tests live

- Vitest everywhere; e2e are Playwright `*.spec.ts` (separate). Test files are `*.test.ts(x)` in a `tests/` folder that mirrors `src/`.
- Domain → `packages/domain/tests/**` · Application → `packages/application/tests/**`
- Web (modules / engines / server / shared / e2e) → `apps/web/tests/**`
- Relay → `apps/relay/tests/**` · Worker → `apps/worker/tests/**`

## Hard rules

- **Match the scope to the ask.** Full layer → one line per **test file**, grouped by sub-area, headline the count first. Some (a module/folder) → one line per **file** (or per `describe` if it's a single file). One (a named file/symbol) → one line per **`it()` case** with `path:line`. Never expand a full layer down to every `it()` — that's a wall, the opposite of this skill.
- **Gloss, don't transcribe.** Each line is a few words on what the test verifies — lean on the `it()` string but compress it. No code, no quotes, no setup detail.
- **Read enough to be correct.** Tests are the source of truth — never answer from memory. Read the test files directly with `Read`. Use `Agent` with `subagent_type=Explore` only to locate them first.
- **Name the gaps when the scope is narrow.** At one-file / small-module scope, you may end with a single `⚠️ untested:` line listing obvious sibling behaviors that have no test. Omit it at full-layer scope and whenever nothing obvious is missing. ❌ "no test exists" is itself a valid verdict.
- **Read-only.** Never run the tests, never edit them. This is recon.
- **Explicit-only.** Trigger only on literal `/whattests`. Never on "what tests", "which tests", etc.

## Output shape

```
WHATTESTS — <the scope asked for, one line>

<✅ | ⚠️ | ❌> <one-line verdict — e.g. "12 files cover domain rules" / "sparse — only happy path" / "no tests for X">

- [ ] <few-words intent> — <path or path:line>
- [ ] <few-words intent> — <path or path:line>
- [ ] <few-words intent> — <path>

⚠️ untested: <obvious gap>, <obvious gap>   ← narrow scope only; drop when nothing's missing
```

Keep verdict glyphs honest: ✅ covered, ⚠️ sparse/partial, ❌ no tests found for the named thing.

## What this skill does NOT do

- Run the tests, or report pass/fail — it never executes anything.
- Edit, add, or scaffold tests.
- Expand a whole layer down to individual `it()` cases — that's a wall of text.
- Transcribe test bodies or quote assertions verbatim — it glosses intent in a few words.
- Answer from memory instead of reading the test files.
- Trigger on anything other than the literal `/whattests` invocation.
