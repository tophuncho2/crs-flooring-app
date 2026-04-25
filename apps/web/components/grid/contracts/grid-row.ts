// Minimal shape every row supplied to the Grid must satisfy. Consumers extend
// with their own row data; the grid only reads `id` + `tone` + `status`.

export type GridRowTone = "default" | "muted" | "success" | "warning" | "error"

export type GridRow = {
  id: string
  tone?: GridRowTone
  /**
   * Optional status string the consumer can wire into a status column or row
   * indicator. The grid does nothing with it directly.
   */
  status?: string
}
