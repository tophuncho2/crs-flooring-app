# Modules Directory

```
<module>/
├── components/
│   ├── list/
│   │   ├── <module-plural>-client.tsx
│   │   └── <module-plural>-table.tsx
│   └── record/
│       ├── <module>-create-client.tsx
│       ├── <module>-detail-client.tsx
│       ├── <module>-primary-fields-section.tsx
│       └── <module>-record-panel.tsx
├── controller/
│   ├── use-<module>-primary-section.ts
│   └── use-<module-plural>-list-controller.ts
└── data/
    ├── mutations.ts
    └── queries.ts
```

### Folder responsibilities

- **`components/list/`** — React Client Components for the list view (table wrapper + table body).
- **`components/record/`** — React Client Components for the record view (create client, detail client, primary fields section, record panel).
- **`controller/`** — view-state hooks: one for the record view's primary section, one for the list view.
- **`data/`** — Prisma-backed persistence. `queries.ts` for reads, `mutations.ts` for writes. Additional data helpers (e.g. foreign-key option loaders) may be colocated here — see `services/data/load-unit-options.ts` as precedent.

### Naming conventions

- Record-view filenames and the primary-section hook use the **singular** module name (`contact-`, `use-contact-`).
- List-view filenames and the list controller hook use the **plural** module name (`contacts-`, `use-contacts-`).
- Folder names match the module's plural form (`contacts/`, `manufacturers/`), except where the domain entity is inherently singular (`warehouse/`).

### Reference modules

- `contacts/`, `manufacturers/`, `services/` — canonical implementations of the structure above.
- `warehouse/` — follows the same structure but uses a plural `controllers/` folder name. The singular `controller/` is the target; the drift should be resolved in a follow-up.

---
