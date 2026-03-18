# Prisma Schema In English
## Human-Readable Reference For The Current Database Structure

This file is a plain-English reference for the current Prisma schema in:
- [prisma/schema.prisma](/Users/ottohull/builderswebapp/builderswebapp/prisma/schema.prisma)

The goal of this document is to make the database easier to review without reading raw Prisma syntax.

This file focuses on:
- what each table is for
- the important fields in each table
- which fields link to other tables
- how the main data flows connect together

This should be updated whenever the Prisma schema changes materially.

---

# 1. Core Schema Shape

The schema currently covers these main areas:

- users and login activity
- table preferences
- management companies and properties
- products, categories, manufacturers, and units
- services
- templates
- template material items
- template service items
- work orders
- work-order material items
- work-order service items
- analytics
- inventory, imports, warehouses, sections, locations, and cut logs

The main operational flow is:

`Management Company -> Property -> Template -> Work Order -> Analytics / Inventory / Cut Logs`

---

# 2. Enums

## `Role`
Used for user roles.

Values:
- `CONTRACTOR`
- `CUSTOMER`
- `ADMIN`
- `BUILDER`

Note:
- the application logic has been simplified toward `ADMIN` and `BUILDER`, even though the enum still includes older values.

## `FlooringWorkOrderStatus`
Used for work-order lifecycle state.

Values:
- `DRAFT`
- `BUILDING_ORDER`
- `PENDING_EXPORT`
- `CARPET_CLEANING`
- `SENT_OUT`
- `COMPLETE`
- `PENDING`
- `PULL_TEMPLATE`
- `MODIFY`

## `FlooringVacancyStatus`
Used for occupancy state.

Values:
- `VACANT`
- `OCCUPIED`

## `FlooringChangeOrderStatus`
Used on work-order material items to indicate shortage/sufficiency.

Values:
- `SHORTAGE`
- `SUFFICIENT`

## `FlooringStoreCode`
Used on templates.

Values:
- `DARBY`
- `COLUMBIA`

---

# 3. User And Preferences Tables

## `User`
Purpose:
- stores system users

Main fields:
- `id`: primary key
- `email`: unique login email
- `password`: hashed password
- `role`: role enum
- `isVerified`: whether the account is verified
- `hiddenFlooringNavSlugs`: hidden nav items for this user
- `flooringNavOrderSlugs`: nav order preferences
- `createdAt`: created timestamp

Links to:
- `UserLoginActivity`
- `UserTablePreference`

Important linking fields:
- none outward from this table

## `UserTablePreference`
Purpose:
- stores table-specific UI preferences per user

Main fields:
- `id`
- `userId`
- `tableKey`
- `hiddenColumnKeys`
- `columnOrderKeys`
- `createdAt`
- `updatedAt`

Links to:
- `User`

Important linking fields:
- `userId -> User.id`

## `UserLoginActivity`
Purpose:
- stores login activity history

Main fields:
- `id`
- `userId`
- `userEmail`
- `loggedInAt`

Links to:
- `User`

Important linking fields:
- `userId -> User.id`

## `Hotkey`
Purpose:
- stores hotkey definitions

Main fields:
- `id`
- `key`
- `combination`
- `action`
- `createdAt`
- `updatedAt`

Links to:
- none

---

# 4. Company / Property Structure

## `FlooringManagementCompany`
Purpose:
- top-level company entity that owns properties

Main fields:
- `id`
- `name`
- `streetAddress`
- `city`
- `state`
- `postalCode`
- `phone`
- `email`
- `createdAt`
- `updatedAt`

Links to:
- `Property`

Important linking fields:
- no FK stored here
- child table `Property.managementCompanyId` points here

## `Property`
Purpose:
- represents a property/location operated under a management company

