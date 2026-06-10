## Stack

Next.js app-router, Prisma (migrations), zod payloads, outbox/relay pattern. Deployed on Railway (railway.com).

## Important

- [ ] This process will repeat per layer we scope to.
- [ ] Some layers may be executed in a bundle together especially if its a bug fix. 
- [ ] The list below is in order of how would apply major changes, restructuring or sweeps (what were doing now), and new modules.
- [ ] Each layer has a clear definition of its boundaries, rules and things to be responsible for.

- **Schema** - The user always runs migrations, never Claude — unless the user explicitly says so. Main, staging, and dev each have their own .env credentials, and dev 1-3 share dev's .env. 
- **Domain** — Predecates, message builders, types, zod schema payload, business logic
- **Data** — persisting data, read repository, write repository, helpers and normalizers
- **Application** — orchestration of use cases, imports domain rules, initiates outbox events, called on by an api route, opens transactions, decides which rows to lock, each use case has its own file, use cases do not import other use cases
- **Outbox / relay / worker** (when applicable) - The only worker job is to take rows from imports staged inventory and create inventory rows. Max row count per run is 1000.
- **API** — Imports the cananicol gaunlet of rate limiting, auth, idempotency, telemetry, and calls the db and use-cases
- **Module directory** — controllers/ and components/ are imported from either modules/shared or web/ directories such as components/ controllers/ ect.
- **`apps/web/app/dashboard` pages** — Pages import from the module directory

## CLAUDE - Rules unless told otherwise by the user

- DO NOT COMMIT CHANGES. The user always commits changes, never Claude — unless the user explicitly says so.
- After executing changes, provide a commit message provide a commit message of no more than 17 words.
- Paste headlines, error counts, and TL:DR in the chat, use charts / tables for visual display. - Any open questions must be in your response
- Drive, don't poll. Drive the design and stick to the agreed plan. Don't stop to offer multiple-choice options when you can make a sound call — surface decisions as you go, not as menus, unless you need me to give you an answer. Questions are usually address before a plan is approved for execution
- Worktree layout. Repo uses a .bare + per-branch-folder worktree layout (main/, staging/, dev/, dev-1..3). Promotions/rebases run in the target branch's folder. User opens one window per folder, each has its own color theme.
- Engines. Shared client engines live in apps/web/engines/, imported as @/engines/<name>, each self-contained behind its barrel.
- Data rolldown. Main db is backed up every 24 hours and rolled into staging and dev every so often. In case of disaster, users get migrated to staging branch and pick up with 24 hours of lost data. Weird/junk data in dev is probably real prod data rolled down from main — don't assume it's a bug to fix; a dev anomaly likely also exists in main.
- Engine migration convention. When migrating a module onto an engine (record-view, list-view, picker), mirror the engine's canonical folder structure head-to-toe; build module-local only where the engine falls short. 

