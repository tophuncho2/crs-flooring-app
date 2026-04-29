# Current Prisma Schema — Mock (as-of `058143c4`)

Verbatim copy of the in-tree models that this sweep alters. Order: products → WO material items → template material items → work orders → templates → file. Source: `packages/db/prisma/schema.prisma`.

## `FlooringProduct`

```prisma
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
```

## `FlooringWorkOrderItem`

```prisma
model FlooringWorkOrderItem {
  id                   String            @id @default(uuid())
  workOrderId          String
  workOrder            FlooringWorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  productId            String
  product              FlooringProduct   @relation(fields: [productId], references: [id], onDelete: Restrict)
  sourceTemplateItemId String?
  quantity             Decimal           @db.Decimal(10, 2)
  sendUnitName         String?
  sendUnitAbbrev       String?
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

## `FlooringTemplateItem`

```prisma
model FlooringTemplateItem {
  id             String           @id @default(uuid())
  templateId     String
  template       FlooringTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  productId      String
  product        FlooringProduct  @relation(fields: [productId], references: [id], onDelete: Restrict)
  quantity       Decimal          @db.Decimal(10, 2)
  sendUnitName   String?
  sendUnitAbbrev String?
  notes          String?
  createdAt      DateTime         @default(now())

  @@index([templateId])
  @@index([templateId, createdAt])
  @@index([productId])
  @@map("flooring_template_item")
}
```

## `FlooringWorkOrder`

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
  status               FlooringWorkOrderStatus    @default(IDLE)
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
  cutLogs              FlooringCutLog[]
  files                FlooringWorkOrderFile[]

  @@index([workOrderNumber])
  @@index([isComplete])
  @@index([status])
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

## `FlooringTemplate`

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

## `FlooringWorkOrderFile`

```prisma
model FlooringWorkOrderFile {
  id           String                  @id @default(uuid())
  workOrderId  String
  workOrder    FlooringWorkOrder       @relation(fields: [workOrderId], references: [id], onDelete: Cascade)
  fileNumber   Int
  status       FlooringWorkOrderStatus @default(QUEUED)
  fileKey      String?
  errorMessage String?
  createdAt    DateTime                @default(now())
  completedAt  DateTime?

  @@unique([workOrderId, fileNumber])
  @@index([workOrderId, createdAt])
  @@map("flooring_work_order_file")
}
```