Main fields:
- `id`
- `managementCompanyId`
- `name`
- `streetAddress`
- `city`
- `state`
- `postalCode`
- `phone`
- `email`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringManagementCompany`
- `FlooringTemplate`
- `FlooringWorkOrder`

Important linking fields:
- `managementCompanyId -> FlooringManagementCompany.id`

---

# 5. Product And Catalog Structure

## `FlooringCategory`
Purpose:
- groups products and defines unit relationships by category

Main fields:
- `id`
- `name`
- `categoryCode`
- `sendUnitId`
- `stockUnitId`
- `coverageAvailableUnitId`
- `itemCoverageUnitId`
- `serviceUnitId`
- `createdAt`

Links to:
- `FlooringUnitOfMeasure`
- `FlooringProduct`

Important linking fields:
- `sendUnitId -> FlooringUnitOfMeasure.id`
- `stockUnitId -> FlooringUnitOfMeasure.id`
- `coverageAvailableUnitId -> FlooringUnitOfMeasure.id`
- `itemCoverageUnitId -> FlooringUnitOfMeasure.id`
- `serviceUnitId -> FlooringUnitOfMeasure.id`

## `FlooringUnitOfMeasure`
Purpose:
- central unit table used across categories and service items

Main fields:
- `id`
- `name`
- `createdAt`

Links to:
- `FlooringCategory`
- `FlooringService`
- `FlooringTemplateServiceItem`
- `FlooringWorkOrderServiceItem`

Important linking fields:
- referenced by multiple `unitId` fields

## `FlooringManufacturer`
Purpose:
- stores product manufacturers

Main fields:
- `id`
- `name`
- `companyName`
- `website`
- `phone`
- `email`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringProduct`

Important linking fields:
- no FK stored here
- child table `FlooringProduct.manufacturerId` points here

## `FlooringProduct`
Purpose:
- master material/product catalog

Main fields:
- `id`
- `name`
- `categoryId`
- `manufacturerName`
- `manufacturerId`
- `style`
- `color`
- `width`
- `sheetSize`
- `thickness`
- `unitWeight`
- `baseColor`
- `coveragePerUnit`
- `photoUrls`
- `cost`
- `isPublic`
- `notes`
- `subOrder`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringCategory`
- `FlooringManufacturer`
- `FlooringTemplateItem`
- `FlooringWorkOrderItem`
- `FlooringTemplate` as `padProduct`
- `FlooringInventory`

Important linking fields:
- `categoryId -> FlooringCategory.id`
- `manufacturerId -> FlooringManufacturer.id`

## `FlooringService`
Purpose:
- master service catalog

Main fields:
- `id`
- `name`
- `baseCost`
- `unitId`
- `isCustom`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringUnitOfMeasure`
- `FlooringTemplateServiceItem`
- `FlooringWorkOrderServiceItem`

Important linking fields:
- `unitId -> FlooringUnitOfMeasure.id`

---

# 6. Warehouse / Inventory Structure

## `FlooringWarehouse`
Purpose:
- warehouse master table

Main fields:
- `id`
- `name`
- `address`
- `phone`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringImportEntry`
- `FlooringSection`
- `FlooringLocation`
- `FlooringTemplate`
- `FlooringWorkOrder`

## `FlooringSection`
Purpose:
- sub-area inside a warehouse

Main fields:
- `id`
- `warehouseId`
- `name`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringWarehouse`
- `FlooringLocation`

Important linking fields:
- `warehouseId -> FlooringWarehouse.id`

## `FlooringLocation`
Purpose:
- exact storage location in a warehouse

Main fields:
- `id`
- `warehouseId`
- `sectionId`
- `locationCode`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringWarehouse`
- `FlooringSection`
- `FlooringInventory`

Important linking fields:
- `warehouseId -> FlooringWarehouse.id`
- `sectionId -> FlooringSection.id`

## `FlooringImportEntry`
Purpose:
- inbound import/shipment record

Main fields:
- `id`
- `importNumber`
- `orderNumber`
- `tag`
- `transportType`
- `status`
- `warehouseId`
- `notes`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringWarehouse`
- `FlooringInventory`

Important linking fields:
- `warehouseId -> FlooringWarehouse.id`

## `FlooringInventory`
Purpose:
- actual on-hand inventory rows

Main fields:
- `id`
- `importEntryId`
- `productId`
- `itemNumber`
- `dyeLot`
- `locationId`
- `stockCount`
- `cost`
- `freight`
- `notes`
- `createdAt`
- `updatedAt`

