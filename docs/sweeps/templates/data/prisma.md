# Templates — Current Prisma Schema

## Owned models

### `FlooringTemplate`

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

### `FlooringTemplateItem`

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

### `FlooringTemplateServiceItem`

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

### `FlooringTemplateSalesRep`

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

## Relations

- Parent `propertyId` → `onDelete: Restrict`. Template delete is blocked by any derived work order (`FlooringWorkOrder.templateId`).
- Child items / service items / sales reps → `onDelete: Cascade` on the template side.
