---
name: newskill
description: Author a new Claude Code skill under .claude/skills/ that fits this repo. Grounds the new skill in the four sources that make it correct — memory (MEMORY.md + entries), code (the CLAUDE.md layer model + the real dirs it targets), workflows (the user's working process: layered playbook, drive-don't-poll, DO-NOT-COMMIT, ≤17-word commit messages), and the other skills (for format/voice + scope-deferral). Editing skill — it writes the SKILL.md. Explicit-only — invoke on /newskill.
---

# /newskill

`/newskill <intent for the new skill>` makes you the author of a new skill. The user invokes it with a free-form intent — "a skill that audits outbox relay lag", "a read-only skill that maps a module's zod payloads", "a skill that scaffolds a new use case". Your job: ground in the four sources that make a skill correct here, then write a `SKILL.md` that reads like the ones already in `.claude/skills/`.

This is an **editing** skill — it reads, decides the skill's shape, then writes the file. It is not a read-only recon (that's `/quick-report`/`/dig`) and not a build gauntlet (that's `/check`).

## The model (what a skill IS here)

A skill is **one directory, one file**: `.claude/skills/<name>/SKILL.md`. No supporting scripts, templates, or reference files — the SKILL.md is self-contained. Skills auto-discover from the directory; there is no registration step.

Every SKILL.md follows the same house shape, in this order:

1. **Frontmatter** — 3 logical lines: `name:` (kebab-case, matches the dir), `description:` (2–4 dense sentences: what the skill does, when to reach for it, editing-vs-read-only, ending in an **explicit-only** clause like "Explicit-only — invoke on /<name>.").
2. **`# /<name>`** header.
3. **Intro** — 1–3 sentences: what the skill does and when to reach for it. Often quotes the form of the invocation (`/<name> <args>`).
4. **Optional model/vocabulary section** — only when the skill needs shared terms before its rules (see `/engine`'s "The model").
5. **`## Hard rules`** — 4–8 imperative bullets; lead with the most critical constraint; encode the project non-negotiables when relevant.
6. **`## Step N — <goal>`** — numbered steps ending in the output step.
7. **A verbatim output block** in a fenced code block, using `═══ … ═══` dividers and ✅/❌/⚠️ glyphs.
8. **`## What this skill does NOT do`** — 5–10 bullets naming explicit refusals and deferring overlapping scope to the right neighbor skill. The boundary is the feature.

Voice is **imperative and concrete**: "Read the file", "Never edit" — not "you should" or "consider". Cite **real** `path:line` and real file names. Reuse the house terms exactly ("Hard rules", "read-only", "explicit-only", "audit surface").

## Hard rules

- **Ground in all four sources before drafting.** Do the Step 1 read every time — the live skill set, memory, and code all drift. Never write from this template alone.
- **Mirror the house format exactly.** Frontmatter shape, section order, the `═══` output block, the negation section. Match the closest existing skill in shape (editing → `engine`; recon → `dig`/`report`).
- **Declare read-only vs editing** in the new skill, and make its hard rules encode the project non-negotiables when they apply: **DO NOT COMMIT** (user commits), **the user runs migrations** (never the skill, unless told), **commit message ≤17 words**, **drive-don't-poll** (surface open questions in the response, don't multiple-choice).
- **Explicit-only trigger** in every skill you author, stated in both the description and the negation section. State it for `/newskill` itself too.
- **Cite real paths.** Read the actual dirs the new skill will operate on; no hypothetical paths.
- **DO NOT COMMIT** the new skill. Provide a ≤17-word commit message; the user commits.
- **Drive, don't multiple-choice.** Surface genuine open questions (name collision, read-only-vs-editing call, overlapping neighbor) in your response, then write.
- **Explicit-only.** Trigger on the literal `/newskill`. Not on "make a skill", "new skill idea", "can you write a skill".

## Step 1 — Ground in the four sources

Read the current reality before deciding anything:

1. **Other skills** — `ls .claude/skills/` for the live set, then read the 2–3 closest in shape to what you're building. An editing skill → read `engine/SKILL.md`. A recon skill → read `dig/SKILL.md` and `report/SKILL.md`. Note which existing skills' scope **overlaps** so the new skill's negation section can defer to them by name.
2. **Memory** — read `MEMORY.md` and any entry files relevant to the new skill's domain. These carry conventions the skill must encode or reference by their kebab name.
3. **Code** — read the root `CLAUDE.md` layer model (`schema → domain → data → application → outbox → api → module dir → pages`), the relevant `packages/*/CLAUDE.md`, and the actual dirs the skill will touch, so its steps cite real paths.
4. **Workflows** — fold the user's working process into the new skill's hard rules where relevant: the layered playbook, **DO NOT COMMIT**, **≤17-word commit message**, **drive-don't-poll**, the **worktree layout** (`.bare` + per-branch folders). *("Workflows" means the user's working process and conventions — not the multi-agent Workflow orchestration tool. Mention that tool in a new skill only if the skill genuinely warrants fan-out across subagents.)*

State what you found in one tight block (closest existing skills, overlapping neighbors, relevant memory, target dirs) before proposing the skill.

## Step 2 — Decide the skill's shape

- **Name** — kebab-case, matches the dir, no collision with the live set.
- **Editing vs read-only** — declare it; this drives the hard rules and the intro verbs.
- **Trigger sentence** — the explicit-only clause for the description + negation section.
- **Runtime sources** — which of the four sources the skill leans on each run (e.g. a recon skill reads code; an authoring skill reads all four).
- **Neighbors** — the skills its negation section defers to.

## Step 3 — Write the SKILL.md

Assemble in house order: frontmatter → `# /<name>` → intro → optional model section → `## Hard rules` → numbered `## Step N` → verbatim `═══` output block → `## What this skill does NOT do`. Create `.claude/skills/<name>/SKILL.md` with the Write tool.

## Step 4 — Report (per project CLAUDE.md)

Headline + the new skill's path + a TL;DR (what it does, its trigger, editing/read-only). End with the ≤17-word commit message. Do not commit.

```
NEWSKILL — <new skill name> — <one-line purpose>

═══ Grounding ═══
Closest in shape: <skill(s)>   Overlapping neighbors: <skill(s)>   Memory: <entries>   Target dirs: <paths>

═══ Written ═══
- .claude/skills/<name>/SKILL.md — <editing | read-only>, trigger: /<name>

═══ Shape ═══
- Hard rules: <N>   Steps: <N>   Output block: <yes/no>   Negation section: <yes>

═══ Open questions ═══
- <name collision / boundary / read-only-vs-editing, or "none">

═══ Commit message ═══
<≤17 words>
```

## What this skill does NOT do

- Write a skill from this template without re-reading the live `.claude/skills/` set, memory, and the target code first.
- Invent paths, or cite dirs it didn't read.
- Omit the explicit-only trigger, the `## Hard rules`, or the `## What this skill does NOT do` section.
- Add supporting files beyond the single `SKILL.md`.
- Commit the new skill, or run migrations.
- Multiple-choice the user through a skill it can draft.
- Trigger on anything but the literal `/newskill` invocation.