Links to:
- `FlooringImportEntry`
- `FlooringProduct`
- `FlooringLocation`
- `FlooringCutLog`
- `FlooringWorkOrderItem`

Important linking fields:
- `importEntryId -> FlooringImportEntry.id`
- `productId -> FlooringProduct.id`
- `locationId -> FlooringLocation.id`

## `FlooringCutLog`
Purpose:
- tracks inventory deduction/cuts tied to work-order usage

Main fields:
- `id`
- `inventoryId`
- `workOrderId`
- `workOrderItemId`
- `before`
- `cut`
- `after`
- `notes`
- `createdAt`

Links to:
- `FlooringInventory`
- `FlooringWorkOrder`
- `FlooringWorkOrderItem`

Important linking fields:
- `inventoryId -> FlooringInventory.id`
- `workOrderId -> FlooringWorkOrder.id`
- `workOrderItemId -> FlooringWorkOrderItem.id`

---

# 7. Template Structure

## `FlooringTemplate`
Purpose:
- reusable job template/header

Main fields:
- `id`
- `propertyId`
- `templateTag`
- `store`
- `warehouseId`
- `instructions`
- `templateNotes`
- `padProductId`
- `createdAt`
- `updatedAt`

Links to:
- `Property`
- `FlooringWarehouse`
- `FlooringProduct` as `padProduct`
- `FlooringTemplateItem`
- `FlooringTemplateServiceItem`
- `FlooringWorkOrder`

Important linking fields:
- `propertyId -> Property.id`
- `warehouseId -> FlooringWarehouse.id`
- `padProductId -> FlooringProduct.id`

## `FlooringTemplateItem`
Purpose:
- material/product line item inside a template

Main fields:
- `id`
- `templateId`
- `productId`
- `quantity`
- `unitPrice`
- `notes`
- `storedDyeLot`
- `createdAt`

Links to:
- `FlooringTemplate`
- `FlooringProduct`

Important linking fields:
- `templateId -> FlooringTemplate.id`
- `productId -> FlooringProduct.id`

## `FlooringTemplateServiceItem`
Purpose:
- service line item inside a template

Main fields:
- `id`
- `templateId`
- `serviceId`
- `name`
- `unitId`
- `quantity`
- `unitPrice`
- `notes`
- `createdAt`

Links to:
- `FlooringTemplate`
- `FlooringService`
- `FlooringUnitOfMeasure`

Important linking fields:
- `templateId -> FlooringTemplate.id`
- `serviceId -> FlooringService.id`
- `unitId -> FlooringUnitOfMeasure.id`

Notes:
- `serviceId` is nullable so a service row can be custom
- `name` stores the actual service label used for that row

---

# 8. Work Order Structure

## `FlooringWorkOrder`
Purpose:
- live operational order record

Main fields:
- `id`
- `propertyId`
- `templateId`
- `warehouseId`
- `status`
- `vacancy`
- `scheduledFor`
- `unitLabel`
- `unitNumber`
- `unitType`
- `customAddress`
- `instructions`
- `notes`
- `googleDriveSlip`
- `googleDocUrl`
- `createdAt`
- `updatedAt`

Links to:
- `Property`
- `FlooringTemplate`
- `FlooringWarehouse`
- `FlooringWorkOrderItem`
- `FlooringWorkOrderServiceItem`
- `FlooringAnalytics`
- `FlooringCutLog`

Important linking fields:
- `propertyId -> Property.id`
- `templateId -> FlooringTemplate.id`
- `warehouseId -> FlooringWarehouse.id`

Notes:
- `templateId` records where the work order came from, but the actual items are copied, not live-linked

## `FlooringWorkOrderItem`
Purpose:
- material/product row inside a work order

Main fields:
- `id`
- `workOrderId`
- `productId`
- `linkedInventoryId`
- `quantity`
- `unitPrice`
- `notes`
- `changeOrderStatus`
- `createdAt`

Links to:
- `FlooringWorkOrder`
- `FlooringProduct`
- `FlooringInventory`
- `FlooringCutLog`

Important linking fields:
- `workOrderId -> FlooringWorkOrder.id`
- `productId -> FlooringProduct.id`
- `linkedInventoryId -> FlooringInventory.id`

