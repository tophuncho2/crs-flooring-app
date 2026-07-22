export type TemplateServiceItemRow = {
  id: string
  // Required classification — always a ServiceItemType member ("LABOR" |
  // "MISCELLANEOUS"), never "". Typed `string` at the DTO boundary (the grid's
  // generic string setter); membership is guaranteed by validation + the NOT NULL
  // column default.
  itemType: string
  itemName: string
  quantity: string
  // Editable unit FK (UoM epic 2C) — freely editable; sent in the diff. "" when
  // no unit linked. `unitName`/`unitAbbrev` derive from the item's own unit join.
  unitId: string
  unitName: string
  unitAbbrev: string
  // MANUAL persisted bid cost (money string; "" = unset). Unlike planned products
  // — where bid cost is a live `product.cost` read-join — a service item has no
  // product and stores its own bid cost. Sent in the diff. It is the per-unit
  // basis for the line total.
  bidCost: string
  // Whether this line is taxed (feeds the template Tax Cost roll-up). Service /
  // labor lines default to NOT taxed. Sent in the diff.
  taxed: boolean
  // Derived on read, display only — never sent in the diff. Line total (qty ×
  // bidCost, where bidCost is the manual column). "" when blank.
  lineTotal: string
  createdAt: string
  updatedAt: string
  // Actor-email snapshots stamped on item write (createdBy+updatedBy on add,
  // updatedBy on edit). Null on historical rows. DB-only — not surfaced in the table.
  createdBy: string | null
  updatedBy: string | null
}

export type TemplateServiceItemForm = {
  // Required ServiceItemType member (validated); never "".
  itemType: string
  itemName: string
  quantity: string
  // Editable unit FK (UoM epic 2C). "" disconnects the unit.
  unitId: string
  // Job-costing money column (persisted). "" = unset (stored NULL). bidCost is
  // manual entry on a service item.
  bidCost: string
  // Whether this line is taxed. Service / labor lines default to NOT taxed.
  taxed: boolean
}
