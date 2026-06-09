## Important

- [ ] Paste headlines, error counts, and TL:DR in the chat, use charts / tables for visual display.
- [ ] Any open questions must be in your response
- [ ] After executing changes, provide a commit message.
- [ ] This process will repeat per layer we scope to.
- [ ] Some layers may be executed in a bundle together especially if its a bug fix. Schema changes are always in a commit by itself.
- [ ] The list below is in order of how would apply major changes, restructuring or sweeps (what were doing now), and new modules.
- [ ] Each layer has a clear definition of its boundaries, rules and things to be responsible for.

- **Schema** - The user always runs migrations, never Claude — unless the user explicitly says so. Main, staging, and dev each have their own .env credentials, and dev 1-3 share dev's .env.
- **Domain** — Predecates, message builders, types, zod schema payload, business logic
- **Data** — persisting data, read repository, write repository, helpers and normalizers
- **Application** — orchestration of use cases, imports domain rules, initiates outbox events, called on by an api route, opens transactions, decides which rows to lock, each use case has its own file, use cases do not import other use cases
- **Outbox / relay / worker** (when applicable)
- **API** — Imports the cananicol gaunlet of rate limiting, auth, idempotency, telemetry, and calls the db and use-cases
- **Module directory** — controllers/ and components/ are imported from either modules/shared or web/ directories such as components/ controllers/ ect.
- **`apps/web/app/dashboard` pages** — Pages import from the module directory

## CLAUDE - Rules unless told otherwise by the user

- DO NOT COMMIT CHANGES. The user always commits changes, never Claude — unless the user explicitly says so.
- Provide a commit message of no more than 17 words.