Notes:
- `changeOrderStatus` is where shortage/sufficiency is currently tracked at the item level

## `FlooringWorkOrderServiceItem`
Purpose:
- service row inside a work order

Main fields:
- `id`
- `workOrderId`
- `serviceId`
- `name`
- `unitId`
- `quantity`
- `unitPrice`
- `notes`
- `createdAt`

Links to:
- `FlooringWorkOrder`
- `FlooringService`
- `FlooringUnitOfMeasure`

Important linking fields:
- `workOrderId -> FlooringWorkOrder.id`
- `serviceId -> FlooringService.id`
- `unitId -> FlooringUnitOfMeasure.id`

Notes:
- `serviceId` is nullable so a work-order service row can also be custom

## `FlooringAnalytics`
Purpose:
- stores calculated totals for a work order

Main fields:
- `id`
- `workOrderId`
- `totalMaterialCost`
- `totalServiceCost`
- `totalCost`
- `createdAt`

Links to:
- `FlooringWorkOrder`

Important linking fields:
- `workOrderId -> FlooringWorkOrder.id`

Notes:
- one analytics row per work order

---

# 9. Main Relationship Map

## Company / property chain
- `FlooringManagementCompany`
  - has many `Property`

## Template chain
- `Property`
  - has many `FlooringTemplate`
- `FlooringTemplate`
  - has many `FlooringTemplateItem`
  - has many `FlooringTemplateServiceItem`

## Work-order chain
- `Property`
  - has many `FlooringWorkOrder`
- `FlooringWorkOrder`
  - has many `FlooringWorkOrderItem`
  - has many `FlooringWorkOrderServiceItem`
  - has one `FlooringAnalytics`

## Product and service usage
- `FlooringProduct`
  - can appear in:
    - `FlooringTemplateItem`
    - `FlooringWorkOrderItem`
    - `FlooringInventory`
    - `FlooringTemplate.padProduct`
- `FlooringService`
  - can appear in:
    - `FlooringTemplateServiceItem`
    - `FlooringWorkOrderServiceItem`

## Inventory chain
- `FlooringWarehouse`
  - has many `FlooringSection`
  - has many `FlooringLocation`
  - has many `FlooringImportEntry`
- `FlooringLocation`
  - has many `FlooringInventory`
- `FlooringInventory`
  - has many `FlooringCutLog`
  - may link to one `FlooringWorkOrderItem`

---

# 10. Main Operational Rules Reflected In The Schema

## Template to work order is copy-based
- `FlooringTemplateItem` rows do not become live-linked `FlooringWorkOrderItem` rows
- work-order rows are copied and then become independent

## Pricing is stored per row
- template material rows have `unitPrice`
- template service rows have `unitPrice`
- work-order material rows have `unitPrice`
- work-order service rows have `unitPrice`

This means totals can be calculated from stored row values instead of recalculating from product or service master data later.

## Analytics are attached to work orders
- work-order totals are persisted in `FlooringAnalytics`

## Inventory deduction is intended to be traceable
- `FlooringWorkOrderItem` may link to `FlooringInventory`
- `FlooringCutLog` tracks actual deduction/cut activity

---

# 11. Schema Areas That Still Need Review

These are important to review while finalizing workflow truth and DB hardening:

- `Role` enum still contains older values even though the app is moving toward `ADMIN` and `BUILDER`
- `FlooringWorkOrderStatus` likely needs final cleanup and simplification
- `Property` still maps to the underlying table name `"property_hub"` even though the model has been simplified
- shortage behavior is partly represented at the item level, but order-level shortage truth may still need clearer ownership
- analytics update timing still needs to be finalized in workflow logic
- cascade/delete behavior should be reviewed carefully before production hardening

---

# 12. Recommended Use Of This File

Use this file when:
- reviewing the schema before migrations
- planning new domain rules
- explaining the DB to non-Prisma readers
- validating ownership between tables
- deciding where a new field should live

Use the raw schema when:
- implementing migrations
- verifying exact types
- checking indexes
- checking delete behavior
- checking naming and mapping details

Primary raw schema source:
- [prisma/schema.prisma](/Users/ottohull/builderswebapp/builderswebapp/prisma/schema.prisma)
