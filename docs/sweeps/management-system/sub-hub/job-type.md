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

1. Name uniqueness
2. No delete if linked to work order or template

## Data

1. cananicol read and write repositories.

## Application

1. create through form
2. update through record view
3. delete through record view

## Routing

**seperate route for each**
1. Create
2. Update
3. Delte

## Modules

1. Cananicol list view
2. single section record view with cananicol controllers with dirty state tracking

## Dashboard

1. Renders by importing from modules
