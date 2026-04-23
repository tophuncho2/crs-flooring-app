# Management-System — Prisma Model Snapshot

Verbatim copies of the Prisma models covered by modules under `management-system/`, taken from `packages/db/prisma/schema.prisma` prior to the upcoming sweep's schema updates.

Related enums used by these models are included at the bottom for reference.

> `user-data/job-type` has no Prisma model yet (planned per `plans.md` step 3).

---

## Clients

### `FlooringManagementCompany` — `management companies`

```prisma
model FlooringManagementCompany {
  id            String     @id @default(uuid())
  name          String     @unique
  streetAddress String?
  city          String?
  state         String?
  postalCode    String?
  phone         String?
  email         String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  properties    Property[]

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
  id             String                        @id @default(uuid())
  templateNumber String                        @unique @default(dbgenerated("('TP-'::text || lpad((nextval('flooring_template_number_seq'::regclass))::text, 5, '0'::text))")) @map("template_number")
  propertyId     String
  property       Property                      @relation(fields: [propertyId], references: [id], onDelete: Restrict)
  templateTag    String
  store          FlooringStoreCode?
  warehouseId    String?
  warehouse      FlooringWarehouse?            @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  instructions   String?
  templateNotes  String?
  padProductId   String?
  padProduct     FlooringProduct?              @relation(fields: [padProductId], references: [id], onDelete: SetNull)
  createdAt      DateTime                      @default(now())
  updatedAt      DateTime                      @updatedAt
  items          FlooringTemplateItem[]
  serviceItems   FlooringTemplateServiceItem[]
  salesReps      FlooringTemplateSalesRep[]
  workOrders     FlooringWorkOrder[]

  @@index([templateNumber])
  @@index([propertyId])
  @@index([warehouseId])
  @@index([templateTag])
  @@index([createdAt])
  @@index([updatedAt])
  @@map("flooring_template")
}
```

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

### `FlooringTemplateServiceItem` — `templates/service items`

```prisma
model FlooringTemplateServiceItem {
  id         String                @id @default(uuid())
  templateId String
  template   FlooringTemplate      @relation(fields: [templateId], references: [id], onDelete: Cascade)
  serviceId  String?
  service    FlooringService?      @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  name       String
  unitId     String
  unit       FlooringUnitOfMeasure @relation(fields: [unitId], references: [id], onDelete: Restrict)
  quantity   Decimal               @db.Decimal(10, 2)
  unitPrice  Decimal               @db.Decimal(10, 2)
  notes      String?
  createdAt  DateTime              @default(now())

  @@index([templateId])
  @@index([templateId, createdAt])
  @@index([serviceId])
  @@index([unitId])
  @@map("flooring_template_service_item")
}
```

### `FlooringTemplateSalesRep` — `templates/sales reps`

```prisma
model FlooringTemplateSalesRep {
  id         String           @id @default(uuid())
  templateId String
  template   FlooringTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  contactId  String
  contact    FlooringContact  @relation(fields: [contactId], references: [id], onDelete: Restrict)
  percent    Decimal          @db.Decimal(5, 2)
  createdAt  DateTime         @default(now())

  @@unique([templateId, contactId])
  @@index([templateId])
  @@index([contactId])
  @@index([templateId, createdAt])
  @@map("flooring_template_sales_rep")
}
```

---

## Main-Hub / Work Orders

### `FlooringWorkOrder` — `work-orders/main section`

```prisma
model FlooringWorkOrder {
  id                   String                           @id @default(uuid())
  workOrderNumber      String                           @unique @default(dbgenerated("('WO-'::text || lpad((nextval('flooring_work_order_number_seq'::regclass))::text, 5, '0'::text))")) @map("work_order_number")
  propertyId           String
  property             Property                         @relation(fields: [propertyId], references: [id], onDelete: Restrict)
  templateId           String?
  template             FlooringTemplate?                @relation(fields: [templateId], references: [id], onDelete: SetNull)
  warehouseId          String?
  warehouse            FlooringWarehouse?               @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  status               FlooringWorkOrderStatus
  isComplete           Boolean                          @default(false) @map("is_complete")
  vacancy              FlooringVacancyStatus?
  scheduledFor         DateTime?                        @db.Date
  unitLabel            String?
  unitType             String?
  customAddress        String?
  instructions         String?
  notes                String?
  googleDriveSlip      String?
  googleDocUrl         String?
  templateSyncedAt     DateTime?
  templateSyncMode     String?
  templateSnapshotHash String?
  createdAt            DateTime                         @default(now())
  updatedAt            DateTime                         @updatedAt
  items                FlooringWorkOrderItem[]
  serviceItems         FlooringWorkOrderServiceItem[]
  salesReps            FlooringWorkOrderSalesRep[]
  analytics            FlooringAnalytics?
  cutLogs              FlooringCutLog[]

  @@index([workOrderNumber])
  @@index([isComplete])
  @@index([propertyId, status])
  @@index([status, scheduledFor])
  @@index([scheduledFor])
  @@index([createdAt])
  @@index([updatedAt])
  @@index([templateId])
  @@index([warehouseId])
  @@map("flooring_work_order")
}
```

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

