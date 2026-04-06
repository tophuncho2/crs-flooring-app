# Plans

This directory contains **planning documents** — domain rules, use cases, feature specs, and worker designs that inform implementation decisions.

Plans are **deliberative, not normative.** They describe what was decided and why, but they are not the enforced architecture. For enforceable architecture rules, see `docs/`.

## Structure

```
plans/
├── modules/          ← Per-module planning (rules, use cases, specs)
│   ├── categories/
│   ├── contacts/
│   ├── imports/
│   ├── manufacturers/
│   ├── products/
│   └── work-orders/
├── modules.md        ← Module overview
└── overview.md       ← Project overview
```

## Relationship to `docs/`

- `plans/` is input -> `docs/` is output
- Plans inform design decisions -> Docs codify the resulting architecture
- Plans can be aspirational -> Docs must match the code
