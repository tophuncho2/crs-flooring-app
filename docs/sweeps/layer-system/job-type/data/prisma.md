# Job Type — Current Prisma Schema

## Owned model

### `JobType`

```prisma
model JobType {
  id          String   @id @default(uuid())
  name        String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("job_type")
}
```

- `name` is the single unique column and describes what the work order will consist of.
