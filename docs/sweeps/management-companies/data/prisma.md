# Management Companies — Current Prisma Schema

## Owned model

### `FlooringManagementCompany`

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

## Relations

- `properties` — reverse one-to-many. Child side (`Property.managementCompanyId`) uses `onDelete: SetNull`, so deleting a management company orphans its properties rather than cascade-deleting them.
