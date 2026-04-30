## Important

[ ] After doing an audit, paste the report to the root of sessions/
[ ] Plan files get added to the root of sessions/ and each plan made will be updated unil approve / executed. 
[ ] Once approved, the plan is locked and a file for the execution sumnary is created. 
[ ] After an execution file is created we will make updates to it and a 4th file for "cleanup" may be created to checklist what needs to change in the execution file.
[ ] Paste headlines, error counts, and TL:DR in the chat, use charts / tables for visual display.
[ ] Any open questions must be in your response

[ ] This process will repeat per layer we scope to.
[ ] Some layers may be executed in a bundle together especially if its a bug fix. Schema changes are always in a commit by itself.
[ ] The list below is in order of how would apply major changes, restructuring or sweeps (what were doing now), and new modules.
[ ] Each layer has a clear definition of its boundaries, rules and things to be responsible for. 
- Schema
- Domain **Predecates, message builders, types, zod schema payload, business logic**
- Data **persisting data, read repository, write repository, helpers and normalizers**
- Application **orchestration of use cases, imports domain rules, initiates outbox events, called on by an api route, opens transactions, decides which rows to lock, each use case has its own file, use cases do not import other use cases**
- Outbox / relay / worker (when applicable)
- API **Imports the cananicol gaunlet of rate limiting, auth, idempotency, telemetry, and calls the db and use-cases**
- Module directory **controllers/ and components/ are imported from either modules/shared or web/ directories such as components/ controllers/ ect.**
- `apps/web/app/dashboard` pages. **Pages import from the module directory**


## Notes

[ ] After executing changes, provide a commit message.
DO NOT COMMIT CHANGES.