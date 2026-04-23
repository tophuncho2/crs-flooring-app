# Job Type

## Schema

```prisma
model FlooringJobType {
  id         String              @id @default(uuid())
  name       String              @unique
  templates  FlooringTemplate[]
  workOrders FlooringWorkOrder[]

  @@index([name])
  @@map("flooring_job_type")
}
```

Companion changes on existing models:
- `FlooringTemplate` gains `jobTypeId String?` + `jobType FlooringJobType? @relation(fields: [jobTypeId], references: [id], onDelete: SetNull)` and `@@index([jobTypeId])`.
- `FlooringWorkOrder` gains `jobTypeId String?` + `jobType FlooringJobType? @relation(fields: [jobTypeId], references: [id], onDelete: SetNull)` and `@@index([jobTypeId])`.

## Domain

_TBD_

## Data

_TBD_

## Application

_TBD_

## Routing

_TBD_

## Modules

_TBD_

## Dashboard

_TBD_
