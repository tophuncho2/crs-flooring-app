# Management Companies Domain — Rules

Brief stub.

- `validateManagementCompanyInput` — structural validation; `name` required and globally unique at the DB level.
- No delete-block rule: the `properties.managementCompanyId` FK is `onDelete: SetNull`, so a mgmt-company delete never fails on child references — children orphan gracefully.
