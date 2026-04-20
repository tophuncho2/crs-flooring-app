# Properties — Current Prisma Schema

## Owned model

### `Property`

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

## Relations

- `managementCompany` — optional FK; `onDelete: SetNull` on the parent side (mgmt-company delete orphans properties rather than cascading).
- `workOrders` / `templates` — reverse one-to-many; both child sides use `onDelete: Restrict` against `Property`, so a property delete is blocked while any work order or template references it.
