# Alteration Sweep — Prisma Model Snapshot

Split in two sections. **Migrating now** (top) = the post-migration shapes that `schema.prisma` already holds after the `imports_staged_inventory_alteration` migration lands. **Deferred** (bottom) = current pre-alteration shapes for models we plan to touch in a follow-on sweep.

---

# Migrating now

## `FlooringImportEntry` — imports (parent container)

```prisma
model FlooringImportEntry {
  id                  String                             @id @default(uuid())
  importNumber        Int                                @unique @default(autoincrement())
  orderNumber         String?
  tag                 String?
  percent             Decimal                            @default(0) @db.Decimal(5, 2)
  warehouseId         String
  warehouse           FlooringWarehouse                  @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  manufacturerId      String?
  manufacturer        FlooringManufacturer?              @relation(fields: [manufacturerId], references: [id], onDelete: SetNull)
  notes               String?
  createdAt           DateTime                           @default(now())
  updatedAt           DateTime                           @updatedAt
  stagedInventoryRows FlooringImportStagedInventoryRow[]
  inventories         FlooringInventory[]

  @@index([createdAt])
  @@index([warehouseId])
  @@index([manufacturerId])
  @@map("flooring_import_entry")
}
```

---

## `FlooringImportStagedInventoryRow` — staged inventory rows (NEW)

```prisma
model FlooringImportStagedInventoryRow {
  id            String              @id @default(uuid())
  importEntryId String
  importEntry   FlooringImportEntry @relation(fields: [importEntryId], references: [id], onDelete: Cascade)
  productId     String
  product       FlooringProduct     @relation(fields: [productId], references: [id], onDelete: Restrict)
  itemNumber    String
  dyeLot        String?
  warehouseId   String
  warehouse     FlooringWarehouse   @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  locationId    String?
  location      FlooringLocation?   @relation(fields: [locationId], references: [id], onDelete: SetNull)
  startingStock Decimal             @db.Decimal(12, 2)
  isImported    Boolean             @default(false)
  cost          Decimal?            @db.Decimal(10, 2)
  freight       Decimal?            @db.Decimal(10, 2)
  notes         String?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  @@index([importEntryId])
  @@index([productId])
  @@index([warehouseId])
  @@index([locationId])
  @@index([importEntryId, isImported])
  @@map("flooring_import_staged_inventory_row")
}
```

---

## `FlooringInventory` — real inventory rows

```prisma
model FlooringInventory {
  id             String               @id @default(uuid())
  importEntryId  String?
  importEntry    FlooringImportEntry? @relation(fields: [importEntryId], references: [id], onDelete: Restrict)
  productId      String
  product        FlooringProduct      @relation(fields: [productId], references: [id], onDelete: Restrict)
  itemNumber     String
  dyeLot         String?
  warehouseId    String
  warehouse      FlooringWarehouse    @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  locationId     String?
  location       FlooringLocation?    @relation(fields: [locationId], references: [id], onDelete: SetNull)
  startingStock  Decimal              @db.Decimal(12, 2)
  totalCutSum    Decimal              @default(0) @db.Decimal(12, 2)
  cost           Decimal?             @db.Decimal(10, 2)
  freight        Decimal?             @db.Decimal(10, 2)
  costPerUnit    Decimal?             @db.Decimal(10, 2)
  freightPerUnit Decimal?             @db.Decimal(10, 2)
  isArchived     Boolean              @default(false)
  notes          String?
  fifoReceivedAt DateTime
  cutLogs        FlooringCutLog[]
  createdAt      DateTime             @default(now())
  updatedAt      DateTime             @updatedAt

  @@index([importEntryId])
  @@index([productId])
  @@index([locationId])
  @@index([warehouseId])
  @@index([isArchived])
  @@index([productId, fifoReceivedAt, itemNumber, id])
  @@map("flooring_inventory")
}
```

---

## `FlooringWarehouse` — back-relation added

```prisma
model FlooringWarehouse {
  id                  String                             @id @default(uuid())
  number              Int                                @unique
  name                String                             @unique
  address             String?
  phone               String?
  createdAt           DateTime                           @default(now())
  updatedAt           DateTime                           @updatedAt
  imports             FlooringImportEntry[]
  stagedInventoryRows FlooringImportStagedInventoryRow[]
  sections            FlooringSection[]
  locations           FlooringLocation[]
  inventories         FlooringInventory[]
  workOrders          FlooringWorkOrder[]
  templates           FlooringTemplate[]

  @@map("flooring_warehouse")
}
```

---

## `FlooringLocation` — back-relation added

```prisma
model FlooringLocation {
  id                  String                             @id @default(uuid())
  warehouseId         String
  warehouse           FlooringWarehouse                  @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  sectionId           String
  section             FlooringSection                    @relation(fields: [sectionId], references: [id], onDelete: Restrict)
  rafter              Int
  level               Int
  createdAt           DateTime                           @default(now())
  updatedAt           DateTime                           @updatedAt
  inventories         FlooringInventory[]
  stagedInventoryRows FlooringImportStagedInventoryRow[]

  @@unique([warehouseId, rafter, level])
  @@index([sectionId])
  @@index([warehouseId])
  @@map("flooring_location")
}
```

---

## `FlooringManufacturer` — back-relation added

```prisma
model FlooringManufacturer {
  id                    String                @id @default(uuid())
  companyName           String
  companyNameNormalized String                @unique
  agentName             String?
  website               String?
  phone                 String?
  email                 String?
  createdAt             DateTime              @default(now())
  updatedAt             DateTime              @updatedAt
  products              FlooringProduct[]
  imports               FlooringImportEntry[]

  @@index([companyName])
  @@map("flooring_manufacturer")
}
```

---

# Deferred

The models below are left at their **current pre-alteration** shape. They are copied here verbatim from `packages/db/prisma/schema.prisma` as the reference for the next sweep.

---

## `FlooringCutLog` — cut logs (deferred changes: add `void` boolean + `coverageCut` column)

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

## `FlooringWorkOrderItem` — work order material items (deferred changes: add `assignedCost` + `assignedQuantity`)

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

## `FlooringWorkOrder` — work orders (unchanged; parent of material items — for context)

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
