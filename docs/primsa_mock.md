// Mock of Prisma models from packages/db/prisma/schema.prisma
// Scope: FlooringInventory, FlooringCutLog, FlooringWorkOrder, FlooringWorkOrderItem,
//        FlooringTemplate, FlooringTemplateItem
// (plus the enums referenced by these models)

enum FlooringVacancyStatus {
  VACANT
  OCCUPIED
}

enum FlooringCutLogStatus {
  PENDING
  FINAL
  VOID
}

model FlooringInventory {
  id                     String               @id @default(uuid())
  inventoryNumber        String               @unique @default(dbgenerated("('INV-'::text || lpad((nextval('flooring_inventory_number_seq'::regclass))::text, 5, '0'::text))")) @map("inventory_number")
  importEntryId          String?
  importEntry            FlooringImportEntry? @relation(fields: [importEntryId], references: [id], onDelete: Restrict)
  productId              String
  product                FlooringProduct      @relation(fields: [productId], references: [id], onDelete: Restrict)
  categorySlug           String
  stockUnitName          String?
  stockUnitAbbrev        String?
  itemCoverageUnitName   String?
  itemCoverageUnitAbbrev String?
  sendUnitName           String?
  sendUnitAbbrev         String?
  itemNumber             String?
  dyeLot                 String?
  warehouseId            String
  warehouse              FlooringWarehouse    @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  locationId             String?
  location               FlooringLocation?    @relation(fields: [locationId], references: [id], onDelete: SetNull)
  startingStock          Decimal              @db.Decimal(12, 2)
  totalCutSum            Decimal              @default(0) @db.Decimal(12, 2)
  cost                   Decimal?             @db.Decimal(10, 2)
  freight                Decimal?             @db.Decimal(10, 2)
  costPerUnit            Decimal?             @db.Decimal(10, 2)
  freightPerUnit         Decimal?             @db.Decimal(10, 2)
  coveragePerUnit        Decimal?             @db.Decimal(10, 2)
  isArchived             Boolean              @default(false)
  notes                  String?
  fifoReceivedAt         DateTime
  cutLogs                FlooringCutLog[]
  createdAt              DateTime             @default(now())
  updatedAt              DateTime             @updatedAt

  @@index([inventoryNumber])
  @@index([importEntryId])
  @@index([productId])
  @@index([locationId])
  @@index([warehouseId])
  @@index([isArchived])
  @@index([productId, fifoReceivedAt, itemNumber, id])
  @@map("flooring_inventory")
}

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
  coverageCut     Decimal?               @db.Decimal(12, 2)
  after           Decimal                @db.Decimal(12, 2)
  status          FlooringCutLogStatus   @default(PENDING)
  cost            Decimal?               @db.Decimal(10, 2)
  freight         Decimal?               @db.Decimal(10, 2)
  isWaste         Boolean                @default(false)
  void            Boolean                @default(false)
  notes           String?
  createdAt       DateTime               @default(now())
  updatedAt       DateTime               @updatedAt

  @@index([inventoryId])
  @@index([workOrderId])
  @@index([workOrderItemId])
  @@index([workOrderItemId, status])
  @@index([inventoryId, status])
  @@map("flooring_cut_log")
}

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

model FlooringWorkOrderItem {
  id                   String            @id @default(uuid())
  workOrderId          String
  workOrder            FlooringWorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  productId            String
  product              FlooringProduct   @relation(fields: [productId], references: [id], onDelete: Restrict)
  sourceTemplateItemId String?
  quantity             Decimal           @db.Decimal(10, 2)
  unitPrice            Decimal           @db.Decimal(10, 2)
  assignedQuantity     Decimal?          @db.Decimal(10, 2)
  assignedCost         Decimal?          @db.Decimal(10, 2)
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
