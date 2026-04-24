# Alteration Sweep — Prisma Model Snapshot (before changes)

Current state of the four models in scope for this sweep, copied verbatim from `packages/db/prisma/schema.prisma`. Use this as the "before" reference while designing the alteration (new `FlooringImportStagedInventoryRow` model + changes to `FlooringInventory` and `FlooringCutLog`).

---

## `FlooringImportEntry` — imports (parent container)

```prisma
model FlooringImportEntry {
  id            String              @id @default(uuid())
  importNumber  Int                 @unique @default(autoincrement())
  orderNumber   String?
  tag           String?
  transportType String
  status        String
  warehouseId   String?
  warehouse     FlooringWarehouse?  @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  notes         String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  inventories   FlooringInventory[]

  @@index([createdAt])
  @@index([warehouseId])
  @@map("flooring_import_entry")
}
```

---

## `FlooringInventory` — inventory rows

```prisma
model FlooringInventory {
  id             String               @id @default(uuid())
  importEntryId  String?
  importEntry    FlooringImportEntry? @relation(fields: [importEntryId], references: [id], onDelete: Restrict)
  productId      String
  product        FlooringProduct      @relation(fields: [productId], references: [id], onDelete: Restrict)
  itemNumber     String
  dyeLot         String?
  warehouseId    String?
  warehouse      FlooringWarehouse?   @relation(fields: [warehouseId], references: [id], onDelete: SetNull)
  locationId     String?
  location       FlooringLocation?    @relation(fields: [locationId], references: [id], onDelete: SetNull)
  stockCount     Decimal              @db.Decimal(12, 2)
  isImported     Boolean              @default(false)
  cost           Decimal?             @db.Decimal(10, 2)
  freight        Decimal?             @db.Decimal(10, 2)
  notes          String?
  fifoReceivedAt DateTime
  cutLogs        FlooringCutLog[]
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  @@index([importEntryId])
  @@index([productId])
  @@index([locationId])
  @@index([warehouseId])
  @@index([productId, fifoReceivedAt, itemNumber, id])
  @@map("flooring_inventory")
}
```

---

## `FlooringCutLog` — cut logs (draws against an inventory row)

```prisma
model FlooringCutLog {
  id              String                 @id @default(uuid())
  inventoryId     String
  inventory       FlooringInventory      @relation(fields: [inventoryId], references: [id], onDelete: Cascade)
  workOrderId     String?
  workOrder       FlooringWorkOrder?     @relation(fields: [workOrderId], references: [id], onDelete: SetNull)
  workOrderItemId String?
  workOrderItem   FlooringWorkOrderItem? @relation(fields: [workOrderItemId], references: [id], onDelete: SetNull)
  before          Decimal                @db.Decimal(12, 2)
  cut             Decimal                @db.Decimal(12, 2)
  after           Decimal                @db.Decimal(12, 2)
  status          String                 @default("PENDING")
  cost            Decimal?               @db.Decimal(10, 2)
  freight         Decimal?               @db.Decimal(10, 2)
  isWaste         Boolean                @default(false)
  notes           String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  @@index([inventoryId])
  @@index([workOrderId])
  @@index([workOrderItemId])
  @@map("flooring_cut_log")
}
```

---

## `FlooringWorkOrderItem` — work order material items

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

---

## `FlooringWorkOrder` — work orders (parent of material items)

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
