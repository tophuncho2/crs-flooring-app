# Management-System — Prisma Model Snapshot

Current `packages/db/prisma/schema.prisma` state for the models covered by modules under `management-system/`, **after** the `20260423152350_management_system_alteration` migration landed on staging. Use this as the reference shape while rebuilding the domain/data/application/api layers.

Related enums in use are listed at the bottom. Models dropped by this sweep are listed in a short "Dropped" section at the end.

---

## Clients

### `FlooringManagementCompany` — `management companies`

```prisma
model FlooringManagementCompany {
  id            String              @id @default(uuid())
  name          String              @unique
  streetAddress String?
  city          String?
  state         String?
  postalCode    String?
  phone         String?
  email         String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  properties    Property[]
  templates     FlooringTemplate[]
  workOrders    FlooringWorkOrder[]

  @@map("flooring_management_company")
}
```

### `Property` — `properties`

```prisma
model Property {
  id                  String                     @id @default(uuid())
  managementCompanyId String?
  managementCompany   FlooringManagementCompany? @relation(fields: [managementCompanyId], references: [id], onDelete: SetNull)
  name                String
  streetAddress       String?
  city                String?
  state               String?
  postalCode          String?
  phone               String?
  email               String?
  instructions        String?
  createdAt           DateTime                   @default(now())
  updatedAt           DateTime                   @updatedAt
  workOrders          FlooringWorkOrder[]
  templates           FlooringTemplate[]

  @@index([managementCompanyId])
  @@index([name])
  @@map("property_hub")
}
```

---

## Main-Hub / Templates

### `FlooringTemplate` — `templates/main section`

```prisma
model FlooringTemplate {
  id                   String                     @id @default(uuid())
  templateNumber       String                     @unique @default(dbgenerated("('TP-'::text || lpad((nextval('flooring_template_number_seq'::regclass))::text, 5, '0'::text))")) @map("template_number")
  propertyId           String
  property             Property                   @relation(fields: [propertyId], references: [id], onDelete: Restrict)
  managementCompanyId  String?
  managementCompany    FlooringManagementCompany? @relation(fields: [managementCompanyId], references: [id], onDelete: SetNull)
  jobTypeId            String?
  jobType              FlooringJobType?           @relation(fields: [jobTypeId], references: [id], onDelete: SetNull)
  warehouseId          String?
  warehouse            FlooringWarehouse?         @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  unitType             String
  description          String?
  instructions         String?
  propertyInstructions String?
  templateNotes        String?
  createdAt            DateTime                   @default(now())
  updatedAt            DateTime                   @updatedAt
  items                FlooringTemplateItem[]
  workOrders           FlooringWorkOrder[]

  @@index([templateNumber])
  @@index([propertyId])
  @@index([managementCompanyId])
  @@index([jobTypeId])
  @@index([warehouseId])
  @@index([unitType])
  @@index([createdAt])
  @@index([updatedAt])
  @@map("flooring_template")
}
```

Field notes:
- `instructions` — the template's own editable free-text notes.
- `propertyInstructions` — snapshotted from the linked `Property.instructions` on link, editable thereafter (snapshot/editable semantics live in the domain/application layers, not a DB trigger).
- `unitType` is the renamed `templateTag`. Still required (`String`, not nullable).

### `FlooringTemplateItem` — `templates/material items`

```prisma
model FlooringTemplateItem {
  id         String           @id @default(uuid())
  templateId String
  template   FlooringTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  productId  String
  product    FlooringProduct  @relation(fields: [productId], references: [id], onDelete: Restrict)
  quantity   Decimal          @db.Decimal(10, 2)
  unitPrice  Decimal          @db.Decimal(10, 2)
  notes      String?
  createdAt  DateTime         @default(now())

  @@index([templateId])
  @@index([templateId, createdAt])
  @@index([productId])
  @@map("flooring_template_item")
}
```

Unchanged by this sweep — the only child section left on templates.

---

## Main-Hub / Work Orders

### `FlooringWorkOrder` — `work-orders/main section`

```prisma
model FlooringWorkOrder {
  id                   String                     @id @default(uuid())
  workOrderNumber      String                     @unique @default(dbgenerated("('WO-'::text || lpad((nextval('flooring_work_order_number_seq'::regclass))::text, 5, '0'::text))")) @map("work_order_number")
  propertyId           String
  property             Property                   @relation(fields: [propertyId], references: [id], onDelete: Restrict)
  templateId           String?
  template             FlooringTemplate?          @relation(fields: [templateId], references: [id], onDelete: SetNull)
  managementCompanyId  String?
  managementCompany    FlooringManagementCompany? @relation(fields: [managementCompanyId], references: [id], onDelete: SetNull)
  jobTypeId            String?
  jobType              FlooringJobType?           @relation(fields: [jobTypeId], references: [id], onDelete: SetNull)
  warehouseId          String?
  warehouse            FlooringWarehouse?         @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  isComplete           Boolean                    @default(false) @map("is_complete")
  vacancy              FlooringVacancyStatus?
  scheduledFor         DateTime?                  @db.Date
  unitNumber           String?
  unitType             String?
  customAddress        String?
  description          String?
  instructions         String?
  propertyInstructions String?
  notes                String?
  templateSyncedAt     DateTime?
  templateSyncMode     String?
  templateSnapshotHash String?
  createdAt            DateTime                   @default(now())
  updatedAt            DateTime                   @updatedAt
  items                FlooringWorkOrderItem[]
  analytics            FlooringAnalytics?
  cutLogs              FlooringCutLog[]

  @@index([workOrderNumber])
  @@index([isComplete])
  @@index([propertyId])
  @@index([templateId])
  @@index([managementCompanyId])
  @@index([jobTypeId])
  @@index([warehouseId])
  @@index([scheduledFor])
  @@index([createdAt])
  @@index([updatedAt])
  @@map("flooring_work_order")
}
```

