// Mock of Prisma models from packages/db/prisma/schema.prisma
// Scope: FlooringProduct, FlooringInventory, FlooringCutLog,
//        FlooringWorkOrderItem, FlooringImportStagedInventoryRow
// (plus the enums referenced by these models)

enum FlooringCutLogStatus {
  PENDING
  FINAL
  VOID
}

enum FlooringStagedRowStatus {
  DRAFT
  QUEUED
  IMPORTED
}

model FlooringProduct {
  id                               String                             @id @default(uuid())
  name                             String                             @default("")
  categoryId                       String
  category                         FlooringCategory                   @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  manufacturerName                 String?                            @map("manufacturer")
  manufacturerId                   String?
  manufacturer                     FlooringManufacturer?              @relation(fields: [manufacturerId], references: [id], onDelete: Restrict)
  style                            String?
  color                            String?
  width                            String?
  sheetSize                        String?
  thickness                        String?
  unitWeight                       String?
  coveragePerUnit                  Decimal?                           @db.Decimal(12, 4)
  cost                             Decimal?                           @db.Decimal(10, 2)
  isPublic                         Boolean                            @default(false)
  notes                            String?
  subOrder                         String?
  createdAt                        DateTime                           @default(now())
  updatedAt                        DateTime                           @updatedAt
  templateItems                    FlooringTemplateItem[]
  workOrderItems                   FlooringWorkOrderItem[]
  inventories                      FlooringInventory[]
  FlooringImportStagedInventoryRow FlooringImportStagedInventoryRow[]

  @@index([manufacturerId])
  @@index([name])
  @@map("flooring_product")
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

model FlooringImportStagedInventoryRow {
  id            String                  @id @default(uuid())
  importEntryId String
  importEntry   FlooringImportEntry     @relation(fields: [importEntryId], references: [id], onDelete: Restrict)
  productId     String
  product       FlooringProduct         @relation(fields: [productId], references: [id], onDelete: Restrict)
  itemNumber    String?
  dyeLot        String?
  warehouseId   String
  warehouse     FlooringWarehouse       @relation(fields: [warehouseId], references: [id], onDelete: Restrict)
  locationId    String?
  location      FlooringLocation?       @relation(fields: [locationId], references: [id], onDelete: SetNull)
  startingStock Decimal                 @db.Decimal(12, 2)
  isImported    Boolean                 @default(false)
  status        FlooringStagedRowStatus @default(DRAFT)
  cost          Decimal?                @db.Decimal(10, 2)
  freight       Decimal?                @db.Decimal(10, 2)
  notes         String?
  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt

  @@index([importEntryId])
  @@index([productId])
  @@index([warehouseId])
  @@index([locationId])
  @@index([importEntryId, isImported])
  @@index([importEntryId, status])
  @@index([status, isImported])
  @@map("flooring_import_staged_inventory_row")
}
