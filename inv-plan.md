DO NOT RUN YET

npm run db:backfill:coverage-stock              # dry-run
  npm run db:backfill:coverage-stock -- --apply   # scale values, cpu→1, ledger in finalSequence order
  npm run db:backfill:coverage-stock -- --apply   # confirm 0 rows
  npm run db:recompute:ledger                     # dry-run — shows how many rows still differ
  npm run db:recompute:ledger -- --apply          # re-key before/after to createdAt order