Field notes:
- `instructions` — the work order's own editable free-text notes.
- `propertyInstructions` — snapshot from the linked property's `instructions` on link, editable thereafter.
- `unitNumber` is the renamed `unitLabel` (stays `String?`).
- `analytics` is still **optional**; work orders are not required to link to an analytics row.
- `status` column + `FlooringWorkOrderStatus` enum are gone. `isComplete` is the remaining completion signal.
- `googleDocUrl` / `googleDriveSlip` are gone.

### `FlooringWorkOrderItem` — `work-orders/material items`

```prisma
model FlooringWorkOrderItem {
  id                   String            @id @default(uuid())
  workOrderId          String
  workOrder            FlooringWorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  productId            String
  product              FlooringProduct   @relation(fields: [productId], references: [id], onDelete: Restrict)
  sourceTemplateItemId String?
  quantity             Decimal           @db.Decimal(10, 2)
  unitPrice            Decimal           @db.Decimal(10, 2)
  notes                String?
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @updatedAt
  cutLogs              FlooringCutLog[]

  @@index([workOrderId])
  @@index([workOrderId, createdAt])
  @@index([productId])
  @@index([sourceTemplateItemId])
  @@map("flooring_work_order_item")
}
```

Unchanged by this sweep. Cut logs remain the child scope (wiring deferred per `./deferred.md`).

---

## User Data

### `FlooringJobType` — `user-data/job-type`

```prisma
model FlooringJobType {
  id         String              @id @default(uuid())
  name       String              @unique
  createdAt  DateTime            @default(now())
  updatedAt  DateTime            @updatedAt
  templates  FlooringTemplate[]
  workOrders FlooringWorkOrder[]

  @@index([name])
  @@map("flooring_job_type")
}
```

### `FlooringService` — `user-data/services`

```prisma
model FlooringService {
  id        String                @id @default(uuid())
  name      String
  baseCost  Decimal               @db.Decimal(10, 2)
  unitId    String
  unit      FlooringUnitOfMeasure @relation(fields: [unitId], references: [id], onDelete: Restrict)
  isCustom  Boolean               @default(false)
  notes     String?
  createdAt DateTime              @default(now())
  updatedAt DateTime              @updatedAt

  @@index([name])
  @@index([unitId])
  @@map("flooring_service")
}
```

Kept intact — only the `templateItems` / `workOrderItems` back-relations (to the dropped service-item join tables) were removed.

### `FlooringContact` — `user-data/contacts`

```prisma
model FlooringContact {
  id        String              @id @default(uuid())
  name      String
  type      FlooringContactType
  createdAt DateTime            @default(now())
  updatedAt DateTime            @updatedAt

  @@index([name])
  @@index([type])
  @@map("flooring_contact")
}
```

Kept intact — only the `templateSalesReps` / `workOrderSalesReps` back-relations (to the dropped sales-rep join tables) were removed.

---

## Referenced Enums

```prisma
enum FlooringVacancyStatus {
  VACANT
  OCCUPIED
}

enum FlooringContactType {
  SALES_REP
  CONTRACTOR
  OTHER
}
```

Dropped by this sweep: `FlooringWorkOrderStatus`, `FlooringStoreCode`.

---

## Dropped by this sweep

Models removed from `schema.prisma` (and their tables from the DB) in the `20260423152350_management_system_alteration` migration:

- `FlooringTemplateServiceItem` (`flooring_template_service_item`)
- `FlooringTemplateSalesRep` (`flooring_template_sales_rep`)
- `FlooringWorkOrderServiceItem` (`flooring_work_order_service_item`)
- `FlooringWorkOrderSalesRep` (`flooring_work_order_sales_rep`)

Columns removed on existing tables:

- `flooring_template`: `templateTag` (→ renamed to `unitType`), `store`, `padProductId`.
- `flooring_work_order`: `status`, `unitLabel` (→ renamed to `unitNumber`), `googleDocUrl`, `googleDriveSlip`.

Enums removed: `FlooringWorkOrderStatus`, `FlooringStoreCode`.

Back-relations removed on kept models: `FlooringService.templateItems`/`workOrderItems`, `FlooringContact.templateSalesReps`/`workOrderSalesReps`, `FlooringUnitOfMeasure.templateServiceItems`/`workOrderServiceItems`.