### `FlooringWorkOrderServiceItem` — `work-orders/service items`

```prisma
model FlooringWorkOrderServiceItem {
  id                          String                @id @default(uuid())
  workOrderId                 String
  workOrder                   FlooringWorkOrder     @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  sourceTemplateServiceItemId String?
  serviceId                   String?
  service                     FlooringService?      @relation(fields: [serviceId], references: [id], onDelete: SetNull)
  name                        String
  unitId                      String
  unit                        FlooringUnitOfMeasure @relation(fields: [unitId], references: [id], onDelete: Restrict)
  quantity                    Decimal               @db.Decimal(10, 2)
  unitPrice                   Decimal               @db.Decimal(10, 2)
  notes                       String?
  createdAt                   DateTime              @default(now())
  updatedAt                   DateTime              @updatedAt

  @@index([workOrderId])
  @@index([workOrderId, createdAt])
  @@index([serviceId])
  @@index([unitId])
  @@index([sourceTemplateServiceItemId])
  @@map("flooring_work_order_service_item")
}
```

### `FlooringWorkOrderSalesRep` — `work-orders/sales reps`

```prisma
model FlooringWorkOrderSalesRep {
  id                       String            @id @default(uuid())
  workOrderId              String
  workOrder                FlooringWorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  sourceTemplateSalesRepId String?
  contactId                String
  contact                  FlooringContact   @relation(fields: [contactId], references: [id], onDelete: Restrict)
  percent                  Decimal           @db.Decimal(5, 2)
  createdAt                DateTime          @default(now())
  updatedAt                DateTime          @updatedAt

  @@unique([workOrderId, contactId])
  @@index([workOrderId])
  @@index([contactId])
  @@index([workOrderId, createdAt])
  @@index([sourceTemplateSalesRepId])
  @@map("flooring_work_order_sales_rep")
}
```

---

## User Data

### `FlooringContact` — `user-data/contacts`

```prisma
model FlooringContact {
  id                 String                      @id @default(uuid())
  name               String
  type               FlooringContactType
  createdAt          DateTime                    @default(now())
  updatedAt          DateTime                    @updatedAt
  templateSalesReps  FlooringTemplateSalesRep[]
  workOrderSalesReps FlooringWorkOrderSalesRep[]

  @@index([name])
  @@index([type])
  @@map("flooring_contact")
}
```

### `FlooringService` — `user-data/services`

```prisma
model FlooringService {
  id             String                         @id @default(uuid())
  name           String
  baseCost       Decimal                        @db.Decimal(10, 2)
  unitId         String
  unit           FlooringUnitOfMeasure          @relation(fields: [unitId], references: [id], onDelete: Restrict)
  isCustom       Boolean                        @default(false)
  notes          String?
  createdAt      DateTime                       @default(now())
  updatedAt      DateTime                       @updatedAt
  templateItems  FlooringTemplateServiceItem[]
  workOrderItems FlooringWorkOrderServiceItem[]

  @@index([name])
  @@index([unitId])
  @@map("flooring_service")
}
```

### `user-data/job-type`

_No Prisma model yet — see `plans.md` step 3 ("add job types module")._

---

## Referenced Enums

```prisma
enum FlooringWorkOrderStatus {
  BUILDING_ORDER
  PENDING_EXPORT
  CARPET_CLEANING
  SENT_OUT
  PENDING
  PULL_TEMPLATE
  // (remaining values — see schema.prisma:80)
}

enum FlooringVacancyStatus {
  VACANT
  OCCUPIED
}

enum FlooringStoreCode {
  DARBY
  COLUMBIA
}

enum FlooringContactType {
  SALES_REP
  CONTRACTOR
  OTHER
}
```
