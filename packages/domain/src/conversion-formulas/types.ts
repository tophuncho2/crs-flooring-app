// Slim option shape for the conversion-formula picker (product form + row
// editors). The formula's own `name` already reads "Sq Ft → Boxes (÷ coverage)",
// so the picker renders it directly. Read-only lookup — no CRUD.
export type ConversionFormulaOption = {
  id: string
  name: string
}
