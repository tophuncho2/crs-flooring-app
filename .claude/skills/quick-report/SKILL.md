---
name: report
description: Ultra-short, checklisted answer to one very specific question about the codebase. The lightweight cousin of /newsession — instead of sweeping whole modules across every layer, it reads only the minimum needed to answer the one targeted thing correctly, then returns a one-line verdict plus a tight checklist with real path:line cites. Read-only recon; can hand off to a /newsession rip when the finding warrants a real change. Use only on explicit `/report`.
---

# /report

The user's prompt after `/report` is **one specific, targeted question** — about a symbol, a file, a seam, a value, a "does X already exist / where is Y / what does Z do" lookup. Your job: read only what's needed to answer it correctly, then return an **ultra-short, checklisted** answer. This is fast recon, not a plan.

Think of it as the inverse of `/newsession`: that skill reads entire modules end-to-end before producing a full layered plan. `/report` reads the minimum to be right and gives a terse verdict — which may stand alone, or rip into `/newsession` if it turns out a real change is needed.

## Hard rules

- **Answer the one thing asked.** No module sweep, no adjacent scope, no "while I was in here." If the question is about one function, read that function and what it directly touches — nothing more.
- **Read enough to be correct.** Code is the source of truth — never answer from memory, assumptions, or stale prior-session habits. Read the targeted files directly with `Read`. Use `Agent` with `subagent_type=Explore` only when you must first locate the thing; once located, read it.
- **Ultra-short.** Lead with a one-line verdict (✅ / ❌ / ⚠️), then **≤ ~6 checklist bullets**, each with a real `path:line`. No prose paragraphs. No layer headers. No restating the question back at length. If it doesn't fit on a screen, you're doing `/newsession`, not `/report`.
- **Read-only.** Never edit. This is recon — the answer may lead to a change, but `/report` itself never makes one.
- **Explicit-only.** Trigger only on literal `/report`. Never on "report", "give me a report", "report back", etc.

## Output shape

```
REPORT — <the targeted question, one line>

<✅ | ❌ | ⚠️> <one-line verdict / TL;DR>

- [ ] <fact with path:line>
- [ ] <fact with path:line>
- [ ] <fact>

Next: /newsession <scope>   ← only when the finding warrants a real change
```

Drop the `Next:` line entirely when the answer is self-contained and no change is implied. Keep verdict glyphs honest: ✅ confirmed / yes, ❌ no / not found / broken, ⚠️ partial / caveated.

## What this skill does NOT do

- Sweep whole modules across every layer — that's `/newsession`.
- Produce a full layer-grouped plan or a step list.
- Edit code.
- Answer from memory instead of reading the file.
- Pad the answer with prose, background, or adjacent findings the user didn't ask about.
- Trigger on anything other than the literal `/report` invocation.
